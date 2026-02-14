# Terra-Form Project Tracker
# 16-Week Development Timeline

## MONTH 1: FOUNDATION & DATA PIPELINE ✅

### Week 1: Architecture & Setup ✅ COMPLETE
**Goal:** Working frontend-backend communication
- [x] Initialize monorepo structure
- [x] Set up FastAPI backend with Python 3.11
- [x] Create hello_world endpoint
- [x] Set up Next.js 14 with TypeScript
- [x] Configure Tailwind CSS
- [x] Implement CORS middleware
- [x] Build connection test page
- [x] Create comprehensive documentation
- [x] Create setup scripts
**Deliverable:** Full-stack app with working API communication

### Week 2: Sentinel-2 API Integration 🔄 NEXT
### Week 2: Sentinel-2 API Integration ✅ COMPLETE
**Goal:** Download satellite images by coordinates
- [x] Sign up for Sentinel Hub account (User manual step)
- [x] Get API credentials (Client ID & Secret)
- [x] Install sentinelhub-py library
- [x] Write authentication function
- [x] Create fetch_satellite_image(lat, lon, date) function
- [x] Test with a known location (e.g., your college)
- [x] Save images locally (.png format + NIR .tiff)
- [x] Create API endpoint: POST /api/satellite/fetch
- [x] Create API endpoint: POST /api/satellite/fetch-city
- [x] Build frontend UI for satellite imagery
**Deliverable:** ✅ Can download real satellite images from space!

### Week 3: Image Pre-processing 🔄 NEXT
**Goal:** Convert raw satellite data to AI-ready format
- [ ] Install OpenCV, Rasterio, NumPy
- [ ] Understand TIFF image structure
- [ ] Write image tiling function (512x512 pixels)
- [ ] Implement color normalization
- [ ] Create band extraction (RGB, NIR)
- [ ] Build preprocessing pipeline
- [ ] Create API endpoint: POST /api/process/image
- [ ] Test with downloaded images
**Deliverable:** Processed, AI-ready image tiles

### Week 4: NDWI Algorithm Implementation
**Goal:** Mathematical water detection
- [ ] Understand NDWI formula: (Green - NIR) / (Green + NIR)
- [ ] Extract Green and NIR bands from satellite image
- [ ] Implement NDWI calculation
- [ ] Generate binary water mask (threshold ~0.3)
- [ ] Create visualization (black & white image)
- [ ] Create API endpoint: POST /api/detect/water
- [ ] Test on flood images
- [ ] Compare with ground truth
**Deliverable:** ✅ MILESTONE - Water detection working
**Presentation:** Show before/after satellite image with water highlighted


---


## MONTH 2: AI DEVELOPMENT 🧠

### Week 5: Dataset Collection
**Goal:** Training data ready
- [ ] Download FloodNet dataset (~5GB)
- [ ] Download XView2 dataset (optional, larger)
- [ ] Organize into: data/images/ and data/masks/
- [ ] Split into train/val/test (80/10/10)
- [ ] Verify data quality
- [ ] Create data loader script
- [ ] Document dataset statistics
**Deliverable:** Organized training dataset

### Week 6: Building the U-Net Model
**Goal:** AI architecture coded
- [ ] Install PyTorch
- [ ] Study U-Net paper architecture
- [ ] Code Encoder (downsampling blocks)
- [ ] Code Decoder (upsampling blocks)
- [ ] Add skip connections
- [ ] Define loss function (Dice Loss + BCE)
- [ ] Create training configuration
- [ ] Test model on dummy data
**Deliverable:** U-Net model class in PyTorch

### Week 7: Training the Model
**Goal:** Trained AI model
- [ ] Set up Google Colab Pro (for GPU)
- [ ] Upload dataset to Google Drive
- [ ] Configure training hyperparameters
- [ ] Implement training loop
- [ ] Add validation metrics (IoU, F1)
- [ ] Run training (50-100 epochs)
- [ ] Save best model weights (flood_model.pth)
- [ ] Visualize training curves
**Deliverable:** Trained model file (flood_model.pth)

### Week 8: Inference API
**Goal:** AI connected to backend
- [ ] Load trained model in FastAPI
- [ ] Create POST /api/predict endpoint
- [ ] Accept image upload
- [ ] Run inference
- [ ] Generate flood mask
- [ ] Return mask as image
- [ ] Add confidence scores
- [ ] Test with frontend upload
**Deliverable:** ✅ MILESTONE - Working AI API
**Presentation:** Upload image → See flood detection


---


## MONTH 3: 3D VISUALIZATION 🗺️

### Week 9: Mapbox Setup
**Goal:** Basic map rendering
- [ ] Sign up for Mapbox account
- [ ] Get public API key
- [ ] Install react-map-gl
- [ ] Create Map component
- [ ] Center on college/city coordinates
- [ ] Add zoom controls
- [ ] Test map interactivity
- [ ] Store key in environment variables
**Deliverable:** Interactive 2D map in frontend

