# Week 4 Quick Reference Guide

## 🎯 NDWI-Based Flood Detection

Quick commands and API reference for Week 4.

---

## 🚀 Quick Start

```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --reload

# Terminal 2 - Frontend  
cd frontend
npm run dev

# Terminal 3 - Run Tests
cd backend
python test_week4.py
```

**Dashboard**: http://localhost:3000/flood

---

## 📡 API Endpoints

### 1. Detect Flood (Single Image)
```http
POST http://localhost:8000/api/flood/detect

Request Body:
{
  "image_filename": "satellite_20250208_123456.png",
  "ndwi_threshold": 0.3,
  "save_results": true
}

Response:
{
  "status": "success",
  "statistics": {
    "water_area_km2": 12.5,
    "water_percentage": 25.3,
    "ndwi_mean": 0.42
  },
  "threshold_used": 0.3,
  "saved_files": {
    "water_mask": "20250209_142030_satellite_20250208_123456_water_mask.png",
    "heatmap": "..._heatmap.png",
    "overlay": "..._overlay.png"
  }
}
```

### 2. Compare Flood Extent (Before/After)
```http
POST http://localhost:8000/api/flood/compare

Request Body:
{
  "before_image": "before_flood.png",
  "after_image": "after_flood.png",
  "ndwi_threshold": 0.3
}

Response:
{
  "before_statistics": {...},
  "after_statistics": {...},
  "comparison": {
    "permanent_water_km2": 5.2,
    "new_flood_km2": 8.3,
    "receded_water_km2": 0.5,
    "flood_change_km2": 7.8,
    "flood_increase_percentage": 150.0
  },
  "change_map": "20250209_142045_comparison_change_map.png"
}
```

### 3. Download Result Image
```http
GET http://localhost:8000/api/flood/results/{filename}

Example:
GET http://localhost:8000/api/flood/results/20250209_142030_satellite_20250208_123456_heatmap.png
```

### 4. List All Results
```http
GET http://localhost:8000/api/flood/list-results

Response:
{
  "results": [
    {
      "filename": "20250209_142030_..._water_mask.png",
      "created": "2025-02-09T14:20:30",
      "size_kb": 245,
      "type": "water_mask"
    },
    ...
  ]
}
```

---

## 🧪 Python Usage

### Basic Flood Detection
```python
from services.flood_detector import FloodDetector
import cv2

# Initialize detector
detector = FloodDetector(ndwi_threshold=0.3)

# Load image bands
rgb_image = cv2.imread("satellite.png")
nir_band = cv2.imread("satellite_NIR.tiff", cv2.IMREAD_UNCHANGED)

# Analyze
results = detector.analyze_image(
    rgb_image=rgb_image,
    nir_band=nir_band,
    output_prefix="flood_analysis",
    save_results=True
)

print(f"Water area: {results['water_area_km2']:.2f} km²")
print(f"Coverage: {results['water_percentage']:.1f}%")
```

### Before/After Comparison
```python
# Detect water in both images
before_mask = detector.detect_water_bodies(before_ndwi)
after_mask = detector.detect_water_bodies(after_ndwi)

# Compare
comparison = detector.compare_flood_extent(before_mask, after_mask)

print(f"New flood: {comparison['new_flood_km2']:.2f} km²")
print(f"Increase: {comparison['flood_increase_percentage']:.1f}%")

# Create change map
change_map = detector.create_change_map(before_mask, after_mask)
cv2.imwrite("change_detection.png", change_map)
```

### Custom NDWI Calculation
```python
# Extract bands
green_band = rgb_image[:, :, 1]  # Green channel
nir_band = nir_image  # Near-infrared

# Calculate NDWI
ndwi = detector.calculate_ndwi(green_band, nir_band)

# Apply custom threshold
water_mask = detector.detect_water_bodies(ndwi, threshold=0.4)
```

---

## 🎨 Frontend Usage

### Single Image Analysis
```typescript
// Select image and set threshold
const [selectedImage, setSelectedImage] = useState<string>("");
const [threshold, setThreshold] = useState<number>(0.3);

// Detect flood
const handleDetectFlood = async () => {
  const response = await axios.post("http://localhost:8000/api/flood/detect", {
    image_filename: selectedImage,
    ndwi_threshold: threshold,
    save_results: true
  });
  
  // Display results
  setFloodResult(response.data);
};
```

### Before/After Comparison
```typescript
// Compare flood extent
const handleCompareFlood = async () => {
  const response = await axios.post("http://localhost:8000/api/flood/compare", {
    before_image: beforeImage,
    after_image: afterImage,
    ndwi_threshold: threshold
  });
  
  // Display comparison
  setComparisonResult(response.data);
};
```

---

## 🔧 Configuration

