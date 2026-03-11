"""
Training Pipeline for Terra-Form U-Net
Week 5: Deep Learning - Flood Segmentation Training

Flow:
  1. FloodDataset  — loads (RGB+NIR image, NDWI-derived mask) pairs
  2. Augmentations — random flip / rotate for data diversity
  3. Training loop — CombinedLoss (BCE + Dice), Adam optimizer, LR scheduler
  4. Validation    — IoU and F1 metrics each epoch
  5. Checkpointing — saves best model to data/models/best_model.pth
"""

import cv2
import json
import logging
import numpy as np
import rasterio
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split
import torchvision.transforms.functional as TF

from services.unet_model import get_model, CombinedLoss, count_parameters

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
#  Global training state  (read by status API)
# ─────────────────────────────────────────────
training_state: Dict = {
    "is_training": False,
    "epoch": 0,
    "total_epochs": 0,
    "train_loss": 0.0,
    "val_loss": 0.0,
    "val_iou": 0.0,
    "val_f1": 0.0,
    "best_iou": 0.0,
    "status": "idle",
    "message": "No training started yet",
    "history": [],
}


# ─────────────────────────────────────────────
#  Dataset
# ─────────────────────────────────────────────

class FloodDataset(Dataset):
    """
    Dataset of 256×256 patches cut from satellite images.

    Each sample:
        image  — (4, 256, 256) float32 tensor  [R, G, B, NIR] normalised 0-1
        mask   — (1, 256, 256) float32 tensor  [0=land, 1=water]
    """

    PATCH_SIZE = 256
    STRIDE     = 128   # overlap between patches for more training samples

    def __init__(
        self,
        data_dir: Path,
        ndwi_threshold: float = 0.3,
        augment: bool = True,
    ):
        self.data_dir        = data_dir
        self.ndwi_threshold  = ndwi_threshold
        self.augment         = augment
        self.patches: List[Dict] = []

        self._build_patch_list()
        logger.info(f"FloodDataset: {len(self.patches)} patches from {data_dir}")

    # ------------------------------------------------------------------
    def _build_patch_list(self):
        """Slice every RGB+NIR pair into overlapping 256×256 patches."""
        rgb_files = sorted(
            p for p in self.data_dir.glob("*.png") if "_NIR" not in p.name
        )

        for rgb_path in rgb_files:
            nir_path = rgb_path.with_name(rgb_path.stem + "_NIR.tiff")
            if not nir_path.exists():
                logger.warning(f"No NIR found for {rgb_path.name}, skipping")
                continue

            # Read shapes without loading full image
            rgb = cv2.imread(str(rgb_path))
            h, w = rgb.shape[:2]

            for y in range(0, h - self.PATCH_SIZE + 1, self.STRIDE):
                for x in range(0, w - self.PATCH_SIZE + 1, self.STRIDE):
                    self.patches.append({
                        "rgb_path": str(rgb_path),
                        "nir_path": str(nir_path),
                        "y": y, "x": x,
                        "h": h, "w": w,
                    })

    # ------------------------------------------------------------------
    def _load_patch(self, p: Dict) -> Tuple[np.ndarray, np.ndarray]:
        """Return (H×W×4 uint8, H×W float32 mask) for one patch."""
        y, x = p["y"], p["x"]
        ps   = self.PATCH_SIZE

        # --- RGB ---
        rgb = cv2.imread(p["rgb_path"])
        rgb = cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB)
        rgb_patch = rgb[y:y+ps, x:x+ps]  # H×W×3

        # --- NIR (float32 reflectance 0-2) ---
        with rasterio.open(p["nir_path"]) as src:
            nir_full = src.read(1)

        # Resize NIR to match RGB if needed
        if nir_full.shape != rgb.shape[:2]:
            nir_full = cv2.resize(nir_full, (rgb.shape[1], rgb.shape[0]),
                                  interpolation=cv2.INTER_LINEAR)
        nir_patch = nir_full[y:y+ps, x:x+ps]

        # --- NDWI-based mask ---
        green = rgb_patch[:, :, 1].astype(np.float32) / 255.0
        nir_n = np.clip(nir_patch, 0, 2.0) / 2.0   # normalise NIR to [0,1]
        ndwi  = (green - nir_n) / (green + nir_n + 1e-8)
        mask  = (ndwi > self.ndwi_threshold).astype(np.float32)

        return rgb_patch, nir_patch, mask

    # ------------------------------------------------------------------
    def __len__(self) -> int:
        return len(self.patches)

    def __getitem__(self, idx: int):
        p = self.patches[idx]
        rgb_patch, nir_patch, mask = self._load_patch(p)

        # Build 4-channel image tensor
        r = rgb_patch[:, :, 0].astype(np.float32) / 255.0
        g = rgb_patch[:, :, 1].astype(np.float32) / 255.0
        b = rgb_patch[:, :, 2].astype(np.float32) / 255.0
        n = np.clip(nir_patch, 0, 2.0).astype(np.float32) / 2.0

        image = torch.from_numpy(np.stack([r, g, b, n], axis=0))  # (4, H, W)
        mask  = torch.from_numpy(mask).unsqueeze(0)                # (1, H, W)

        # Augmentations
        if self.augment:
            image, mask = self._augment(image, mask)

        return image, mask

    # ------------------------------------------------------------------
    @staticmethod
    def _augment(image: torch.Tensor, mask: torch.Tensor):
        """Random horizontal/vertical flip and 90° rotations."""
        if torch.rand(1) > 0.5:
            image = TF.hflip(image)
            mask  = TF.hflip(mask)
        if torch.rand(1) > 0.5:
            image = TF.vflip(image)
            mask  = TF.vflip(mask)
        k = torch.randint(0, 4, (1,)).item()
        if k > 0:
            image = torch.rot90(image, k, dims=[1, 2])
            mask  = torch.rot90(mask,  k, dims=[1, 2])
        return image, mask


