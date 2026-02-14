# 🚀 Terra-Form Launch Guide

Quick commands to start the complete system after Week 4 completion.

---

## ✅ Prerequisites Check

- [x] Backend code complete (v4.0.0)
- [x] Frontend code complete
- [x] All tests passing (8/8)
- [x] Documentation complete
- [x] Python environment configured
- [x] Node modules installed

---

## 🚀 Launch Commands

### Option 1: PowerShell (Separate Terminals)

**Terminal 1 - Backend Server**:
```powershell
cd "C:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form\backend"
& "C:/Users/Shikhar Varshney/Desktop/Minor Project/.venv/Scripts/python.exe" -m uvicorn main:app --reload
```

**Terminal 2 - Frontend Server**:
```powershell
cd "C:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form\frontend"
npm run dev
```

**Terminal 3 - Run Tests (Optional)**:
```powershell
cd "C:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form\backend"
& "C:/Users/Shikhar Varshney/Desktop/Minor Project/.venv/Scripts/python.exe" test_week4.py
```

---

## 🌐 Access URLs

After launching servers:

- **Frontend Dashboard**: http://localhost:3000
- **Flood Detection**: http://localhost:3000/flood
- **Satellite Images**: http://localhost:3000/satellite
- **Preprocessing**: http://localhost:3000/preprocess
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/api/status

---

## 🧪 Verify System

### 1. Check Backend Status
Open browser: http://localhost:8000/api/status

Expected response:
```json
{
  "status": "operational",
  "version": "4.0.0",
  "sentinel_hub": "configured",
  "preprocessing": "ready",
  "flood_detection": "active",
  "satellite_images": 2,
  "flood_analyses": 0
}
```

### 2. Test Flood Detection Dashboard
1. Go to: http://localhost:3000/flood
2. Select a satellite image
3. Adjust NDWI threshold (try 0.3)
4. Click "Detect Flood"
5. View statistics and heatmap

### 3. Run System Tests
```powershell
cd backend
& "C:/Users/Shikhar Varshney/Desktop/Minor Project/.venv/Scripts/python.exe" test_week4.py
```

Expected output:
```
============================================================
🧪 WEEK 4 SYSTEM TESTS
============================================================
✅ Test 1: Flood Detector Initialization
✅ Test 2: NDWI Calculation
✅ Test 3: Water Body Detection
✅ Test 4: Flood Probability Calculation
✅ Test 5: Flood Statistics
✅ Test 6: Flood Extent Comparison
✅ Test 7: Flood Heatmap Creation
✅ Test 8: Data Directories
============================================================
📊 TEST RESULTS: 8 passed, 0 failed
============================================================
```

---

## 🔧 Quick Troubleshooting

### Issue: Backend won't start
**Solution**:
```powershell
# Check Python path
& "C:/Users/Shikhar Varshney/Desktop/Minor Project/.venv/Scripts/python.exe" --version

# Reinstall dependencies
cd backend
& "C:/Users/Shikhar Varshney/Desktop/Minor Project/.venv/Scripts/pip.exe" install -r requirements.txt
```

### Issue: Frontend won't start
**Solution**:
```powershell
# Reinstall node modules
cd frontend
npm install
npm run dev
```

### Issue: .env not loaded
**Solution**:
- Check `backend/.env` file exists
- Verify `load_dotenv()` is called in `main.py`
- Restart backend server

### Issue: Flood detection returns error
**Solution**:
- Check satellite images exist in `backend/data/satellite_images/`
- Verify NIR band is available (`*_NIR.tiff`)
- Try lowering NDWI threshold to 0.2

---

## 📁 Project Structure

