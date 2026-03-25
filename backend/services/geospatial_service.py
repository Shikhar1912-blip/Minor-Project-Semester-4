"""
Geospatial Service for Terra-Form
Week 9: Convert flood detection masks → GeoJSON for 3D map overlay

SMART AUTO-OVERLAY: Automatically detects mask files + extracts
bounding box from image filenames (sentinel_LAT_LON_TIMESTAMP).
No manual coordinate input required.
"""

import cv2
import json
import re
import numpy as np
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default bbox size used by sentinel_service (0.1 degrees ≈ 11km)
DEFAULT_BBOX_SIZE = 0.1

# City coordinate lookup — matches city names found in filenames
CITY_COORDS = {
    "mumbai":    (19.0760,  72.8777),
    "delhi":     (28.7041,  77.1025),
    "chennai":   (13.0827,  80.2707),
    "kolkata":   (22.5726,  88.3639),
    "bangalore": (12.9716,  77.5946),
    "hyderabad": (17.3850,  78.4867),
    "ahmedabad": (23.0225,  72.5714),
    "pune":      (18.5204,  73.8567),
    "jaipur":    (26.9124,  75.7873),
    "lucknow":   (26.8467,  80.9462),
    "new_york":  (40.7128, -74.0060),
    "london":    (51.5074,  -0.1276),
    "tokyo":     (35.6895, 139.6917),
    "sydney":    (-33.8688, 151.2093),
}


