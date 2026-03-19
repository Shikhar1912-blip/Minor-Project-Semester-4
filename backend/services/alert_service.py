"""
Alert Service for Terra-Form
Weeks 6-8: Automated Risk Classification & Alert Management

Risk Levels:
  Low      → water coverage < 5%
  Moderate → 5% - 15%
  High     → 15% - 35%
  Critical → > 35%
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
#  Risk tier definitions
# ─────────────────────────────────────────────

RISK_LEVELS = [
    {
        "level": 0,
        "label": "Low",
        "color": "green",
        "hex": "#22c55e",
        "badge": "badge-green",
        "threshold_max": 5.0,
        "description": "Minimal water presence. Normal conditions.",
        "recommended_action": "No action required. Continue routine monitoring.",
    },
    {
        "level": 1,
        "label": "Moderate",
        "color": "yellow",
        "hex": "#eab308",
        "badge": "badge-yellow",
        "threshold_max": 15.0,
        "description": "Elevated water levels detected. Possible minor flooding.",
        "recommended_action": "Monitor situation closely. Alert local authorities.",
    },
    {
        "level": 2,
        "label": "High",
        "color": "orange",
        "hex": "#f97316",
        "badge": "badge-orange",
        "threshold_max": 35.0,
        "description": "Significant flooding detected. Population may be at risk.",
        "recommended_action": "Activate emergency protocols. Begin evacuation planning.",
    },
    {
        "level": 3,
        "label": "Critical",
        "color": "red",
        "hex": "#ef4444",
        "badge": "badge-red",
        "threshold_max": 100.0,
        "description": "Severe flooding. Immediate danger to life and property.",
        "recommended_action": "IMMEDIATE evacuation. Deploy emergency services NOW.",
    },
]


class AlertService:
    """
    Manages flood risk classification and alert history.
    Alerts are persisted as JSON in backend/data/alerts/alerts.json.
    """

    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            data_dir = Path(__file__).parent.parent / "data" / "alerts"
        self.alerts_dir = data_dir
        self.alerts_dir.mkdir(parents=True, exist_ok=True)
        self.alerts_file = self.alerts_dir / "alerts.json"
        self._ensure_file()

    # ──────────────────────────────────────────
    #  Internal helpers
    # ──────────────────────────────────────────

    def _ensure_file(self):
        """Create the JSON file if it doesn't exist."""
        if not self.alerts_file.exists():
            self.alerts_file.write_text(json.dumps([], indent=2))

    def _read_alerts(self) -> List[Dict]:
        try:
            return json.loads(self.alerts_file.read_text(encoding="utf-8"))
        except Exception:
            return []

    def _write_alerts(self, alerts: List[Dict]):
        self.alerts_file.write_text(json.dumps(alerts, indent=2, default=str), encoding="utf-8")

    # ──────────────────────────────────────────
    #  Public API
    # ──────────────────────────────────────────

    def classify_risk(self, water_percentage: float) -> Dict:
        """
        Classify risk level based on water coverage percentage.

        Args:
            water_percentage: Percentage of pixels classified as water (0–100)

        Returns:
            Dict with level, label, color, hex, badge, description, recommended_action
        """
        wp = float(water_percentage)
        for tier in RISK_LEVELS:
            if wp < tier["threshold_max"]:
                return {**tier, "water_percentage": round(wp, 2)}
        # Fallback to Critical
        return {**RISK_LEVELS[-1], "water_percentage": round(wp, 2)}

    def create_alert(
        self,
        image_filename: str,
        water_percentage: float,
        analysis_type: str = "ndwi",        # "ndwi" | "unet"
        location: Optional[str] = None,
        water_area_km2: Optional[float] = None,
        extra: Optional[Dict] = None,
    ) -> Dict:
        """
        Create and persist a new alert.

        Only stores alerts for Moderate risk and above (level >= 1).
        Returns the alert dict (whether stored or not).

        Args:
            image_filename: Source satellite image filename
            water_percentage: Percentage of water pixels
            analysis_type: "ndwi" or "unet"
            location: Optional city name or coordinates string
            water_area_km2: Optional detected water area in km²
            extra: Optional additional metadata

        Returns:
            Alert dict with risk classification and metadata
        """
        risk = self.classify_risk(water_percentage)

        alert = {
            "id": datetime.now().strftime("%Y%m%d%H%M%S%f"),
            "timestamp": datetime.now().isoformat(),
            "image_filename": image_filename,
            "location": location or "Unknown",
            "analysis_type": analysis_type.upper(),
            "water_percentage": round(water_percentage, 2),
            "water_area_km2": round(water_area_km2, 4) if water_area_km2 is not None else None,
            "risk_level": risk["level"],
            "risk_label": risk["label"],
            "risk_color": risk["color"],
            "risk_hex": risk["hex"],
            "description": risk["description"],
            "recommended_action": risk["recommended_action"],
            **(extra or {}),
        }

        # Only persist Moderate and above
        if risk["level"] >= 1:
            alerts = self._read_alerts()
            alerts.insert(0, alert)  # newest first
            self._write_alerts(alerts)
            logger.info(
                f"⚠️  Alert created: {risk['label']} risk | "
                f"{water_percentage:.1f}% water | {image_filename}"
            )
        else:
            logger.info(f"✅ Low risk ({water_percentage:.1f}%) — no alert stored.")

        return alert

    def get_alerts(
        self,
        limit: int = 50,
        min_level: int = 0,
    ) -> List[Dict]:
        """
        Retrieve stored alerts.

        Args:
            limit: Maximum number of alerts to return
            min_level: Minimum risk level (0=Low, 1=Moderate, 2=High, 3=Critical)

        Returns:
            List of alert dicts sorted newest first
        """
        alerts = self._read_alerts()
        filtered = [a for a in alerts if a.get("risk_level", 0) >= min_level]
        return filtered[:limit]

    def get_risk_summary(self) -> Dict:
        """
        Return summary statistics across all stored alerts.

        Returns:
            Dict with counts by risk level, total, most recent, and last critical event
        """
        alerts = self._read_alerts()

        counts = {"Low": 0, "Moderate": 0, "High": 0, "Critical": 0}
        last_critical = None

        for a in alerts:
            label = a.get("risk_label", "Low")
            if label in counts:
                counts[label] += 1
            if label == "Critical" and last_critical is None:
                last_critical = a

        return {
            "total_alerts": len(alerts),
            "counts": counts,
            "most_recent": alerts[0] if alerts else None,
            "last_critical": last_critical,
            "risk_levels": [
                {
                    "label": t["label"],
                    "level": t["level"],
                    "color": t["color"],
                    "hex": t["hex"],
                    "threshold_max": t["threshold_max"],
                    "description": t["description"],
                }
                for t in RISK_LEVELS
            ],
        }

    def clear_alerts(self) -> Dict:
        """Delete all stored alerts."""
        count = len(self._read_alerts())
        self._write_alerts([])
        logger.info(f"🗑️  Cleared {count} alerts.")
        return {"deleted": count}
