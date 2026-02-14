# Terra-Form 🌍

**AI-Driven Disaster Response Planning System**

A sophisticated geospatial AI platform that uses real-time satellite imagery to detect environmental changes and predict disaster impacts, providing 3D visualizations for emergency evacuation planning.

---

## 🎯 Project Overview

Terra-Form leverages satellite data from Sentinel-2, computer vision AI (U-Net architecture), and 3D mapping technologies to help disaster response teams:
- Detect floods, earthquakes, and environmental changes in real-time
- Predict which roads will be blocked
- Calculate safe evacuation routes
- Visualize vulnerable populations on an interactive 3D map

---

## 📅 Development Timeline (16 Weeks / 4 Months)

### ✅ **Month 1: Foundation & Data Pipeline** (50% Complete)
- **Week 1:** Architecture & Setup ✅ **COMPLETE**
- **Week 2:** Sentinel-2 API Integration ✅ **COMPLETE** ← **YOU ARE HERE**
- Week 3: Image Pre-processing 🔄 **NEXT**
- Week 4: NDWI Algorithm Implementation

### **Month 2: AI Development**
- Week 5: Dataset Collection
- Week 6: U-Net Model Building
- Week 7: Model Training
- Week 8: Inference API

### **Month 3: 3D Visualization**
- Week 9: Mapbox Setup
- Week 10: 3D Terrain Enabling
- Week 11: AI Result Overlay
- Week 12: Safe Route Calculation

### **Month 4: Integration & Polish**
- Week 13: Before vs. After Slider
- Week 14: Dashboard Statistics
- Week 15: Deployment
- Week 16: Presentation Preparation

---

## 🏗️ Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11)
- **AI/ML:** PyTorch, TensorFlow
- **Image Processing:** Rasterio, OpenCV, NumPy
- **Satellite Data:** Sentinel Hub API

### Frontend
- **Framework:** Next.js 14 (React 18)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Mapping:** Mapbox GL JS, Deck.gl
- **HTTP Client:** Axios

### Infrastructure
- **Backend Deployment:** Render / AWS EC2
- **Frontend Deployment:** Vercel
- **Containerization:** Docker

---

## 🚀 Quick Start

### Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 18 or higher
- **npm** or **yarn**

### Installation

#### 1. Clone the Repository
```bash
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form"
```

#### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env
```

#### 3. Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install
```

---

## 🎮 Running the Application

### Terminal 1: Start Backend (FastAPI)

```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: **http://localhost:8000**

API Documentation: **http://localhost:8000/docs**

### Terminal 2: Start Frontend (Next.js)

```bash
cd frontend
npm run dev
```

Frontend will be available at: **http://localhost:3000**

---

## 📡 API Endpoints (Week 1)

### Root Endpoint
```
GET http://localhost:8000/
```
Returns API health status

### Hello World Endpoint
```
GET http://localhost:8000/api/hello
```
Returns project information and connection test data

### System Status
```
GET http://localhost:8000/api/status
```
Returns current system component statuses

---

## 📁 Project Structure

```
terra-form/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example           # Environment template
│   └── .gitignore
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page with API test
│   │   └── globals.css        # Global styles
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── next.config.js
│   └── .gitignore
│
└── README.md
```

---

## ✅ Week 1 Checklist

- [x] Initialize monorepo structure
- [x] Set up FastAPI backend with CORS
- [x] Create hello_world endpoint
- [x] Set up Next.js with TypeScript
- [x] Configure Tailwind CSS
- [x] Build connection test page
- [x] Verify frontend-backend communication
- [x] Create comprehensive documentation

---

## 🎨 Features (Week 1)

### Backend
- ✅ FastAPI with automatic OpenAPI documentation
- ✅ CORS middleware for frontend communication
- ✅ Three test endpoints (root, hello, status)
- ✅ Environment variable support
- ✅ Ready for future expansion

### Frontend
- ✅ Modern Next.js 14 with App Router
- ✅ TypeScript for type safety
- ✅ Tailwind CSS for styling
- ✅ Real-time API connection test
- ✅ Beautiful gradient UI with status indicators
- ✅ Error handling and retry mechanism
- ✅ Responsive design

---

## 🔮 Coming Next (Week 2)

- Sentinel-2 API integration
- Satellite image download functionality
- Geospatial coordinate handling
- Image storage system

---

## 🛠️ Troubleshooting

### Backend Won't Start
```bash
# Make sure virtual environment is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend Connection Error
1. Ensure backend is running on port 8000
2. Check `.env.local` has correct API URL
3. Verify CORS settings in `backend/main.py`

### Port Already in Use
```bash
# Kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📚 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Sentinel Hub API](https://www.sentinel-hub.com/)
- [PyTorch Tutorials](https://pytorch.org/tutorials/)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)

---

## 👨‍💻 Development Guidelines

1. **Always activate virtual environment** before working on backend
2. **Keep dependencies updated** in requirements.txt and package.json
3. **Test API endpoints** using http://localhost:8000/docs
4. **Follow TypeScript strict mode** in frontend
5. **Use Tailwind utility classes** instead of custom CSS

---

## 📝 Week 1 Achievements

🎉 **Milestone Complete:** Frontend-Backend Communication Established

- Successfully created a full-stack architecture
- Implemented real-time API communication
- Built a professional testing interface
- Established development workflow
- Ready for Week 2: Satellite Data Integration

---

## 📞 Project Information

- **Project Type:** Engineering Minor Project
- **Duration:** 4 Months (16 Weeks)
- **Current Week:** 1 of 16
- **Technology Focus:** Geospatial AI, Computer Vision, 3D Visualization
- **Social Impact:** Disaster Response & Emergency Planning

---

## 🎯 Final Goal

By Week 16, Terra-Form will be a **production-ready, deployed system** capable of:
- Processing real satellite imagery
- Detecting floods and disasters using AI
- Displaying 3D terrain with risk overlays
- Calculating safe evacuation routes
- Providing dashboard analytics for disaster response teams

---

**Status:** ✅ Week 1 Complete | 🚀 Ready for Week 2

**Next Task:** Sentinel-2 API Integration
