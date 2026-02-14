"""
Flood Detection Service for Terra-Form
Week 4: NDWI-based water body detection and flood analysis
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from PIL import Image
import logging
from datetime import datetime
import rasterio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FloodDetector:
    """
    Advanced flood detection using NDWI (Normalized Difference Water Index)
    and multi-spectral analysis
    """
    
    def __init__(self, ndwi_threshold: float = 0.3):
        """
        Initialize flood detector
        
        Args:
            ndwi_threshold: NDWI threshold for water detection (default: 0.3)
                           Values > threshold are considered water
        """
        self.ndwi_threshold = ndwi_threshold
        self.results_dir = Path(__file__).parent.parent / "data" / "flood_results"
        self.results_dir.mkdir(parents=True, exist_ok=True)
    
    def calculate_ndwi(
        self,
        green_band: np.ndarray,
        nir_band: np.ndarray,
        epsilon: float = 0.0001
    ) -> np.ndarray:
        """
        Calculate NDWI (Normalized Difference Water Index)
        
        NDWI = (Green - NIR) / (Green + NIR)
        
        Water reflects more green light and absorbs NIR light,
        resulting in higher NDWI values for water bodies.
        
        Args:
            green_band: Green channel (Band 3 in Sentinel-2)
            nir_band: Near-Infrared channel (Band 8 in Sentinel-2)
            epsilon: Small value to prevent division by zero
        
        Returns:
            NDWI array with values from -1 to 1
        """
        green = green_band.astype(np.float32)
        nir = nir_band.astype(np.float32)
        
        # Avoid division by zero
        denominator = green + nir
        denominator[denominator == 0] = epsilon
        
        ndwi = (green - nir) / denominator
        
        # Clip to valid range
        ndwi = np.clip(ndwi, -1, 1)
        
        return ndwi
    
    def calculate_mndwi(
        self,
        green_band: np.ndarray,
        swir_band: np.ndarray,
        epsilon: float = 0.0001
    ) -> np.ndarray:
        """
        Calculate Modified NDWI (using SWIR instead of NIR)
        
        MNDWI = (Green - SWIR) / (Green + SWIR)
        
        Better for detecting water in urban areas and mixed pixels
        
        Args:
            green_band: Green channel
            swir_band: Short-Wave Infrared channel (Band 11/12 in Sentinel-2)
            epsilon: Small value to prevent division by zero
        
        Returns:
            MNDWI array with values from -1 to 1
        """
        green = green_band.astype(np.float32)
        swir = swir_band.astype(np.float32)
        
        denominator = green + swir
        denominator[denominator == 0] = epsilon
        
        mndwi = (green - swir) / denominator
        mndwi = np.clip(mndwi, -1, 1)
        
        return mndwi
    
    def detect_water_bodies(
        self,
        ndwi: np.ndarray,
        threshold: Optional[float] = None,
        apply_morphology: bool = True
    ) -> np.ndarray:
        """
        Detect water bodies from NDWI values
        
        Args:
            ndwi: NDWI array
            threshold: Water detection threshold (uses instance default if None)
            apply_morphology: Apply morphological operations to clean up detection
        
        Returns:
            Binary mask (1 = water, 0 = land)
        """
        if threshold is None:
            threshold = self.ndwi_threshold
        
        # Create binary water mask
        water_mask = (ndwi > threshold).astype(np.uint8)
        
        if apply_morphology:
            # Remove small noise using morphological opening
            kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            water_mask = cv2.morphologyEx(water_mask, cv2.MORPH_OPEN, kernel_small)
            
            # Fill small holes using morphological closing
            kernel_large = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            water_mask = cv2.morphologyEx(water_mask, cv2.MORPH_CLOSE, kernel_large)
        
        return water_mask
    
    def calculate_flood_probability(
        self,
        ndwi: np.ndarray,
        low_threshold: float = 0.0,
        high_threshold: float = 0.5
    ) -> np.ndarray:
        """
        Calculate flood probability from NDWI values
        
        Args:
            ndwi: NDWI array
            low_threshold: Low confidence water threshold
            high_threshold: High confidence water threshold
        
        Returns:
            Probability array (0-1, where 1 = definite water)
        """
        # Linear interpolation between thresholds
        probability = np.zeros_like(ndwi, dtype=np.float32)
        
        # Below low threshold = 0% probability
        probability[ndwi <= low_threshold] = 0.0
        
        # Above high threshold = 100% probability
        probability[ndwi >= high_threshold] = 1.0
        
        # Between thresholds = linear interpolation
        mask = (ndwi > low_threshold) & (ndwi < high_threshold)
        probability[mask] = (ndwi[mask] - low_threshold) / (high_threshold - low_threshold)
        
        return probability
    
    def create_flood_heatmap(
        self,
        ndwi: np.ndarray,
        colormap: int = cv2.COLORMAP_JET
    ) -> np.ndarray:
        """
        Create color-coded flood probability heatmap
        
        Args:
            ndwi: NDWI array
            colormap: OpenCV colormap to use
                     COLORMAP_JET (blue→red)
                     COLORMAP_TURBO (blue→cyan→yellow→red)
                     COLORMAP_VIRIDIS (purple→green→yellow)
        
        Returns:
            RGB heatmap image
        """
        # Calculate probability
        probability = self.calculate_flood_probability(ndwi)
        
        # Convert to 0-255 range
        heatmap_gray = (probability * 255).astype(np.uint8)
        
        # Apply colormap
        heatmap_color = cv2.applyColorMap(heatmap_gray, colormap)
        
        # Convert BGR to RGB
        heatmap_rgb = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
        
        return heatmap_rgb
    
    def calculate_flood_statistics(
        self,
        water_mask: np.ndarray,
        ndwi: np.ndarray,
        pixel_size_m: float = 10.0
    ) -> Dict:
        """
        Calculate flood extent statistics
        
        Args:
            water_mask: Binary water mask
            ndwi: NDWI array
            pixel_size_m: Pixel size in meters (Sentinel-2 = 10m)
        
        Returns:
            Dictionary with statistics
        """
        total_pixels = water_mask.size
        water_pixels = np.sum(water_mask)
        
        # Calculate area (pixels * pixel_size²)
        pixel_area_m2 = pixel_size_m ** 2
        water_area_m2 = water_pixels * pixel_area_m2
        water_area_km2 = water_area_m2 / 1_000_000
        
        # Calculate percentage
        water_percentage = (water_pixels / total_pixels) * 100
        
        # NDWI statistics for water pixels
        water_ndwi_values = ndwi[water_mask == 1]
        
        stats = {
            "total_pixels": int(total_pixels),
            "water_pixels": int(water_pixels),
            "land_pixels": int(total_pixels - water_pixels),
            "water_area_m2": float(water_area_m2),
            "water_area_km2": float(water_area_km2),
            "water_percentage": float(water_percentage),
            "ndwi_threshold": float(self.ndwi_threshold),
            "pixel_size_m": float(pixel_size_m)
        }
        
        if len(water_ndwi_values) > 0:
            stats.update({
                "ndwi_mean": float(np.mean(water_ndwi_values)),
                "ndwi_max": float(np.max(water_ndwi_values)),
                "ndwi_min": float(np.min(water_ndwi_values)),
                "ndwi_std": float(np.std(water_ndwi_values))
            })
        
        return stats
    
    def compare_flood_extent(
        self,
        before_mask: np.ndarray,
        after_mask: np.ndarray,
        pixel_size_m: float = 10.0
    ) -> Dict:
        """
        Compare flood extent between two time periods
        
        Args:
            before_mask: Water mask before flood
            after_mask: Water mask after flood
            pixel_size_m: Pixel size in meters
        
        Returns:
            Dictionary with comparison statistics
        """
        # Calculate change
        permanent_water = (before_mask == 1) & (after_mask == 1)
        new_flood = (before_mask == 0) & (after_mask == 1)
        receded_water = (before_mask == 1) & (after_mask == 0)
        permanent_land = (before_mask == 0) & (after_mask == 0)
        
        pixel_area_m2 = pixel_size_m ** 2
        
        comparison = {
            "permanent_water_pixels": int(np.sum(permanent_water)),
            "new_flood_pixels": int(np.sum(new_flood)),
            "receded_water_pixels": int(np.sum(receded_water)),
            "permanent_land_pixels": int(np.sum(permanent_land)),
            
            "permanent_water_km2": float(np.sum(permanent_water) * pixel_area_m2 / 1_000_000),
            "new_flood_km2": float(np.sum(new_flood) * pixel_area_m2 / 1_000_000),
            "receded_water_km2": float(np.sum(receded_water) * pixel_area_m2 / 1_000_000),
            
            "total_water_before_km2": float(np.sum(before_mask) * pixel_area_m2 / 1_000_000),
            "total_water_after_km2": float(np.sum(after_mask) * pixel_area_m2 / 1_000_000),
            "flood_change_km2": float((np.sum(after_mask) - np.sum(before_mask)) * pixel_area_m2 / 1_000_000),
            
            "flood_increase_percentage": float((np.sum(new_flood) / max(np.sum(before_mask), 1)) * 100)
        }
        
        return comparison
    
    def create_change_map(
        self,
        before_mask: np.ndarray,
        after_mask: np.ndarray
    ) -> np.ndarray:
        """
        Create RGB change detection map
        
        Color coding:
        - Blue: Permanent water
        - Red: New flood (water increase)
        - Yellow: Receded water
        - White: Permanent land
        
        Args:
            before_mask: Water mask before
            after_mask: Water mask after
        
        Returns:
            RGB change map
        """
        height, width = before_mask.shape
        change_map = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Permanent water (blue)
        permanent_water = (before_mask == 1) & (after_mask == 1)
        change_map[permanent_water] = [0, 100, 255]  # Light blue
        
        # New flood (red)
        new_flood = (before_mask == 0) & (after_mask == 1)
        change_map[new_flood] = [255, 0, 0]  # Red
        
        # Receded water (yellow)
        receded = (before_mask == 1) & (after_mask == 0)
        change_map[receded] = [255, 255, 0]  # Yellow
        
        # Permanent land (white/gray)
        permanent_land = (before_mask == 0) & (after_mask == 0)
        change_map[permanent_land] = [240, 240, 240]  # Light gray
        
        return change_map
    
    def analyze_image(
        self,
        rgb_path: str,
        nir_path: str,
        output_prefix: Optional[str] = None,
        save_results: bool = True
    ) -> Dict:
        """
        Complete flood detection analysis for a single image
        
        Args:
            rgb_path: Path to RGB image
            nir_path: Path to NIR band image
            output_prefix: Prefix for output files
            save_results: Whether to save result images
        
        Returns:
            Dictionary with analysis results
        """
        logger.info(f"Starting flood analysis for {Path(rgb_path).name}")
        
        # Load RGB image
        rgb_image = cv2.imread(rgb_path)
        if rgb_image is None:
            raise ValueError(f"Could not load RGB image: {rgb_path}")
        rgb_image = cv2.cvtColor(rgb_image, cv2.COLOR_BGR2RGB)
        
        # Load NIR image using rasterio (for TIFF support)
        try:
            with rasterio.open(nir_path) as src:
                nir_image = src.read(1)  # Read first band
                logger.info(f"NIR image loaded: shape={nir_image.shape}, dtype={nir_image.dtype}")
        except Exception as e:
            raise ValueError(f"Could not load NIR image: {nir_path}. Error: {str(e)}")
        
        if rgb_image is None or nir_image is None:
            raise ValueError("Could not load images")
        
        # Ensure NIR matches RGB dimensions
        if nir_image.shape[:2] != rgb_image.shape[:2]:
            logger.warning(f"Resizing NIR from {nir_image.shape} to match RGB {rgb_image.shape[:2]}")
            nir_image = cv2.resize(nir_image, (rgb_image.shape[1], rgb_image.shape[0]), interpolation=cv2.INTER_LINEAR)
        
        # Convert NIR to uint8 based on data type
        if nir_image.dtype == np.float32 or nir_image.dtype == np.float64:
            # NIR is in reflectance format (0.0 - 2.0 or 0.0 - 1.0)
            logger.info(f"Converting NIR from {nir_image.dtype} (range: {nir_image.min():.3f}-{nir_image.max():.3f})")
            # Normalize to 0-255 range, clipping values above 1.0
            nir_image = np.clip(nir_image * 255, 0, 255).astype(np.uint8)
            logger.info(f"NIR converted to uint8 (range: {nir_image.min()}-{nir_image.max()})")
        elif nir_image.dtype == np.uint16:
            logger.info("Converting NIR from uint16 to uint8")
            nir_image = (nir_image / 256).astype(np.uint8)
        
        # Extract green band
        green_band = rgb_image[:, :, 1]
        
        # Calculate NDWI
        logger.info("Calculating NDWI...")
        ndwi = self.calculate_ndwi(green_band, nir_image)
        
        # Detect water bodies
        logger.info("Detecting water bodies...")
        water_mask = self.detect_water_bodies(ndwi)
        
        # Create heatmap
        logger.info("Creating flood probability heatmap...")
        heatmap = self.create_flood_heatmap(ndwi)
        
        # Calculate statistics
        logger.info("Calculating flood statistics...")
        stats = self.calculate_flood_statistics(water_mask, ndwi)
        
        # Prepare results
        results = {
            "ndwi": ndwi,
            "water_mask": water_mask,
            "heatmap": heatmap,
            "statistics": stats,
            "rgb_image": rgb_image
        }
        
        # Save results if requested
        if save_results:
            if output_prefix is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_prefix = f"flood_analysis_{timestamp}"
            
            logger.info("Saving results...")
            
            # Save water mask
            mask_path = self.results_dir / f"{output_prefix}_water_mask.png"
            Image.fromarray(water_mask * 255).save(mask_path)
            
            # Save heatmap
            heatmap_path = self.results_dir / f"{output_prefix}_heatmap.png"
            Image.fromarray(heatmap).save(heatmap_path)
            
            # Save NDWI visualization (normalized to 0-255)
            ndwi_viz = ((ndwi + 1) / 2 * 255).astype(np.uint8)
            ndwi_path = self.results_dir / f"{output_prefix}_ndwi.png"
            Image.fromarray(ndwi_viz).save(ndwi_path)
            
            # Create overlay (RGB + water mask)
            overlay = rgb_image.copy()
            overlay[water_mask == 1] = [0, 150, 255]  # Blue overlay for water
            overlay_blended = cv2.addWeighted(rgb_image, 0.6, overlay, 0.4, 0)
            overlay_path = self.results_dir / f"{output_prefix}_overlay.png"
            Image.fromarray(overlay_blended).save(overlay_path)
            
            results["saved_files"] = {
                "water_mask": str(mask_path),
                "heatmap": str(heatmap_path),
                "ndwi": str(ndwi_path),
                "overlay": str(overlay_path)
            }
        
        logger.info("✅ Flood analysis complete!")
        return results
