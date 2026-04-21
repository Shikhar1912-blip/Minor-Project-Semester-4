import math
from typing import Dict, List, Optional
import copy

class EvacuationService:
    def __init__(self):
        # Simulated database of emergency shelters across our monitored cities.
        # In a real system, these would be loaded from a spatial database or GIS server.
        self.shelters = [
            # Mumbai Shelters
            {"id": "mum_01", "name": "Bandra Relief Center", "city": "Mumbai", "lat": 19.0596, "lng": 72.8295, "capacity": 500, "elevation_m": 12},
            {"id": "mum_02", "name": "Powai High-Ground Shelter", "city": "Mumbai", "lat": 19.1176, "lng": 72.9060, "capacity": 800, "elevation_m": 45},
            {"id": "mum_03", "name": "Navi Mumbai Safe Zone", "city": "Mumbai", "lat": 19.0330, "lng": 73.0297, "capacity": 1200, "elevation_m": 22},
            
            # Delhi Shelters
            {"id": "del_01", "name": "Dwarka Sports Complex", "city": "Delhi", "lat": 28.5823, "lng": 77.0500, "capacity": 1000, "elevation_m": 220},
            {"id": "del_02", "name": "North Campus Evacuation Hub", "city": "Delhi", "lat": 28.6921, "lng": 77.2065, "capacity": 600, "elevation_m": 235},
            {"id": "del_03", "name": "Noida Sector 62 Shelter", "city": "Delhi", "lat": 28.6208, "lng": 77.3639, "capacity": 900, "elevation_m": 210},
            
            # Chennai Shelters
            {"id": "che_01", "name": "Anna University Shelter", "city": "Chennai", "lat": 13.0102, "lng": 80.2356, "capacity": 1500, "elevation_m": 15},
            {"id": "che_02", "name": "Tambaram Relief Camp", "city": "Chennai", "lat": 12.9249, "lng": 80.1000, "capacity": 800, "elevation_m": 32},
            
            # Kolkata Shelters
            {"id": "kol_01", "name": "Salt Lake Stadium Core", "city": "Kolkata", "lat": 22.5693, "lng": 88.4011, "capacity": 3000, "elevation_m": 11},
            {"id": "kol_02", "name": "New Town Safe Haven", "city": "Kolkata", "lat": 22.5804, "lng": 88.4552, "capacity": 1200, "elevation_m": 14},

            # General fallbacks (if coordinates are far away)
            {"id": "gen_01", "name": "Global Emergency Fallback", "city": "Any", "lat": 0.0, "lng": 0.0, "capacity": 9999, "elevation_m": 100}
        ]

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate the great circle distance in kilometers between two points on the earth."""
        R = 6371.0  # Radius of earth in kilometers
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def get_nearest_shelter(self, lat: float, lng: float, radius_km: float = 50.0) -> Optional[Dict]:
        """Find the nearest emergency shelter to a given coordinate."""
        nearest = None
        min_dist = float('inf')

        for shelter in self.shelters:
            if shelter["id"] == "gen_01":
                continue  # Skip fallback for the main loop
                
            dist = self._haversine_distance(lat, lng, shelter["lat"], shelter["lng"])
            if dist < min_dist and dist <= radius_km:
                min_dist = dist
                nearest = copy.deepcopy(shelter)

        # If no shelter found within radius, generate a safe "high ground" coordinate relative to the user
        if not nearest:
            # Shift coordinates slightly (approx 5km north-east) to simulate a local high-ground extraction point
            safe_lat = lat + 0.045
            safe_lng = lng + 0.045
            return {
                "id": "auto_sys_01",
                "name": "Designated High Ground (Local Extraction)",
                "city": "Unknown",
                "lat": safe_lat,
                "lng": safe_lng,
                "capacity": "N/A",
                "elevation_m": "Unknown (Estimated Safe)",
                "distance_km": round(self._haversine_distance(lat, lng, safe_lat, safe_lng), 2)
            }

        nearest["distance_km"] = round(min_dist, 2)
        return nearest