### Week 10: Enabling 3D Terrain
**Goal:** 3D world visualization
- [ ] Enable Mapbox Terrain-RGB
- [ ] Add Digital Elevation Model (DEM)
- [ ] Configure camera pitch/tilt
- [ ] Add 3D building layer
- [ ] Implement smooth camera transitions
- [ ] Test on mountainous areas
- [ ] Add UI controls for 3D toggle
**Deliverable:** Fully 3D interactive map

### Week 11: Overlaying AI Results
**Goal:** Flood visualization on map
- [ ] Install Deck.gl
- [ ] Convert flood mask to GeoJSON
- [ ] Create BitmapLayer for overlay
- [ ] Add semi-transparent red coloring
- [ ] Implement coordinate transformation
- [ ] Sync overlay with map position
- [ ] Add toggle for overlay visibility
- [ ] Test with real predictions
**Deliverable:** AI results displayed on 3D map

### Week 12: Safe Route Calculation
**Goal:** Evacuation route planning
- [ ] Sign up for OpenRouteService API
- [ ] Install routing library
- [ ] Implement point A → point B selection
- [ ] Fetch route avoiding flood zones
- [ ] Draw route as green line on map
- [ ] Add waypoint markers
- [ ] Calculate route distance & time
- [ ] Show route details panel
**Deliverable:** ✅ MILESTONE - Complete 3D visualization
**Presentation:** Live demo of flood + safe routes


---


## MONTH 4: INTEGRATION & POLISH 🚀

### Week 13: Before vs. After Slider
**Goal:** Interactive comparison UI
- [ ] Install react-compare-slider
- [ ] Create comparison component
- [ ] Load "before disaster" satellite image
- [ ] Load "after disaster" with AI overlay
- [ ] Add draggable slider
- [ ] Implement smooth transitions
- [ ] Add labels ("Before" / "After")
- [ ] Test UX on mobile
**Deliverable:** Swipeable comparison feature

### Week 14: Dashboard Statistics
**Goal:** Data-driven insights
- [ ] Create stats panel component
- [ ] Calculate affected area (sq km)
- [ ] Estimate population (use density API or fake)
- [ ] Count blocked roads
- [ ] Show evacuation capacity
- [ ] Add charts (Chart.js or Recharts)
- [ ] Real-time updates
- [ ] Export data as PDF
**Deliverable:** Professional dashboard

### Week 15: Deployment
**Goal:** Live on the internet
- [ ] Create Dockerfile for backend
- [ ] Test Docker build locally
- [ ] Deploy backend to Render (or AWS)
- [ ] Update CORS for production URL
- [ ] Deploy frontend to Vercel
- [ ] Update environment variables
- [ ] Test production build
- [ ] Set up custom domain (optional)
**Deliverable:** ✅ MILESTONE - Deployed system
**URLs:** Live frontend + backend

### Week 16: Presentation Preparation
**Goal:** Ready to impress panel
- [ ] Write project report (15-20 pages)
- [ ] Create PowerPoint presentation
- [ ] Record demo video (backup)
- [ ] Practice pitch (10 minutes)
- [ ] Prepare Q&A responses
- [ ] Test demo on different computers
- [ ] Create poster (if required)
- [ ] Submit all deliverables
**Deliverable:** 🎯 FINAL - Project complete


---


## KEY MILESTONES

✅ **End of Month 1:** Can download & analyze satellite images
✅ **End of Month 2:** AI can detect floods
✅ **End of Month 3:** 3D map with overlays
✅ **End of Month 4:** Deployed, production-ready system


---


## CRITICAL PATH (Must-Complete Items)

1. Week 2: Satellite API working
2. Week 7: AI model trained
3. Week 11: Flood overlay on map
4. Week 15: Deployed online


---


## RISK MANAGEMENT

### High Risk Items
- **Week 7: Model training** - Requires GPU, takes time
  - Mitigation: Use Google Colab, start early
- **Week 15: Deployment** - May have bugs
  - Mitigation: Test locally first, have backup plan

### Medium Risk Items
- **Week 2: API access** - May need approval
  - Mitigation: Apply early, have backup data source
- **Week 12: Routing API** - Free tier limits
  - Mitigation: Cache routes, optimize requests

### Backup Plans
- If Sentinel-2 fails: Use Google Earth Engine
- If GPU unavailable: Use pre-trained model
- If deployment fails: Show local demo


---


## WEEKLY CHECKLIST FORMAT

For each week:
1. ✅ Mark completed tasks
2. 📝 Document blockers
3. 🎯 Update deliverable status
4. 📊 Track time spent
5. 🔄 Plan next week


---


## CURRENT STATUS

**Week:** 1 of 16
**Month:** 1 of 4
**Progress:** 6.25% complete
**Next Milestone:** Week 4 (Data Pipeline Complete)
**Days to Completion:** ~112 days


---


## NOTES SECTION

### Week 1 Notes:
- ✅ Successfully created full-stack architecture
- ✅ FastAPI + Next.js communication working
- ✅ Documentation complete
- 🎯 Ready to start Week 2


---

**Last Updated:** Week 1 Complete
**Next Review:** Start of Week 2