```
terra-form/
├── backend/
│   ├── services/
│   │   ├── sentinel_service.py      # Week 2
│   │   ├── image_preprocessor.py    # Week 3
│   │   └── flood_detector.py        # Week 4 ✨
│   ├── data/
│   │   ├── satellite_images/        # Downloaded images
│   │   └── flood_results/           # Flood analyses
│   ├── main.py                      # API (v4.0.0)
│   ├── requirements.txt
│   ├── test_week4.py                # System tests
│   ├── WEEK4_COMPLETE.md           # Full documentation
│   ├── WEEK4_QUICK_REF.md          # Quick reference
│   └── WEEK4_SUMMARY.md            # This week summary
└── frontend/
    ├── app/
    │   ├── page.tsx                 # Home page
    │   ├── satellite/
    │   │   └── page.tsx             # Week 2
    │   ├── preprocess/
    │   │   └── page.tsx             # Week 3
    │   └── flood/
    │       └── page.tsx             # Week 4 ✨
    └── package.json
```

---

## 🎯 Week 4 Features Ready to Use

### 1. Single Image Flood Detection
- Upload satellite image with NIR band
- Adjust NDWI threshold (0.0 - 0.8)
- Get water area in km²
- View probability heatmap
- See water overlay on original image

### 2. Before/After Comparison
- Select before image (pre-flood)
- Select after image (post-flood)
- Compare flood extent
- See new flood areas (red)
- See receded water (yellow)
- Get percentage increase/decrease

### 3. Visual Analytics
- Color-coded change detection maps
- Probability heatmaps (JET colormap)
- Water overlays
- Statistical summaries

### 4. API Access
- RESTful endpoints for all operations
- JSON responses with statistics
- File downloads for results
- Interactive API docs at /docs

---

## 📊 Expected System Behavior

### Normal Operation
✅ Backend starts on port 8000  
✅ Frontend starts on port 3000  
✅ API responds to status check  
✅ Flood detection page loads  
✅ Image selection dropdown populated  
✅ Threshold slider responsive  
✅ Flood detection returns statistics  
✅ Heatmap and overlay displayed  

### Warning Signs
⚠️ "not_configured" status - Check .env file  
⚠️ "No images available" - Download satellite images first (Week 2)  
⚠️ "NIR band not found" - Ensure NIR band downloaded  
⚠️ Black heatmap - Check NDWI calculation  
⚠️ No water detected - Lower threshold or check image quality  

---

## 🎓 Testing Workflow

### Quick Test (2 minutes)
1. Start both servers
2. Check http://localhost:8000/api/status
3. Go to http://localhost:3000/flood
4. Select image and detect flood

### Full Test (5 minutes)
1. Run `python test_week4.py`
2. Test single image analysis
3. Test before/after comparison
4. Download result images
5. Check `data/flood_results/` directory

### Real Data Test (10 minutes)
1. Download Sentinel-2 images (Week 2)
2. Run flood detection on multiple images
3. Compare before/after flood events
4. Validate with known flood areas
5. Adjust threshold for best results

---

## 📚 Next Steps After Launch

### Immediate
1. ✅ Verify all systems operational
2. ✅ Test flood detection on satellite images
3. ✅ Review heatmaps and statistics
4. ✅ Compare before/after flood events

### Short Term (Week 5)
- Begin deep learning model architecture
- Collect labeled flood datasets
- Design CNN/U-Net for segmentation
- Set up training pipeline

### Long Term (Week 6-16)
- Train flood detection models
- Deploy models to production
- Build prediction system
- Create deployment infrastructure

---

## 🎉 System Status

**All Systems Go!** ✅

- **Week 1**: Architecture ✅
- **Week 2**: Satellite API ✅
- **Week 3**: Preprocessing ✅
- **Week 4**: Flood Detection ✅

**Total Progress**: 25% (4/16 weeks)

---

## 📞 Resources

- **Full Documentation**: `WEEK4_COMPLETE.md`
- **Quick Reference**: `WEEK4_QUICK_REF.md`
- **Week Summary**: `WEEK4_SUMMARY.md`
- **System Tests**: `test_week4.py`
- **API Docs**: http://localhost:8000/docs

---

**Terra-Form v4.0.0**  
**Ready to detect floods! 🌊**  

Launch the system and navigate to:  
👉 **http://localhost:3000/flood**