### NDWI Thresholds
- **0.0 - 0.2**: Very dry land, rocks
- **0.2 - 0.3**: Vegetation, moist soil
- **0.3 - 0.4**: Water bodies (recommended)
- **0.4 - 0.5**: Urban water detection
- **0.5+**: High confidence water

### Morphological Operations
```python
# Noise removal (opening)
kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
cleaned = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_open)

# Hole filling (closing)
kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
filled = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel_close)
```

### Pixel Size Calculation
```python
# Sentinel-2 resolution: 10m per pixel
pixel_size_m = 10.0

# Area calculation
water_pixels = np.sum(water_mask)
water_area_m2 = water_pixels * (pixel_size_m ** 2)
water_area_km2 = water_area_m2 / 1_000_000
```

---

## 📊 Statistics Reference

### Water Detection Stats
```python
{
  "total_pixels": 10000,           # Total image size
  "water_pixels": 2500,             # Detected water
  "land_pixels": 7500,              # Detected land
  "water_percentage": 25.0,         # % coverage
  "water_area_km2": 0.25,          # Area in km²
  "ndwi_mean": 0.42,               # Average NDWI
  "ndwi_min": -0.15,               # Minimum NDWI
  "ndwi_max": 0.85                 # Maximum NDWI
}
```

### Comparison Stats
```python
{
  "permanent_water_km2": 5.2,       # Always water
  "new_flood_km2": 8.3,             # New flooding
  "receded_water_km2": 0.5,         # Water disappeared
  "flood_change_km2": 7.8,          # Net change
  "flood_increase_percentage": 150.0 # % increase
}
```

---

## 🎨 Color Coding

### Change Detection Map
- 🔴 **RED (255, 0, 0)**: New flood areas
- 🟡 **YELLOW (255, 255, 0)**: Receded water
- 🔵 **BLUE (0, 0, 255)**: Permanent water
- ⚫ **BLACK (0, 0, 0)**: No water (land)

### Heatmap (COLORMAP_JET)
- 🟦 **Blue**: Low probability (0.0 - 0.3)
- 🟩 **Green**: Medium probability (0.3 - 0.5)
- 🟨 **Yellow**: High probability (0.5 - 0.7)
- 🟥 **Red**: Very high probability (0.7 - 1.0)

---

## 🧪 Testing Commands

### Run All Tests
```bash
cd backend
python test_week4.py
```

### Test Individual Functions
```python
# Test NDWI calculation
python -c "from services.flood_detector import FloodDetector; import numpy as np; d = FloodDetector(); print(d.calculate_ndwi(np.ones((10,10)), np.zeros((10,10))))"

# Test water detection
python -c "from services.flood_detector import FloodDetector; import numpy as np; d = FloodDetector(); ndwi = np.ones((10,10)) * 0.5; mask = d.detect_water_bodies(ndwi); print(f'Water pixels: {np.sum(mask)}')"
```

---

## 🐛 Troubleshooting

### Issue: Black heatmap
**Solution**: Check NDWI range is -1 to +1, normalize if needed

### Issue: No water detected
**Solution**: Lower threshold (try 0.2), check NIR band is correct

### Issue: Too much noise
**Solution**: Increase morphological kernel size (7×7 or 9×9)

### Issue: Missing NIR band
**Solution**: Ensure satellite image has NIR band downloaded

### Issue: Incorrect area calculation
**Solution**: Verify pixel_size_m matches image resolution (10m for Sentinel-2)

---

## 📁 File Locations

```
terra-form/
├── backend/
│   ├── services/
│   │   └── flood_detector.py      # Core algorithms
│   ├── data/
│   │   ├── satellite_images/      # Input images
│   │   └── flood_results/         # Output files
│   ├── main.py                    # API endpoints
│   └── test_week4.py              # System tests
└── frontend/
    └── app/
        ├── flood/
        │   └── page.tsx           # Dashboard UI
        └── page.tsx               # Home page
```

---

## 🔗 Useful Resources

- **NDWI Paper**: McFeeters (1996) - "The use of the Normalized Difference Water Index (NDWI) in the delineation of open water features"
- **Sentinel-2 Bands**: https://sentinels.copernicus.eu/web/sentinel/user-guides/sentinel-2-msi/resolutions/radiometric
- **OpenCV Morphology**: https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphological_ops.html

---

## 💡 Pro Tips

1. **Start with 0.3 threshold** - Adjust based on results
2. **Use NIR band** - Essential for accurate NDWI
3. **Compare same location** - Before/after must overlap
4. **Check cloud cover** - Clouds affect accuracy
5. **Urban areas need higher threshold** - Try 0.4-0.5
6. **Save intermediate results** - Useful for debugging
7. **Use heatmap** - Shows confidence levels
8. **Validate with ground truth** - Compare to known flood extent

---

**Week 4 Version**: 4.0.0  
**Last Updated**: Feb 9, 2025  
**Status**: Complete ✅