class GeospatialService:
    """
    Converts raster flood masks into vector GeoJSON polygons
    suitable for Mapbox GL JS overlay rendering.
    Smart enough to auto-detect coordinates from filenames.
    """

    def __init__(self):
        self.sat_dir = Path(__file__).parent.parent / "data" / "satellite_images"
        self.flood_results_dir = Path(__file__).parent.parent / "data" / "flood_results"
        self.predictions_dir = Path(__file__).parent.parent / "data" / "predictions"
        self.geojson_dir = Path(__file__).parent.parent / "data" / "geojson"
        self.geojson_dir.mkdir(parents=True, exist_ok=True)

    # ─────────────────────────────────────────────
    #  Smart coordinate extraction from filenames
    # ─────────────────────────────────────────────

    def _extract_bbox_from_filename(self, filename: str) -> Optional[Tuple[float, float, float, float]]:
        """
        Auto-extract bounding box from mask filenames.

        Supports TWO naming conventions:
          1) sentinel_LAT_LON_TIMESTAMP.png  (e.g. sentinel_19.076_72.8777_20260318.png)
          2) CITYNAME_water_mask.png          (e.g. mumbai_water_mask.png)
        """
        # Strategy 1: sentinel filename with embedded coordinates
        pattern = r'sentinel_(-?\d+\.?\d*)_(-?\d+\.?\d*)'
        match = re.search(pattern, filename)
        if match:
            lat = float(match.group(1))
            lon = float(match.group(2))
            half = DEFAULT_BBOX_SIZE / 2
            bbox = (lon - half, lat - half, lon + half, lat + half)
            logger.info(f"📍 Auto-detected bbox from coords: lat={lat}, lon={lon}")
            return bbox

        # Strategy 2: city name lookup
        fname_lower = filename.lower()
        for city_name, (lat, lon) in CITY_COORDS.items():
            if city_name in fname_lower:
                half = DEFAULT_BBOX_SIZE / 2
                bbox = (lon - half, lat - half, lon + half, lat + half)
                logger.info(f"📍 Auto-detected bbox from city '{city_name}': lat={lat}, lon={lon}")
                return bbox

        return None

    def _pixel_to_lnglat(
        self, x: int, y: int,
        img_w: int, img_h: int,
        bbox: Tuple[float, float, float, float],
    ) -> Tuple[float, float]:
        """Convert pixel (x, y) to (longitude, latitude)."""
        min_lon, min_lat, max_lon, max_lat = bbox
        lng = min_lon + (x / img_w) * (max_lon - min_lon)
        lat = max_lat - (y / img_h) * (max_lat - min_lat)
        return (round(lng, 6), round(lat, 6))

    def _contour_to_coords(
        self, contour: np.ndarray,
        img_w: int, img_h: int,
        bbox: Tuple[float, float, float, float],
    ) -> List[List[float]]:
        """Convert an OpenCV contour to [lng, lat] pairs."""
        epsilon = 0.002 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        coords = []
        for point in approx:
            px, py = point[0]
            lng, lat = self._pixel_to_lnglat(px, py, img_w, img_h, bbox)
            coords.append([lng, lat])
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        return coords

    # ─────────────────────────────────────────────
    #  Core: mask → GeoJSON
    # ─────────────────────────────────────────────

    def mask_to_geojson(
        self, mask_path: str,
        bbox: Tuple[float, float, float, float],
        min_area_px: int = 100,
    ) -> Dict:
        """Convert a binary flood mask into a GeoJSON FeatureCollection."""
        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None:
            raise FileNotFoundError(f"Could not load mask: {mask_path}")

        _, binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        img_h, img_w = binary.shape
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Calculate total water percentage
        total_water = np.count_nonzero(binary)
        water_pct = round((total_water / (img_w * img_h)) * 100, 2)

        # Risk color based on water percentage
        if water_pct < 5:
            risk_label, risk_color = "Low", "#22c55e"
        elif water_pct < 15:
            risk_label, risk_color = "Moderate", "#eab308"
        elif water_pct < 35:
            risk_label, risk_color = "High", "#f97316"
        else:
            risk_label, risk_color = "Critical", "#ef4444"

        features = []
        zone_id = 0
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area_px:
                continue
            coords = self._contour_to_coords(contour, img_w, img_h, bbox)
            if len(coords) < 4:
                continue

            zone_id += 1
            poly_area_pct = round((area / (img_w * img_h)) * 100, 2)

            # ── Exact centroid coordinates ──
            M = cv2.moments(contour)
            if M["m00"] > 0:
                cx_px = int(M["m10"] / M["m00"])
                cy_px = int(M["m01"] / M["m00"])
            else:
                cx_px = int(np.mean(contour[:, 0, 0]))
                cy_px = int(np.mean(contour[:, 0, 1]))
            centroid_lng, centroid_lat = self._pixel_to_lnglat(cx_px, cy_px, img_w, img_h, bbox)

            # ── Per-polygon bounding box ──
            x, y, w, h = cv2.boundingRect(contour)
            sw_lng, sw_lat = self._pixel_to_lnglat(x, y + h, img_w, img_h, bbox)
            ne_lng, ne_lat = self._pixel_to_lnglat(x + w, y, img_w, img_h, bbox)

            # ── Estimate area in km² ──
            # At the equator, 1° ≈ 111km.  Adjust for latitude.
            import math
            lat_center = (bbox[1] + bbox[3]) / 2
            km_per_deg_lon = 111.32 * math.cos(math.radians(lat_center))
            km_per_deg_lat = 110.574
            bbox_w_km = (bbox[2] - bbox[0]) * km_per_deg_lon
            bbox_h_km = (bbox[3] - bbox[1]) * km_per_deg_lat
            pixel_area_km2 = (bbox_w_km * bbox_h_km) / (img_w * img_h)
            zone_area_km2 = round(area * pixel_area_km2, 3)

            features.append({
                "type": "Feature",
                "properties": {
                    "zone_id": zone_id,
                    "area_px": int(area),
                    "area_pct": poly_area_pct,
                    "area_km2": zone_area_km2,
                    "risk_label": risk_label,
                    "risk_color": risk_color,
                    "fill_opacity": min(0.6, 0.2 + poly_area_pct / 50),
                    "centroid": [centroid_lng, centroid_lat],
                    "centroid_lat": centroid_lat,
                    "centroid_lng": centroid_lng,
                    "zone_bbox": [sw_lng, sw_lat, ne_lng, ne_lat],
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords],
                },
            })

        # Sort by area descending (largest flood zones first)
        features.sort(key=lambda f: f["properties"]["area_km2"], reverse=True)
        for i, f in enumerate(features):
            f["properties"]["zone_id"] = i + 1

        logger.info(f"🗺️  Generated {len(features)} zones ({water_pct}% water)")

        return {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "total_polygons": len(features),
                "water_percentage": water_pct,
                "risk_label": risk_label,
                "risk_color": risk_color,
                "bbox": list(bbox),
                "center": [
                    round((bbox[0] + bbox[2]) / 2, 6),
                    round((bbox[1] + bbox[3]) / 2, 6),
                ],
            },
        }

    # ─────────────────────────────────────────────
    #  Smart: auto-discover and convert all masks
    # ─────────────────────────────────────────────

    def get_available_layers(self) -> List[Dict]:
        """Scan for mask files and auto-detect their bounding boxes."""
        layers = []

        for f in sorted(self.flood_results_dir.glob("*_water_mask.png")):
            bbox = self._extract_bbox_from_filename(f.name)
            layers.append({
                "filename": f.name,
                "source": "ndwi",
                "type": "water_mask",
                "has_bbox": bbox is not None,
                "bbox": list(bbox) if bbox else None,
            })

        for f in sorted(self.predictions_dir.glob("*_water_mask.png")):
            bbox = self._extract_bbox_from_filename(f.name)
            layers.append({
                "filename": f.name,
                "source": "unet",
                "type": "prediction_mask",
                "has_bbox": bbox is not None,
                "bbox": list(bbox) if bbox else None,
            })

        return layers

    def auto_generate_overlay(self, mask_filename: str) -> Optional[Dict]:
        """
        SMART: Automatically find a mask file, extract bbox from its
        filename, generate GeoJSON, and save it. Zero manual input.
        """
        # Find the mask file
        mask_path = None
        for d in [self.flood_results_dir, self.predictions_dir]:
            candidate = d / mask_filename
            if candidate.exists():
                mask_path = str(candidate)
                break

        if mask_path is None:
            raise FileNotFoundError(f"Mask not found: {mask_filename}")

        # Auto-extract bbox from filename
        bbox = self._extract_bbox_from_filename(mask_filename)
        if bbox is None:
            raise ValueError(
                f"Cannot auto-detect coordinates from filename: {mask_filename}. "
                "Expected format: sentinel_LAT_LON_TIMESTAMP"
            )

        geojson = self.mask_to_geojson(mask_path=mask_path, bbox=bbox)

        # Cache to disk
        out_name = mask_filename.replace(".png", ".geojson")
        out_path = self.geojson_dir / out_name
        out_path.write_text(json.dumps(geojson, indent=2), encoding="utf-8")
        logger.info(f"💾 Saved GeoJSON → {out_path}")

        return geojson

    def auto_generate_all(self) -> List[Dict]:
        """
        Scan ALL mask files, auto-generate GeoJSON for each, return summaries.
        This runs once and caches everything — map loads instantly afterwards.
        """
        layers = self.get_available_layers()
        results = []

        for layer in layers:
            if not layer["has_bbox"]:
                continue
            try:
                geojson = self.auto_generate_overlay(layer["filename"])
                results.append({
                    "filename": layer["filename"],
                    "source": layer["source"],
                    "status": "ok",
                    "polygons": geojson["properties"]["total_polygons"],
                    "water_pct": geojson["properties"]["water_percentage"],
                    "risk_label": geojson["properties"]["risk_label"],
                    "center": geojson["properties"]["center"],
                    "bbox": geojson["properties"]["bbox"],
                })
            except Exception as e:
                results.append({
                    "filename": layer["filename"],
                    "source": layer["source"],
                    "status": "error",
                    "error": str(e),
                })

        logger.info(f"✅ Auto-generated {len(results)} overlays")
        return results

    def generate_and_save(
        self, mask_filename: str,
        bbox: Tuple[float, float, float, float],
        risk_label: str = "Moderate",
        risk_color: str = "#eab308",
    ) -> Dict:
        """Manual fallback: generate from explicit bbox coordinates."""
        mask_path = None
        for d in [self.flood_results_dir, self.predictions_dir]:
            candidate = d / mask_filename
            if candidate.exists():
                mask_path = str(candidate)
                break
        if mask_path is None:
            raise FileNotFoundError(f"Mask file not found: {mask_filename}")

        geojson = self.mask_to_geojson(mask_path=mask_path, bbox=bbox)
        out_name = mask_filename.replace(".png", ".geojson")
        out_path = self.geojson_dir / out_name
        out_path.write_text(json.dumps(geojson, indent=2), encoding="utf-8")
        return geojson
