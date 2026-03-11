"""
Model Inference Service for Terra-Form
Week 5: Deep Learning - Run trained U-Net on new satellite images

Usage:
    inferencer = ModelInference(model_path)
    result     = inferencer.predict(rgb_path, nir_path)
"""

import cv2
import logging
import numpy as np
import rasterio
from pathlib import Path
from typing import Dict, Optional

import torch
import torch.nn.functional as F
from PIL import Image

from services.unet_model import UNet

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PATCH_SIZE = 256


class ModelInference:
    """
    Loads a saved U-Net checkpoint and runs inference on full-size
    satellite images using a sliding-window strategy.
    """

    def __init__(self, model_path: Optional[Path] = None):
        self.device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model      = None
        self.model_path = model_path
        self.metadata   = {}

        if model_path and Path(model_path).exists():
            self._load_model(model_path)

    # ──────────────────────────────────────────
    def _load_model(self, model_path: Path):
        """Load model weights from checkpoint."""
        logger.info(f"Loading model from {model_path}")
        checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)

        in_channels  = checkpoint.get("in_channels",  4)
        base_filters = checkpoint.get("base_filters", 32)

        self.model = UNet(in_channels=in_channels, base_filters=base_filters).to(self.device)
        self.model.load_state_dict(checkpoint["model_state"])
        self.model.eval()

        self.metadata = {
            "epoch":          checkpoint.get("epoch", "unknown"),
            "val_iou":        round(checkpoint.get("val_iou", 0), 4),
            "val_f1":         round(checkpoint.get("val_f1",  0), 4),
            "ndwi_threshold": checkpoint.get("ndwi_threshold", 0.3),
            "model_path":     str(model_path),
        }
        logger.info(f"Model loaded — IoU={self.metadata['val_iou']}, F1={self.metadata['val_f1']}")

    # ──────────────────────────────────────────
    def is_ready(self) -> bool:
        return self.model is not None

    # ──────────────────────────────────────────
    def _load_images(self, rgb_path: str, nir_path: str):
        """Load RGB + NIR, resize NIR to match RGB, return numpy arrays."""
        rgb = cv2.imread(rgb_path)
        if rgb is None:
            raise ValueError(f"Cannot load RGB image: {rgb_path}")
        rgb = cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB)   # H×W×3 uint8

        with rasterio.open(nir_path) as src:
            nir = src.read(1)   # H×W float32 (reflectance 0-2)

        if nir.shape != rgb.shape[:2]:
            nir = cv2.resize(nir, (rgb.shape[1], rgb.shape[0]),
                             interpolation=cv2.INTER_LINEAR)
        return rgb, nir

    # ──────────────────────────────────────────
    def _image_to_tensor(self, rgb: np.ndarray, nir: np.ndarray) -> torch.Tensor:
        """Stack R,G,B,NIR → (1,4,H,W) float32 tensor normalised to [0,1]."""
        r = rgb[:, :, 0].astype(np.float32) / 255.0
        g = rgb[:, :, 1].astype(np.float32) / 255.0
        b = rgb[:, :, 2].astype(np.float32) / 255.0
        n = np.clip(nir, 0, 2.0).astype(np.float32) / 2.0
        tensor = torch.from_numpy(np.stack([r, g, b, n])).unsqueeze(0)  # (1,4,H,W)
        return tensor.to(self.device)

    # ──────────────────────────────────────────
    def _sliding_window_predict(self, tensor: torch.Tensor) -> np.ndarray:
        """
        Run the model over the full image using overlapping 256×256 windows.
        Averages predictions in overlapping regions for smoother results.
        """
        _, _, H, W = tensor.shape
        prob_map = np.zeros((H, W), dtype=np.float32)
        count    = np.zeros((H, W), dtype=np.float32)

        step = PATCH_SIZE // 2   # 50% overlap

        ys = list(range(0, H - PATCH_SIZE + 1, step))
        xs = list(range(0, W - PATCH_SIZE + 1, step))

        # Make sure we cover the bottom/right edge
        if ys[-1] + PATCH_SIZE < H:
            ys.append(H - PATCH_SIZE)
        if xs[-1] + PATCH_SIZE < W:
            xs.append(W - PATCH_SIZE)

        with torch.no_grad():
            for y in ys:
                for x in xs:
                    patch = tensor[:, :, y:y+PATCH_SIZE, x:x+PATCH_SIZE]
                    pred  = self.model(patch).squeeze().cpu().numpy()  # (H, W)
                    prob_map[y:y+PATCH_SIZE, x:x+PATCH_SIZE] += pred
                    count[y:y+PATCH_SIZE, x:x+PATCH_SIZE]    += 1.0

        prob_map /= np.maximum(count, 1)
        return prob_map   # [0, 1] float32

    # ──────────────────────────────────────────
    def predict(
        self,
        rgb_path: str,
        nir_path: str,
        threshold: float = 0.5,
        output_dir: Optional[Path] = None,
        output_prefix: str = "prediction",
    ) -> Dict:
        """
        Run flood segmentation on one image pair.

        Returns dict with statistics and paths of saved visualisations.
        """
        if not self.is_ready():
            raise RuntimeError("Model not loaded. Train or supply a checkpoint first.")

        logger.info(f"Predicting on {Path(rgb_path).name}")

        # Load
        rgb, nir = self._load_images(rgb_path, nir_path)
        tensor   = self._image_to_tensor(rgb, nir)

        # Predict
        prob_map  = self._sliding_window_predict(tensor)
        water_mask = (prob_map > threshold).astype(np.uint8)

        # Statistics
        total_px = prob_map.size
        water_px = int(water_mask.sum())
        pixel_m  = 10.0   # Sentinel-2 resolution
        water_km2 = water_px * (pixel_m ** 2) / 1_000_000

        stats = {
            "total_pixels":    total_px,
            "water_pixels":    water_px,
            "land_pixels":     total_px - water_px,
            "water_area_km2":  round(water_km2, 4),
            "water_percentage": round(water_px / total_px * 100, 2),
            "mean_probability": round(float(prob_map.mean()), 4),
            "threshold":       threshold,
        }

        result = {"statistics": stats, "metadata": self.metadata}

        # Save visualisations
        if output_dir:
            output_dir = Path(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            saved = {}

            # 1. Probability heatmap
            heatmap_bgr = cv2.applyColorMap(
                (prob_map * 255).astype(np.uint8), cv2.COLORMAP_JET
            )
            hmap_path = output_dir / f"{output_prefix}_prob_heatmap.png"
            cv2.imwrite(str(hmap_path), heatmap_bgr)
            saved["heatmap"] = hmap_path.name

            # 2. Binary water mask
            mask_vis  = (water_mask * 255).astype(np.uint8)
            mask_path = output_dir / f"{output_prefix}_water_mask.png"
            cv2.imwrite(str(mask_path), mask_vis)
            saved["water_mask"] = mask_path.name

            # 3. Overlay (blue tint on detected water)
            overlay = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR).copy()
            blue_overlay = overlay.copy()
            blue_overlay[water_mask == 1] = (255, 100, 0)   # BGR blue
            overlay = cv2.addWeighted(overlay, 0.6, blue_overlay, 0.4, 0)
            ov_path = output_dir / f"{output_prefix}_overlay.png"
            cv2.imwrite(str(ov_path), overlay)
            saved["overlay"] = ov_path.name

            result["saved_files"] = saved
            logger.info(f"Saved {len(saved)} visualisation files to {output_dir}")

        return result


# ──────────────────────────────────────────────
#  Singleton helper used by FastAPI endpoints
# ──────────────────────────────────────────────

_inferencer: Optional[ModelInference] = None


def get_inferencer(model_dir: Path) -> ModelInference:
    """Return (and cache) a ModelInference instance using best_model.pth."""
    global _inferencer
    best = model_dir / "best_model.pth"
    if _inferencer is None or not _inferencer.is_ready():
        _inferencer = ModelInference(best if best.exists() else None)
    return _inferencer


def reload_inferencer(model_dir: Path) -> ModelInference:
    """Force reload after a new training run finishes."""
    global _inferencer
    _inferencer = None
    return get_inferencer(model_dir)
