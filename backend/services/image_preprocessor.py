"""
Image Pre-processing Service for Terra-Form
Week 3: Image tiling, normalization, and band extraction
"""

import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Optional
from PIL import Image
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """
    Handles satellite image pre-processing including:
    - Image tiling (splitting large images into smaller tiles)
    - Color normalization
    - Band extraction (RGB, NIR)
    - Quality checks
    """
    
    def __init__(self, tile_size: int = 512):
        """
        Initialize the preprocessor
        
        Args:
            tile_size: Size of tiles (both width and height in pixels)
        """
        self.tile_size = tile_size
        self.processed_dir = Path(__file__).parent.parent / "data" / "processed"
        self.processed_dir.mkdir(parents=True, exist_ok=True)
    
    def split_into_tiles(
        self,
        image_path: str,
        overlap: int = 0,
        min_tile_coverage: float = 0.5
    ) -> List[Dict[str, any]]:
        """
        Split a large satellite image into smaller tiles
        
        Args:
            image_path: Path to the input image
            overlap: Number of pixels to overlap between tiles
            min_tile_coverage: Minimum fraction of non-black pixels required (0-1)
        
        Returns:
            List of dictionaries containing tile information:
            {
                'tile': numpy array of the tile,
                'position': (row, col) position in the grid,
                'bbox': (x, y, width, height) bounding box,
                'coverage': fraction of non-black pixels
            }
        """
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image from {image_path}")
        
        # Convert BGR to RGB
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        height, width, channels = image.shape
        logger.info(f"Processing image: {width}x{height}x{channels}")
        
        tiles = []
        stride = self.tile_size - overlap
        
        # Calculate grid dimensions
        rows = (height - overlap) // stride + (1 if (height - overlap) % stride > 0 else 0)
        cols = (width - overlap) // stride + (1 if (width - overlap) % stride > 0 else 0)
        
        logger.info(f"Creating {rows}x{cols} = {rows*cols} tiles with stride={stride}")
        
        for row in range(rows):
            for col in range(cols):
                # Calculate tile boundaries
                y_start = row * stride
                x_start = col * stride
                y_end = min(y_start + self.tile_size, height)
                x_end = min(x_start + self.tile_size, width)
                
                # Extract tile
                tile = image[y_start:y_end, x_start:x_end]
                
                # Pad if necessary (edge tiles might be smaller)
                if tile.shape[0] < self.tile_size or tile.shape[1] < self.tile_size:
                    padded_tile = np.zeros((self.tile_size, self.tile_size, channels), dtype=tile.dtype)
                    padded_tile[:tile.shape[0], :tile.shape[1]] = tile
                    tile = padded_tile
                
                # Calculate coverage (non-black pixels)
                coverage = self._calculate_coverage(tile)
                
                # Only include tiles with sufficient coverage
                if coverage >= min_tile_coverage:
                    tiles.append({
                        'tile': tile,
                        'position': (row, col),
                        'bbox': (x_start, y_start, x_end - x_start, y_end - y_start),
                        'coverage': coverage
                    })
        
        logger.info(f"Created {len(tiles)} valid tiles (coverage >= {min_tile_coverage})")
        return tiles
    
    def _calculate_coverage(self, tile: np.ndarray) -> float:
        """
        Calculate the fraction of non-black pixels in a tile
        
        Args:
            tile: Tile image as numpy array
            
        Returns:
            Coverage fraction (0-1)
        """
        # Consider a pixel "black" if all channels are below threshold
        threshold = 10
        non_black_mask = np.any(tile > threshold, axis=2)
        coverage = np.sum(non_black_mask) / (tile.shape[0] * tile.shape[1])
        return coverage
    
    def normalize_colors(
        self,
        image: np.ndarray,
        method: str = "minmax"
    ) -> np.ndarray:
        """
        Normalize image colors for consistent processing
        
        Args:
            image: Input image as numpy array (H, W, C)
            method: Normalization method
                - "minmax": Scale to 0-255 range
                - "standardize": Zero mean, unit variance
                - "clahe": Contrast Limited Adaptive Histogram Equalization
        
        Returns:
            Normalized image
        """
        if method == "minmax":
            # Min-max normalization to 0-255
            normalized = np.zeros_like(image, dtype=np.float32)
            for c in range(image.shape[2]):
                channel = image[:, :, c].astype(np.float32)
                min_val = np.min(channel)
                max_val = np.max(channel)
                if max_val > min_val:
                    normalized[:, :, c] = ((channel - min_val) / (max_val - min_val)) * 255
                else:
                    normalized[:, :, c] = channel
            return normalized.astype(np.uint8)
        
        elif method == "standardize":
            # Standardize to zero mean, unit variance
            normalized = np.zeros_like(image, dtype=np.float32)
            for c in range(image.shape[2]):
                channel = image[:, :, c].astype(np.float32)
                mean = np.mean(channel)
                std = np.std(channel)
                if std > 0:
                    normalized[:, :, c] = (channel - mean) / std
                else:
                    normalized[:, :, c] = channel - mean
            # Scale to 0-255 for visualization
            normalized = ((normalized - normalized.min()) / 
                         (normalized.max() - normalized.min()) * 255)
            return normalized.astype(np.uint8)
        
        elif method == "clahe":
            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            if len(image.shape) == 3:
                # Apply to each channel
                normalized = np.zeros_like(image)
                for c in range(image.shape[2]):
                    normalized[:, :, c] = clahe.apply(image[:, :, c])
                return normalized
            else:
                return clahe.apply(image)
        
        else:
            raise ValueError(f"Unknown normalization method: {method}")
    
    def extract_bands(
        self,
        rgb_path: str,
        nir_path: Optional[str] = None
    ) -> Dict[str, np.ndarray]:
        """
        Extract and separate spectral bands from images
        
        Args:
            rgb_path: Path to RGB image
            nir_path: Optional path to NIR (Near-Infrared) image
        
        Returns:
            Dictionary with band arrays:
            {
                'red': red channel,
                'green': green channel,
                'blue': blue channel,
                'nir': NIR channel (if provided),
                'rgb': full RGB image
            }
        """
        # Load RGB image
        rgb_image = cv2.imread(rgb_path)
        if rgb_image is None:
            raise ValueError(f"Could not load RGB image from {rgb_path}")
        
        rgb_image = cv2.cvtColor(rgb_image, cv2.COLOR_BGR2RGB)
        
        bands = {
            'red': rgb_image[:, :, 0],
            'green': rgb_image[:, :, 1],
            'blue': rgb_image[:, :, 2],
            'rgb': rgb_image
        }
        
        # Load NIR if provided
        if nir_path and Path(nir_path).exists():
            nir_image = cv2.imread(nir_path, cv2.IMREAD_GRAYSCALE)
            if nir_image is not None:
                bands['nir'] = nir_image
                logger.info("NIR band loaded successfully")
        
        return bands
    
    def calculate_ndvi(
        self,
        red_band: np.ndarray,
        nir_band: np.ndarray
    ) -> np.ndarray:
        """
        Calculate NDVI (Normalized Difference Vegetation Index)
        NDVI = (NIR - Red) / (NIR + Red)
        
        Useful for identifying vegetation and green areas
        
        Args:
            red_band: Red channel array
            nir_band: NIR channel array
        
        Returns:
            NDVI array (values from -1 to 1)
        """
        red = red_band.astype(np.float32)
        nir = nir_band.astype(np.float32)
        
        # Avoid division by zero
        denominator = nir + red
        denominator[denominator == 0] = 0.0001
        
        ndvi = (nir - red) / denominator
        return ndvi
    
    def calculate_ndwi(
        self,
        green_band: np.ndarray,
        nir_band: np.ndarray
    ) -> np.ndarray:
        """
        Calculate NDWI (Normalized Difference Water Index)
        NDWI = (Green - NIR) / (Green + NIR)
        
        Useful for detecting water bodies (important for flood detection!)
        
        Args:
            green_band: Green channel array
            nir_band: NIR channel array
        
        Returns:
            NDWI array (values from -1 to 1)
            High values indicate water presence
        """
        green = green_band.astype(np.float32)
        nir = nir_band.astype(np.float32)
        
        # Avoid division by zero
        denominator = green + nir
        denominator[denominator == 0] = 0.0001
        
        ndwi = (green - nir) / denominator
        return ndwi
    
    def save_tiles(
        self,
        tiles: List[Dict],
        output_prefix: str,
        save_normalized: bool = True
    ) -> List[str]:
        """
        Save processed tiles to disk
        
        Args:
            tiles: List of tile dictionaries from split_into_tiles()
            output_prefix: Prefix for output filenames
            save_normalized: Whether to apply normalization before saving
        
        Returns:
            List of saved file paths
        """
        saved_paths = []
        
        for idx, tile_info in enumerate(tiles):
            tile = tile_info['tile']
            row, col = tile_info['position']
            
            # Normalize if requested
            if save_normalized:
                tile = self.normalize_colors(tile, method="minmax")
            
            # Generate filename
            filename = f"{output_prefix}_tile_r{row}_c{col}.png"
            filepath = self.processed_dir / filename
            
            # Save using PIL (handles RGB correctly)
            Image.fromarray(tile).save(filepath)
            saved_paths.append(str(filepath))
        
        logger.info(f"Saved {len(saved_paths)} tiles to {self.processed_dir}")
        return saved_paths
    
    def process_satellite_image(
        self,
        image_path: str,
        output_prefix: Optional[str] = None,
        tile_size: int = 512,
        overlap: int = 64,
        normalize_method: str = "minmax"
    ) -> Dict[str, any]:
        """
        Complete preprocessing pipeline for a satellite image
        
        Args:
            image_path: Path to input satellite image
            output_prefix: Prefix for output files (auto-generated if None)
            tile_size: Size of tiles
            overlap: Overlap between tiles in pixels
            normalize_method: Normalization method to apply
        
        Returns:
            Dictionary with processing results:
            {
                'tiles': list of tile dictionaries,
                'saved_paths': list of saved file paths,
                'metadata': processing metadata
            }
        """
        self.tile_size = tile_size
        
        # Generate output prefix if not provided
        if output_prefix is None:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_prefix = f"processed_{timestamp}"
        
        # Step 1: Split into tiles
        logger.info(f"Step 1: Splitting image into {tile_size}x{tile_size} tiles...")
        tiles = self.split_into_tiles(image_path, overlap=overlap)
        
        # Step 2: Normalize tiles
        logger.info(f"Step 2: Normalizing tiles using {normalize_method} method...")
        for tile_info in tiles:
            tile_info['tile'] = self.normalize_colors(
                tile_info['tile'],
                method=normalize_method
            )
        
        # Step 3: Save tiles
        logger.info("Step 3: Saving processed tiles...")
        saved_paths = self.save_tiles(tiles, output_prefix, save_normalized=False)
        
        # Generate metadata
        metadata = {
            'input_image': image_path,
            'tile_size': tile_size,
            'overlap': overlap,
            'normalize_method': normalize_method,
            'num_tiles': len(tiles),
            'output_directory': str(self.processed_dir)
        }
        
        logger.info("✅ Preprocessing complete!")
        
        return {
            'tiles': tiles,
            'saved_paths': saved_paths,
            'metadata': metadata
        }
