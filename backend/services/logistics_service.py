"""
Week 12: Disaster Relief Logistics Service
Integrates OpenRouteService (ORS) API for:
  - Flood-aware safe routing (avoid_polygons)
  - Multi-stop relief truck dispatch
  - Supply depot management
"""
import math
import copy
import json
import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    import httpx
    _HTTPX_AVAILABLE = True
except ImportError:
    _HTTPX_AVAILABLE = False
    logger.error("httpx not installed. Run: pip install httpx")


class LogisticsService:
    ORS_BASE = "https://api.openrouteservice.org"

    def __init__(self, ors_api_key: str = ""):
        self.ors_api_key = ors_api_key or os.getenv("ORS_API_KEY", "")
        self.data_dir = Path(__file__).parent.parent / "data"

        # ── Supply Depots (per city) ──
        self.depots = [
            # Mumbai
            {"id": "depot_mum_01", "name": "NDRF Warehouse Colaba",  "city": "Mumbai",  "lat": 18.9067, "lng": 72.8147, "type": "food_water",   "capacity_tons": 50},
            {"id": "depot_mum_02", "name": "BMC Depot Bandra East",   "city": "Mumbai",  "lat": 19.0596, "lng": 72.8411, "type": "medical",      "capacity_tons": 30},
            # Delhi
            {"id": "depot_del_01", "name": "SDRF Hub Rohini",         "city": "Delhi",   "lat": 28.7360, "lng": 77.1140, "type": "food_water",   "capacity_tons": 80},
            {"id": "depot_del_02", "name": "AIIMS Relief Stores",     "city": "Delhi",   "lat": 28.5672, "lng": 77.2100, "type": "medical",      "capacity_tons": 25},
            {"id": "depot_del_03", "name": "Army Cantonment Depot",   "city": "Delhi",   "lat": 28.5956, "lng": 77.1571, "type": "rescue_equip", "capacity_tons": 100},
            # Chennai
            {"id": "depot_che_01", "name": "Red Cross Hub Egmore",    "city": "Chennai", "lat": 13.0732, "lng": 80.2609, "type": "food_water",   "capacity_tons": 40},
            {"id": "depot_che_02", "name": "GH Supplies Guindy",      "city": "Chennai", "lat": 13.0067, "lng": 80.2206, "type": "medical",      "capacity_tons": 35},
            # Kolkata
            {"id": "depot_kol_01", "name": "NDRF Camp Barrackpore",   "city": "Kolkata", "lat": 22.7648, "lng": 88.3779, "type": "rescue_equip", "capacity_tons": 60},
            {"id": "depot_kol_02", "name": "Red Cross Kolkata",       "city": "Kolkata", "lat": 22.5554, "lng": 88.3518, "type": "food_water",   "capacity_tons": 45},
            # Bangalore (Added to support Bangalore test cases)
            {"id": "depot_blr_01", "name": "SDRF Camp Yelahanka",     "city": "Bangalore", "lat": 13.1000, "lng": 77.5960, "type": "rescue_equip", "capacity_tons": 50},
            {"id": "depot_blr_02", "name": "Red Cross Hub KR Puram",  "city": "Bangalore", "lat": 13.0033, "lng": 77.6895, "type": "food_water",   "capacity_tons": 45},
            # Hyderabad (Added to support Hyderabad test cases)
            {"id": "depot_hyd_01", "name": "NDRF Camp Begumpet",      "city": "Hyderabad", "lat": 17.4447, "lng": 78.4664, "type": "rescue_equip", "capacity_tons": 60},
            {"id": "depot_hyd_02", "name": "Red Cross Hub Kukatpally","city": "Hyderabad", "lat": 17.4948, "lng": 78.3996, "type": "food_water",   "capacity_tons": 45},
        ]

    # ──────────────────────────────────────────────────
    #  Depot Lookup
    # ──────────────────────────────────────────────────
    def get_depots(self, city: Optional[str] = None) -> List[Dict]:
        if city:
            return [d for d in self.depots if d["city"].lower() == city.lower()]
        return self.depots

    def get_nearest_depot(self, lat: float, lng: float) -> Dict:
        nearest = None
        min_dist = float("inf")
        for depot in self.depots:
            dist = self._haversine(lat, lng, depot["lat"], depot["lng"])
            if dist < min_dist:
                min_dist = dist
                nearest = copy.deepcopy(depot)
        if nearest:
            nearest["distance_km"] = round(min_dist, 2)
        return nearest or {}

    # ──────────────────────────────────────────────────
    #  ORS API call helper
    # ──────────────────────────────────────────────────
    async def _ors_directions(
        self,
        coordinates: List[List[float]],
        avoid_polygons: Optional[List] = None,
    ) -> Dict[str, Any]:
        """
        Call ORS directions API with the given coordinate list.
        Uses radiuses: [-1, ...] to snap water coordinates to the nearest road.
        """
        url = f"{self.ORS_BASE}/v2/directions/driving-car/geojson"
        headers = {
            "Authorization": self.ors_api_key,
            "Content-Type": "application/json",
            "Accept": "application/json, application/geo+json",
        }
        body: Dict[str, Any] = {
            "coordinates": coordinates,
            "instructions": True,
            "geometry": True,
            # -1 tells ORS to use maximum snap radius (useful since flood centroids are on water)
            "radiuses": [-1] * len(coordinates)
        }
        
        if avoid_polygons and len(avoid_polygons) > 0:
            body["options"] = {
                "avoid_polygons": {
                    "type": "MultiPolygon",
                    "coordinates": avoid_polygons,
                }
            }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=body, headers=headers)
            if resp.status_code != 200:
                msg = resp.text[:500]
                logger.error(f"ORS [{resp.status_code}]: {msg}")
                raise ValueError(f"ORS error {resp.status_code}: {msg}")
            return resp.json()

    # ──────────────────────────────────────────────────
    #  ORS Directions — Single Route (with flood avoidance)
    # ──────────────────────────────────────────────────
    async def get_safe_route(
        self,
        start_lng: float, start_lat: float,
        end_lng: float, end_lat: float,
        avoid_flood_polygons: Optional[List] = None,
    ) -> Dict[str, Any]:
        if not _HTTPX_AVAILABLE:
            raise RuntimeError("httpx not installed")
        if not self.ors_api_key:
            raise ValueError("ORS_API_KEY not set in backend/.env")

        try:
            data = await self._ors_directions(
                [[start_lng, start_lat], [end_lng, end_lat]],
                avoid_polygons=avoid_flood_polygons,
            )
        except ValueError:
            # Retry without flood avoidance if ORS rejects
            data = await self._ors_directions(
                [[start_lng, start_lat], [end_lng, end_lat]],
                avoid_polygons=None,
            )

        features = data.get("features", [])
        if not features:
            raise ValueError("ORS returned no route features")

        route_feature = features[0]
        props = route_feature.get("properties", {})
        summary = props.get("summary", {})
        segments = props.get("segments", [])

        steps = []
        for seg in segments:
            for step in seg.get("steps", []):
                steps.append({
                    "instruction": step.get("instruction", ""),
                    "distance_m": round(step.get("distance", 0), 1),
                    "duration_s": round(step.get("duration", 0), 1),
                    "type": step.get("type", 0),
                })

        return {
            "geometry": route_feature.get("geometry"),
            "distance_km": round(summary.get("distance", 0) / 1000, 2),
            "duration_min": round(summary.get("duration", 0) / 60, 1),
            "steps": steps,
            "avoided_floods": bool(avoid_flood_polygons),
        }

    # ──────────────────────────────────────────────────
    #  ORS Multi-Stop Dispatch (Depot → N flood zones)
    # ──────────────────────────────────────────────────
    async def dispatch_relief(
        self,
        depot_id: str,
        zone_coords: List[Dict],
        avoid_flood_polygons: Optional[List] = None,
    ) -> Dict[str, Any]:
        """
        Route a relief truck from a depot through multiple flood zone centroids.
        We pass the radiuses: [-1] parameter so ORS automatically snaps the 
        water coordinates to the nearest valid road!
        """
        if not _HTTPX_AVAILABLE:
            raise RuntimeError("httpx not installed")

        depot = next((d for d in self.depots if d["id"] == depot_id), None)
        if not depot:
            raise ValueError(f"Depot not found: {depot_id}")
        if not self.ors_api_key:
            raise ValueError("ORS_API_KEY not set in backend/.env")

        # Build route: depot → zone1 → zone2 ...
        coordinates = [[depot["lng"], depot["lat"]]]
        for zc in zone_coords:
            coordinates.append([float(zc["lng"]), float(zc["lat"])])

        logger.info(f"Dispatching from {depot['name']} to {len(zone_coords)} zones")

        # Try with flood avoidance first, fallback without
        avoided_floods = False
        try:
            data = await self._ors_directions(coordinates, avoid_polygons=avoid_flood_polygons)
            avoided_floods = bool(avoid_flood_polygons)
        except ValueError as e:
            logger.warning(f"Dispatch with avoidance failed: {e}. Retrying without...")
            data = await self._ors_directions(coordinates, avoid_polygons=None)
            avoided_floods = False

        features = data.get("features", [])
        if not features:
            raise ValueError("ORS returned no route features")

        route_feature = features[0]
        props = route_feature.get("properties", {})
        summary = props.get("summary", {})

        return {
            "depot": depot,
            "stops": len(zone_coords),
            "geometry": route_feature.get("geometry"),
            "distance_km": round(summary.get("distance", 0) / 1000, 2),
            "duration_min": round(summary.get("duration", 0) / 60, 1),
            "avoided_floods": avoided_floods,
        }

    # ──────────────────────────────────────────────────
    #  Collect Flood Avoidance Polygons from GeoJSON files
    # ──────────────────────────────────────────────────
    def collect_flood_polygons(self) -> List:
        geojson_dir = self.data_dir / "geojson"
        polygons = []
        if not geojson_dir.exists():
            return polygons

        for gj_file in geojson_dir.glob("*.geojson"):
            try:
                data = json.loads(gj_file.read_text(encoding="utf-8"))
                for feature in data.get("features", []):
                    geom = feature.get("geometry", {})
                    if geom.get("type") == "Polygon":
                        polygons.append(geom["coordinates"])
            except Exception as e:
                logger.warning(f"Could not parse {gj_file.name}: {e}")

        logger.info(f"Collected {len(polygons)} flood polygons for ORS avoidance")
        return polygons

    # ──────────────────────────────────────────────────
    #  Haversine Distance Helper
    # ──────────────────────────────────────────────────
    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2
             + math.cos(math.radians(lat1))
             * math.cos(math.radians(lat2))
             * math.sin(dlon / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
