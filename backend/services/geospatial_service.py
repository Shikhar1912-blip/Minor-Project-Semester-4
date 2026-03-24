"""
Geospatial Service for Terra-Form
Week 9: Convert flood detection masks → GeoJSON for 3D map overlay

Takes binary water masks + bounding box coordinates and produces
GeoJSON FeatureCollections with risk-level properties per polygon.
"""

import cv2
import json
import numpy as np
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GeospatialService:
    """
    Converts raster flood masks into vector GeoJSON polygons
    suitable for Mapbox GL JS overlay rendering.
    """

    def __init__(self):
        self.flood_results_dir = Path(__file__).parent.parent / "data" / "flood_results"
        self.predictions_dir = Path(__file__).parent.parent / "data" / "predictions"
        self.geojson_dir = Path(__file__).parent.parent / "data" / "geojson"
        self.geojson_dir.mkdir(parents=True, exist_ok=True)

    # ─────────────────────────────────────────────
    #  Pixel → geographic coordinate math
    # ─────────────────────────────────────────────

    def _pixel_to_lnglat(
        self,
        x: int, y: int,
        img_w: int, img_h: int,
        bbox: Tuple[float, float, float, float],
    ) -> Tuple[float, float]:
        """
        Convert pixel (x, y) to (longitude, latitude).

        bbox = (min_lon, min_lat, max_lon, max_lat)
        """
        min_lon, min_lat, max_lon, max_lat = bbox
        lng = min_lon + (x / img_w) * (max_lon - min_lon)
        lat = max_lat - (y / img_h) * (max_lat - min_lat)  # y-axis inverted
        return (round(lng, 6), round(lat, 6))

    def _contour_to_coords(
        self,
        contour: np.ndarray,
        img_w: int, img_h: int,
        bbox: Tuple[float, float, float, float],
    ) -> List[List[float]]:
        """Convert an OpenCV contour to a list of [lng, lat] coordinate pairs."""
        coords = []
        # Simplify the contour to reduce point count
        epsilon = 0.002 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)

        for point in approx:
            px, py = point[0]
            lng, lat = self._pixel_to_lnglat(px, py, img_w, img_h, bbox)
            coords.append([lng, lat])

        # Close the polygon (GeoJSON spec)
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])

        return coords

    # ─────────────────────────────────────────────
    #  Core: mask → GeoJSON
    # ─────────────────────────────────────────────

    def mask_to_geojson(
        self,
        mask_path: str,
        bbox: Tuple[float, float, float, float],
        min_area_px: int = 100,
        risk_label: str = "Moderate",
        risk_color: str = "#eab308",
    ) -> Dict:
        """
        Convert a binary flood mask image into a GeoJSON FeatureCollection.

        Args:
            mask_path:    Path to the water mask image (white=water, black=land)
            bbox:         (min_lon, min_lat, max_lon, max_lat) geographic bounds
            min_area_px:  Ignore contours smaller than this (noise filter)
            risk_label:   Risk label to attach as a property
            risk_color:   Hex color string for rendering

        Returns:
            GeoJSON FeatureCollection dict
        """
        # Load mask as grayscale
        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None:
            raise FileNotFoundError(f"Could not load mask: {mask_path}")

        # Threshold to binary
        _, binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

        # Clean up with morphology
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        img_h, img_w = binary.shape
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        features = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area_px:
                continue

            coords = self._contour_to_coords(contour, img_w, img_h, bbox)
            if len(coords) < 4:  # Need at least a triangle + closing point
                continue

            # Calculate water percentage for this polygon
            poly_mask = np.zeros_like(binary)
            cv2.drawContours(poly_mask, [contour], -1, 255, -1)
            poly_area_pct = round((area / (img_w * img_h)) * 100, 2)

            feature = {
                "type": "Feature",
                "properties": {
                    "area_px": int(area),
                    "area_pct": poly_area_pct,
                    "risk_label": risk_label,
                    "risk_color": risk_color,
                    "fill_opacity": min(0.6, 0.2 + poly_area_pct / 50),
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords],
                },
            }
            features.append(feature)

        logger.info(f"🗺️  Generated {len(features)} polygons from {mask_path}")

        return {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "total_polygons": len(features),
                "bbox": list(bbox),
                "source_mask": str(mask_path),
            },
        }

    # ─────────────────────────────────────────────
    #  Convenience: auto-detect mask files
    # ─────────────────────────────────────────────

    def get_available_layers(self) -> List[Dict]:
        """
        Scan flood_results and predictions directories for mask images
        that can be converted to GeoJSON overlays.
        """
        layers = []

        # Scan flood results for water masks
        for f in sorted(self.flood_results_dir.glob("*_water_mask.png")):
            layers.append({
                "filename": f.name,
                "source": "ndwi",
                "type": "water_mask",
                "path": str(f),
            })

        # Scan predictions for binary masks
        for f in sorted(self.predictions_dir.glob("*_binary.png")):
            layers.append({
                "filename": f.name,
                "source": "unet",
                "type": "prediction_mask",
                "path": str(f),
            })

        return layers

    def generate_and_save(
        self,
        mask_filename: str,
        bbox: Tuple[float, float, float, float],
        risk_label: str = "Moderate",
        risk_color: str = "#eab308",
    ) -> Dict:
        """
        Generate GeoJSON from a named mask file and save it.
        Searches both flood_results and predictions directories.
        """
        mask_path = None
        for d in [self.flood_results_dir, self.predictions_dir]:
            candidate = d / mask_filename
            if candidate.exists():
                mask_path = str(candidate)
                break

        if mask_path is None:
            raise FileNotFoundError(f"Mask file not found: {mask_filename}")

        geojson = self.mask_to_geojson(
            mask_path=mask_path,
            bbox=bbox,
            risk_label=risk_label,
            risk_color=risk_color,
        )

        # Save to geojson directory
        out_name = mask_filename.replace(".png", ".geojson")
        out_path = self.geojson_dir / out_name
        out_path.write_text(json.dumps(geojson, indent=2), encoding="utf-8")
        logger.info(f"💾  Saved GeoJSON → {out_path}")

        return geojson
