# 🔧 Week 3 Quick Reference

## 🚀 Quick Start

### Start the System
```powershell
# Terminal 1: Backend
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form"
.\start-backend.ps1

# Terminal 2: Frontend
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form"
.\start-frontend.ps1
```

### Access the UI
- **Home:** http://localhost:3000
- **Preprocessing:** http://localhost:3000/preprocess
- **API Docs:** http://localhost:8000/docs

## 📡 API Endpoints

### Process Image
```bash
POST /api/preprocess/process
{
  "image_filename": "sentinel_Delhi_20260208.png",
  "tile_size": 512,
  "overlap": 64,
  "normalize_method": "minmax"
}
```

### List Available Images
```bash
GET /api/preprocess/list-images
```

### List Processed Tiles
```bash
GET /api/preprocess/list-tiles
```

### Get Specific Tile
```bash
GET /api/preprocess/tile/{filename}
```

### Extract Bands & Calculate Indices
```bash
POST /api/preprocess/extract-bands
{
  "image_filename": "sentinel_Delhi_20260208.png"
}
```

## 🎨 Normalization Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| **minmax** | Scale to 0-255 | General purpose, standard |
| **standardize** | Zero mean, unit variance | Statistical analysis |
| **clahe** | Contrast enhancement | Low contrast images |

## 📊 Tile Settings

| Parameter | Range | Default | Notes |
|-----------|-------|---------|-------|
| Tile Size | 256-1024 | 512 | Powers of 2 recommended |
| Overlap | 0-256 | 64 | Prevents edge artifacts |
| Min Coverage | 0-1 | 0.5 | Filter low-data tiles |

## 💧 Spectral Indices

### NDVI (Vegetation Index)
```
NDVI = (NIR - Red) / (NIR + Red)
Range: -1 to 1
```
- **< 0**: Water, rocks
- **0 - 0.2**: Bare soil
- **0.2 - 0.5**: Sparse vegetation
- **> 0.5**: Dense vegetation

### NDWI (Water Index)
```
NDWI = (Green - NIR) / (Green + NIR)
Range: -1 to 1
```
- **< 0**: Non-water
- **0 - 0.3**: Moisture
- **> 0.3**: Water bodies 💧
- **> 0.5**: Deep water

## 📁 File Locations

```
backend/data/
├── satellite_images/     ← Raw images from Week 2
│   ├── *.png            (RGB images)
│   └── *_NIR.tiff       (NIR bands)
│
└── processed/           ← Week 3 output
    └── *_tile_*.png     (Processed tiles)
```

## 🧪 Run Tests

```powershell
cd backend
.\venv\Scripts\python.exe test_week3.py
```

## 🎯 Common Tasks

### 1. Process a Single Image
```python
from services.image_preprocessor import ImagePreprocessor

preprocessor = ImagePreprocessor(tile_size=512)
result = preprocessor.process_satellite_image(
    "data/satellite_images/sentinel_Delhi_20260208.png",
    tile_size=512,
    overlap=64,
    normalize_method="minmax"
)
print(f"Created {len(result['tiles'])} tiles")
```

### 2. Extract Bands
```python
bands = preprocessor.extract_bands(
    "data/satellite_images/sentinel_Delhi_20260208.png",
    "data/satellite_images/sentinel_Delhi_20260208_NIR.tiff"
)
print(f"Extracted bands: {list(bands.keys())}")
```

### 3. Calculate Water Index
```python
ndwi = preprocessor.calculate_ndwi(
    bands['green'],
    bands['nir']
)
water_pixels = (ndwi > 0.3).sum()
print(f"Water detected in {water_pixels} pixels")
```

## 🐛 Troubleshooting

### "Image not found"
- Make sure to download satellite images first (Week 2)
- Check `backend/data/satellite_images/` directory

### "No tiles created"
- Image might be too small
- Try reducing `min_tile_coverage` parameter
- Check if image is all black

### Tiles look dark
- Try different normalization methods
- Use "clahe" for better contrast
- Original image might be dark (increase `days_before` in Week 2)

### NDVI/NDWI not available
- NIR band is required
- Make sure `*_NIR.tiff` file exists
- Re-download image from Week 2

## 📚 Key Classes & Methods

### ImagePreprocessor
```python
# Main preprocessing class
preprocessor = ImagePreprocessor(tile_size=512)

# Split into tiles
tiles = preprocessor.split_into_tiles(image_path, overlap=64)

# Normalize colors
normalized = preprocessor.normalize_colors(image, method="minmax")

# Extract bands
bands = preprocessor.extract_bands(rgb_path, nir_path)

# Calculate indices
ndvi = preprocessor.calculate_ndvi(red_band, nir_band)
ndwi = preprocessor.calculate_ndwi(green_band, nir_band)

# Complete pipeline
result = preprocessor.process_satellite_image(image_path)
```

## 💡 Pro Tips

1. **Tile Size**: Use 512×512 for most AI models (ResNet, U-Net)
2. **Overlap**: 64px (12.5%) prevents artifacts, 128px (25%) for better continuity
3. **Normalization**: Start with "minmax", use "clahe" if image is dark
4. **NDWI > 0.3**: Good threshold for flood detection
5. **Coverage Filter**: 0.5 (50%) removes edge tiles with padding

## 🔜 Week 4 Preview

Next week we'll build on this preprocessing pipeline:
- Advanced water body detection algorithms
- Flood probability heatmaps
- Time-series flood analysis
- Before/after comparison tools
- Flood extent visualization

---

**Quick Help:**
- Backend running? Check http://localhost:8000/api/status
- Frontend running? Check http://localhost:3000
- Tests passing? Run `test_week3.py`
- Issues? Check logs in terminal

**Status:** ✅ Week 3 Complete
