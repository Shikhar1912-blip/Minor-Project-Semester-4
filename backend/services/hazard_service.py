"""
Hazard Service for Terra-Form
Week 10: Multi-Hazard Composite Risk Scoring

Combines multiple risk factors into a single 0-100 score:
  - Flood risk      (from NDWI / U-Net water percentage)
  - Elevation risk   (simulated from image brightness proxy)
  - Proximity risk   (distance transform on water mask)
  - Population factor (configurable weight per city)
"""

import cv2
import json
import numpy as np
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from scipy import ndimage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default population density weights per city (relative, 0-1 scale)
POPULATION_WEIGHTS = {
    "Mumbai": 0.95,
    "Delhi": 0.90,
    "Chennai": 0.75,
    "Kolkata": 0.80,
    "Bangalore": 0.70,
    "Hyderabad": 0.65,
    "Ahmedabad": 0.60,
    "Pune": 0.55,
    "Jaipur": 0.50,
    "Lucknow": 0.50,
    "New York": 0.85,
    "London": 0.75,
    "Tokyo": 0.90,
    "Sydney": 0.60,
}


class HazardService:
    """
    Calculates multi-hazard composite risk scores by combining
    flood analysis results with elevation, proximity, and population factors.
    """

    def __init__(self):
        self.flood_results_dir = Path(__file__).parent.parent / "data" / "flood_results"
        self.predictions_dir = Path(__file__).parent.parent / "data" / "predictions"
        self.history_dir = Path(__file__).parent.parent / "data" / "hazard_history"
        self.history_dir.mkdir(parents=True, exist_ok=True)
        self.history_file = self.history_dir / "scores.json"
        self._ensure_file()

    def _ensure_file(self):
        if not self.history_file.exists():
            self.history_file.write_text(json.dumps([], indent=2))

    def _read_history(self) -> List[Dict]:
        try:
            return json.loads(self.history_file.read_text(encoding="utf-8"))
        except Exception:
            return []

    def _write_history(self, records: List[Dict]):
        self.history_file.write_text(json.dumps(records, indent=2, default=str), encoding="utf-8")

    # ──────────────────────────────────────────
    #  Individual risk factor calculations
    # ──────────────────────────────────────────

    def _flood_risk(self, water_percentage: float) -> float:
        """
        Flood risk score (0-100) from water coverage percentage.
        Uses a logarithmic curve to amplify small increases.
        """
        # Clamp to 0-100
        wp = max(0, min(100, water_percentage))
        # Logarithmic scaling: small floods still register high
        if wp < 1:
            return wp * 5  # 0-5 for <1%
        return min(100, 20 * np.log10(wp + 1) + 10)

    def _elevation_risk(self, mask_path: Optional[str] = None) -> float:
        """
        Elevation risk score (0-100).
        Uses image brightness as a proxy for low-lying areas:
        darker satellite images often contain more water/shadow = low terrain.
        If no mask is available, returns a default moderate score.
        """
        if mask_path is None or not Path(mask_path).exists():
            return 45.0  # default moderate

        img = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 45.0

        # Low average brightness → likely low terrain → higher risk
        mean_brightness = float(np.mean(img))
        # Invert: darker = higher risk
        risk = max(0, min(100, 100 - (mean_brightness / 255) * 100))
        return round(risk, 1)

    def _proximity_risk(self, mask_path: Optional[str] = None) -> float:
        """
        Proximity risk score (0-100).
        Measures how spread out water is using the distance transform.
        Large contiguous water bodies = higher proximity risk.
        """
        if mask_path is None or not Path(mask_path).exists():
            return 30.0

        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None:
            return 30.0

        _, binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
        water_pixels = np.count_nonzero(binary)

        if water_pixels == 0:
            return 0.0

        # Distance transform on inverted mask (land)
        inverted = cv2.bitwise_not(binary)
        dist = ndimage.distance_transform_edt(inverted)

        # Mean distance from any land pixel to nearest water
        mean_dist = float(np.mean(dist))
        # Lower mean distance = water is everywhere = higher risk
        max_dist = max(1, np.max(dist))
        risk = max(0, min(100, (1 - mean_dist / max_dist) * 100))

        return round(risk, 1)

    def _population_factor(self, location: Optional[str] = None) -> float:
        """
        Population density factor (0-100).
        Higher population = more people at risk = higher score.
        """
        if location and location in POPULATION_WEIGHTS:
            return POPULATION_WEIGHTS[location] * 100
        return 50.0  # default moderate

    # ──────────────────────────────────────────
    #  Composite score
    # ──────────────────────────────────────────

    def calculate_score(
        self,
        water_percentage: float,
        mask_filename: Optional[str] = None,
        location: Optional[str] = None,
        weights: Optional[Dict[str, float]] = None,
    ) -> Dict:
        """
        Calculate a composite multi-hazard risk score (0-100).

        Args:
            water_percentage: Detected water coverage percentage
            mask_filename:    Optional water mask file for spatial analysis
            location:         Optional city name for population weighting
            weights:          Optional custom weights dict
                             {"flood": 0.4, "elevation": 0.2, "proximity": 0.2, "population": 0.2}

        Returns:
            Dict with composite score, breakdown, and metadata
        """
        # Default weights
        w = weights or {
            "flood": 0.40,
            "elevation": 0.20,
            "proximity": 0.20,
            "population": 0.20,
        }

        # Find mask file path
        mask_path = None
        if mask_filename:
            for d in [self.flood_results_dir, self.predictions_dir]:
                candidate = d / mask_filename
                if candidate.exists():
                    mask_path = str(candidate)
                    break

        # Calculate individual factors
        flood = self._flood_risk(water_percentage)
        elevation = self._elevation_risk(mask_path)
        proximity = self._proximity_risk(mask_path)
        population = self._population_factor(location)

        # Weighted sum
        composite = (
            w["flood"] * flood
            + w["elevation"] * elevation
            + w["proximity"] * proximity
            + w["population"] * population
        )
        composite = round(max(0, min(100, composite)), 1)

        # Determine severity label
        if composite < 25:
            severity = "Low"
            severity_color = "#22c55e"
        elif composite < 50:
            severity = "Moderate"
            severity_color = "#eab308"
        elif composite < 75:
            severity = "High"
            severity_color = "#f97316"
        else:
            severity = "Critical"
            severity_color = "#ef4444"

        result = {
            "composite_score": composite,
            "severity": severity,
            "severity_color": severity_color,
            "breakdown": {
                "flood": {"score": round(flood, 1), "weight": w["flood"]},
                "elevation": {"score": round(elevation, 1), "weight": w["elevation"]},
                "proximity": {"score": round(proximity, 1), "weight": w["proximity"]},
                "population": {"score": round(population, 1), "weight": w["population"]},
            },
            "metadata": {
                "water_percentage": water_percentage,
                "mask_filename": mask_filename,
                "location": location or "Unknown",
                "timestamp": datetime.now().isoformat(),
            },
        }

        # Persist to history
        history = self._read_history()
        history.insert(0, result)
        self._write_history(history)

        logger.info(
            f"🔥 Hazard Score: {composite} ({severity}) | "
            f"Flood={flood:.0f} Elev={elevation:.0f} Prox={proximity:.0f} Pop={population:.0f}"
        )

        return result

    def get_history(self, limit: int = 50) -> List[Dict]:
        """Get recent hazard score history."""
        return self._read_history()[:limit]

    def clear_history(self) -> Dict:
        """Clear all hazard scoring history."""
        count = len(self._read_history())
        self._write_history([])
        return {"deleted": count}
