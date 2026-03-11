"""
U-Net Model Architecture for Terra-Form
Week 5: Deep Learning - Binary Flood Segmentation

Architecture:
  Encoder (contracting path): 4 down-sampling blocks
  Bottleneck:                  deepest feature representation
  Decoder (expanding path):    4 up-sampling blocks with skip connections
  Output:                      1-channel sigmoid mask (water vs land)

Input:  (B, 4, H, W)  — RGB + NIR  (4 channels)
Output: (B, 1, H, W)  — flood probability map [0, 1]
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


# ─────────────────────────────────────────────
#  Building blocks
# ─────────────────────────────────────────────

class DoubleConv(nn.Module):
    """Two consecutive Conv2d → BatchNorm → ReLU blocks."""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class Down(nn.Module):
    """MaxPool → DoubleConv  (encoder step)."""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.pool_conv = nn.Sequential(
            nn.MaxPool2d(2),
            DoubleConv(in_channels, out_channels),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.pool_conv(x)


class Up(nn.Module):
    """Bilinear up-sample → concat skip → DoubleConv  (decoder step)."""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.up = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=True)
        self.conv = DoubleConv(in_channels, out_channels)

    def forward(self, x: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        x = self.up(x)

        # Pad if spatial sizes differ by 1 pixel (odd input dimensions)
        if x.shape != skip.shape:
            x = F.pad(x, [0, skip.shape[3] - x.shape[3],
                           0, skip.shape[2] - x.shape[2]])

        x = torch.cat([skip, x], dim=1)
        return self.conv(x)


# ─────────────────────────────────────────────
#  U-Net
# ─────────────────────────────────────────────

class UNet(nn.Module):
    """
    Lightweight U-Net for binary flood segmentation.

    Args:
        in_channels:  number of input channels (default 4: R, G, B, NIR)
        base_filters: number of filters in the first encoder block (doubles each level)
    """

    def __init__(self, in_channels: int = 4, base_filters: int = 32):
        super().__init__()

        f = base_filters          # 32
        # ── Encoder ──────────────────────────────
        self.enc1 = DoubleConv(in_channels, f)       # 32
        self.enc2 = Down(f,      f * 2)              # 64
        self.enc3 = Down(f * 2,  f * 4)              # 128
        self.enc4 = Down(f * 4,  f * 8)              # 256

        # ── Bottleneck ────────────────────────────
        self.bottleneck = Down(f * 8, f * 16)        # 512

        # ── Decoder ──────────────────────────────
        # Each Up takes (up_channels + skip_channels) → out_channels
        self.dec4 = Up(f * 16 + f * 8,  f * 8)      # 512 → 256
        self.dec3 = Up(f * 8  + f * 4,  f * 4)      # 256 → 128
        self.dec2 = Up(f * 4  + f * 2,  f * 2)      # 128 → 64
        self.dec1 = Up(f * 2  + f,      f)           # 64  → 32

        # ── Output ────────────────────────────────
        self.out_conv = nn.Conv2d(f, 1, kernel_size=1)   # → 1-channel logits

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Encoder
        s1 = self.enc1(x)          # skip 1
        s2 = self.enc2(s1)         # skip 2
        s3 = self.enc3(s2)         # skip 3
        s4 = self.enc4(s3)         # skip 4

        # Bottleneck
        b = self.bottleneck(s4)

        # Decoder
        d = self.dec4(b,  s4)
        d = self.dec3(d,  s3)
        d = self.dec2(d,  s2)
        d = self.dec1(d,  s1)

        return torch.sigmoid(self.out_conv(d))   # [0, 1] probability map


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def get_model(in_channels: int = 4, base_filters: int = 32) -> UNet:
    """Return an initialised UNet on the correct device."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = UNet(in_channels=in_channels, base_filters=base_filters).to(device)
    return model


def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


# ─────────────────────────────────────────────
#  Loss functions
# ─────────────────────────────────────────────

class DiceLoss(nn.Module):
    """
    Dice loss for binary segmentation.
    Handles class imbalance better than plain BCE.
    """

    def __init__(self, smooth: float = 1.0):
        super().__init__()
        self.smooth = smooth

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        pred   = pred.view(-1)
        target = target.view(-1)
        intersection = (pred * target).sum()
        return 1 - (2 * intersection + self.smooth) / (pred.sum() + target.sum() + self.smooth)


class CombinedLoss(nn.Module):
    """
    BCE + Dice combined loss.
    BCE guides pixel-level accuracy; Dice balances class sizes.
    """

    def __init__(self, bce_weight: float = 0.5, dice_weight: float = 0.5):
        super().__init__()
        self.bce   = nn.BCELoss()
        self.dice  = DiceLoss()
        self.bce_w = bce_weight
        self.dice_w = dice_weight

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        return self.bce_w * self.bce(pred, target) + self.dice_w * self.dice(pred, target)


# ─────────────────────────────────────────────
#  Quick sanity check
# ─────────────────────────────────────────────

if __name__ == "__main__":
    model = get_model()
    print(f"U-Net created on: {next(model.parameters()).device}")
    print(f"Trainable parameters: {count_parameters(model):,}")

    # Forward pass with a dummy 256×256 4-channel image
    dummy = torch.randn(1, 4, 256, 256)
    out   = model(dummy)
    print(f"Input  shape : {dummy.shape}")
    print(f"Output shape : {out.shape}")
    print(f"Output range : [{out.min().item():.3f}, {out.max().item():.3f}]")
    print("✅ Architecture check passed!")
