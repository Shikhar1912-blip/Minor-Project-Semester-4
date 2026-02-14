# ⚡ Week 2 Quick Reference

## 🎯 What You Can Do Now
- ✅ Download satellite images from space
- ✅ Search by city name or coordinates
- ✅ View images in browser
- ✅ Save images locally
- ✅ Access via API or UI

## 🌐 URLs
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Satellite UI | http://localhost:3000/satellite |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## 🛠️ Commands

### Start Servers
```powershell
# Backend (Terminal 1)
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form"
.\start-backend.ps1

# Frontend (Terminal 2)
.\start-frontend.ps1
```

### Run Tests
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python test_week2.py
```

## 📡 API Endpoints

### Fetch by City
```bash
POST /api/satellite/fetch-city
{
  "city_name": "Delhi",
  "days_before": 10
}
```

### Fetch by Coordinates
```bash
POST /api/satellite/fetch
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "days_before": 10
}
```

### Available Cities
```bash
GET /api/satellite/cities
```

## 🏙️ Available Cities
Delhi • Mumbai • Bangalore • Hyderabad • Chennai • Kolkata • Pune • Ahmedabad • Jaipur • Lucknow • New York • London • Paris • Tokyo

## 📁 Where Images Are Saved
```
backend/data/satellite_images/
├── delhi.png (RGB image)
├── delhi_NIR.tiff (NIR band)
├── mumbai.png
└── mumbai_NIR.tiff
```

## ⚙️ Configuration

### Environment Variables (.env)
```bash
SENTINEL_CLIENT_ID=your_client_id_here
SENTINEL_CLIENT_SECRET=your_client_secret_here
```

### Get Credentials
1. Sign up: https://www.sentinel-hub.com/
2. Dashboard → User Settings → OAuth clients
3. Create new OAuth client
4. Copy Client ID & Secret

## 🧪 Test Status
```
✅ Service Initialization: PASS
✅ City Coordinates: PASS  
✅ Data Directory: PASS
```

## 📚 Documentation Files
- `SENTINEL_SETUP.md` - How to get API credentials
- `WEEK2_COMPLETE.md` - What we built
- `WEEK2_SUMMARY.md` - Complete overview
- `PROJECT_TRACKER.md` - Timeline

## 🐛 Common Issues

### "Sentinel Hub API not configured"
→ Add credentials to `backend/.env` and restart

### "No data available"
→ Try `days_before: 30` or different location

### Slow download
→ First request takes 15-30 seconds (normal!)

## 🎯 Next Steps
1. Get Sentinel Hub credentials
2. Test downloading one image
3. Verify image in data folder
4. Ready for Week 3!

## 📊 Progress
**Week 2:** ✅ COMPLETE  
**Next:** Week 3 - Image Processing  
**Overall:** 12.5% (2/16 weeks)

---

**Quick Start:** http://localhost:3000 → Click "Launch →" on Satellite card 🚀