# ─────────────────────────────────────────────
#  Metrics
# ─────────────────────────────────────────────

def compute_iou(pred: torch.Tensor, target: torch.Tensor, threshold: float = 0.5) -> float:
    pred_bin   = (pred   > threshold).float()
    target_bin = (target > threshold).float()
    intersection = (pred_bin * target_bin).sum().item()
    union        = (pred_bin + target_bin).clamp(0, 1).sum().item()
    return intersection / (union + 1e-8)


def compute_f1(pred: torch.Tensor, target: torch.Tensor, threshold: float = 0.5) -> float:
    pred_bin   = (pred   > threshold).float()
    target_bin = (target > threshold).float()
    tp = (pred_bin * target_bin).sum().item()
    fp = (pred_bin * (1 - target_bin)).sum().item()
    fn = ((1 - pred_bin) * target_bin).sum().item()
    precision = tp / (tp + fp + 1e-8)
    recall    = tp / (tp + fn + 1e-8)
    return 2 * precision * recall / (precision + recall + 1e-8)


# ─────────────────────────────────────────────
#  Training loop
# ─────────────────────────────────────────────

def train(
    data_dir: Path,
    model_dir: Path,
    epochs: int = 20,
    batch_size: int = 4,
    learning_rate: float = 1e-4,
    ndwi_threshold: float = 0.3,
    val_split: float = 0.2,
) -> Dict:
    """
    Full training run.

    Returns the final training_state dict.
    """
    global training_state

    training_state.update({
        "is_training": True,
        "epoch": 0,
        "total_epochs": epochs,
        "best_iou": 0.0,
        "history": [],
        "status": "starting",
        "message": "Preparing dataset…",
    })

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Training on: {device}")

    model_dir.mkdir(parents=True, exist_ok=True)

    # ── Dataset ──────────────────────────────────────────────────────
    dataset = FloodDataset(data_dir, ndwi_threshold=ndwi_threshold, augment=True)

    if len(dataset) == 0:
        training_state.update({
            "is_training": False,
            "status": "error",
            "message": "No images found in satellite_images directory.",
        })
        return training_state

    n_val   = max(1, int(len(dataset) * val_split))
    n_train = len(dataset) - n_val
    train_ds, val_ds = random_split(
        dataset, [n_train, n_val],
        generator=torch.Generator().manual_seed(42),
    )
    # Disable augmentation on validation set
    val_ds.dataset.augment = False

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,  num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=batch_size, shuffle=False, num_workers=0)

    training_state["message"] = (
        f"Dataset ready: {n_train} train patches, {n_val} val patches"
    )
    logger.info(training_state["message"])

    # ── Model, loss, optimizer ────────────────────────────────────────
    model     = get_model(in_channels=4).to(device)
    criterion = CombinedLoss(bce_weight=0.5, dice_weight=0.5)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="max", factor=0.5, patience=3
    )

    logger.info(f"Model params: {count_parameters(model):,}")
    training_state["status"] = "training"

    # ── Epoch loop ────────────────────────────────────────────────────
    for epoch in range(1, epochs + 1):
        training_state["epoch"] = epoch
        t0 = time.time()

        # --- Train ---
        model.train()
        train_loss = 0.0
        for images, masks in train_loader:
            images, masks = images.to(device), masks.to(device)
            optimizer.zero_grad()
            preds = model(images)
            loss  = criterion(preds, masks)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
        train_loss /= len(train_loader)

        # --- Validate ---
        model.eval()
        val_loss = val_iou = val_f1 = 0.0
        with torch.no_grad():
            for images, masks in val_loader:
                images, masks = images.to(device), masks.to(device)
                preds    = model(images)
                val_loss += criterion(preds, masks).item()
                val_iou  += compute_iou(preds, masks)
                val_f1   += compute_f1(preds, masks)

        val_loss /= len(val_loader)
        val_iou  /= len(val_loader)
        val_f1   /= len(val_loader)

        scheduler.step(val_iou)

        elapsed = time.time() - t0
        logger.info(
            f"Epoch {epoch}/{epochs} | "
            f"Loss {train_loss:.4f} | "
            f"Val Loss {val_loss:.4f} | "
            f"IoU {val_iou:.4f} | "
            f"F1 {val_f1:.4f} | "
            f"{elapsed:.1f}s"
        )

        # Update global state
        epoch_record = {
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "val_loss":   round(val_loss,   4),
            "val_iou":    round(val_iou,    4),
            "val_f1":     round(val_f1,     4),
        }
        training_state.update({
            "train_loss": round(train_loss, 4),
            "val_loss":   round(val_loss,   4),
            "val_iou":    round(val_iou,    4),
            "val_f1":     round(val_f1,     4),
            "message":    f"Epoch {epoch}/{epochs} — IoU {val_iou:.4f}",
        })
        training_state["history"].append(epoch_record)

        # Save best checkpoint
        if val_iou > training_state["best_iou"]:
            training_state["best_iou"] = round(val_iou, 4)
            best_path = model_dir / "best_model.pth"
            torch.save({
                "epoch":          epoch,
                "model_state":    model.state_dict(),
                "optimizer_state": optimizer.state_dict(),
                "val_iou":        val_iou,
                "val_f1":         val_f1,
                "ndwi_threshold": ndwi_threshold,
                "in_channels":    4,
                "base_filters":   32,
            }, best_path)
            logger.info(f"  💾 Best model saved (IoU={val_iou:.4f})")

    # Save final checkpoint
    final_path = model_dir / "final_model.pth"
    torch.save({
        "epoch":       epochs,
        "model_state": model.state_dict(),
        "val_iou":     training_state["val_iou"],
        "val_f1":      training_state["val_f1"],
        "history":     training_state["history"],
        "trained_at":  datetime.now().isoformat(),
    }, final_path)

    training_state.update({
        "is_training": False,
        "status":      "complete",
        "message":     f"Training complete! Best IoU: {training_state['best_iou']:.4f}",
    })
    logger.info(training_state["message"])
    return training_state
