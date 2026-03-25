from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
import os
from pathlib import Path
from dotenv import load_dotenv
import logging
from PIL import Image

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Week 2: Import Sentinel Service
from services.sentinel_service import SentinelService
# Week 3: Import Image Preprocessor
from services.image_preprocessor import ImagePreprocessor
# Week 4: Import Flood Detector
from services.flood_detector import FloodDetector
# Week 5: Import Deep Learning services
import threading
from services import train_model as trainer
from services.model_inference import get_inferencer, reload_inferencer

app = FastAPI(
    title="Terra-Form API",
    description="AI-Driven Disaster Response Planning System",
    version="9.0.0"  # Week 9
)

# Configure CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:3002"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Week 2: Initialize Sentinel Service
# Get credentials from environment variables
SENTINEL_CLIENT_ID = os.getenv("SENTINEL_CLIENT_ID", "")
SENTINEL_CLIENT_SECRET = os.getenv("SENTINEL_CLIENT_SECRET", "")

# Initialize service (will be None if credentials not set)
sentinel_service = None
if SENTINEL_CLIENT_ID and SENTINEL_CLIENT_SECRET:
    try:
        sentinel_service = SentinelService(SENTINEL_CLIENT_ID, SENTINEL_CLIENT_SECRET)
    except Exception as e:
        print(f"Warning: Could not initialize Sentinel service: {e}")

# Week 3: Initialize Image Preprocessor
preprocessor = ImagePreprocessor(tile_size=512)

# Week 4: Initialize Flood Detector
flood_detector = FloodDetector(ndwi_threshold=0.3)

# Weeks 6-8: Initialize Alert Service
from services.alert_service import AlertService
alert_service = AlertService()

# Week 9: Initialize Geospatial Service
from services.geospatial_service import GeospatialService
geo_service = GeospatialService()


# Simple state to avoid concurrent bulk classifications
classify_all_state = {"is_running": False}

# Week 5: paths for model storage
MODEL_DIR = Path(__file__).parent / "data" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
SAT_DIR   = Path(__file__).parent / "data" / "satellite_images"
PRED_DIR  = Path(__file__).parent / "data" / "predictions"
PRED_DIR.mkdir(parents=True, exist_ok=True)


# ===== Week 2: Request/Response Models =====
class SatelliteRequest(BaseModel):
    """Request model for fetching satellite imagery"""
    latitude: float
    longitude: float
    date: Optional[str] = None
    days_before: int = 10
    resolution: int = 10
    bbox_size: float = 0.1

class CityRequest(BaseModel):
    """Request model for fetching satellite imagery by city name"""
    city_name: str
    date: Optional[str] = None
    days_before: int = 10

@app.get("/")
async def root():
    """Root endpoint - Health check"""
    return {
        "message": "Terra-Form API is running",
        "status": "operational",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/hello")
async def hello_world():
    """Hello World endpoint for testing frontend-backend connection"""
    return {
        "message": "Hello from Terra-Form Backend!",
        "status": "success",
        "data": {
            "project": "Terra-Form",
            "description": "AI-Driven Disaster Response Planning",
            "week": 2,  # Updated to Week 2
            "phase": "Sentinel-2 API Integration"
        }
    }

@app.get("/api/status")
async def get_status():
    """System status endpoint"""
    satellite_status = "configured" if sentinel_service else "not_configured"
    
    # Check for processed tiles (Week 3)
    processed_dir = Path(__file__).parent / "data" / "processed"
    preprocessing_status = "ready"
    num_processed_tiles = 0
    if processed_dir.exists():
        num_processed_tiles = len(list(processed_dir.glob("*.png")))
        if num_processed_tiles > 0:
            preprocessing_status = "active"
    
    # Check for flood detection results (Week 4)
    flood_results_dir = Path(__file__).parent / "data" / "flood_results"
    flood_detection_status = "ready"
    num_flood_analyses = 0
    if flood_results_dir.exists():
        num_flood_analyses = len(list(flood_results_dir.glob("*_heatmap.png")))
        if num_flood_analyses > 0:
            flood_detection_status = "active"
    
    # Week 5: Check for trained model
    best_model = MODEL_DIR / "best_model.pth"
    model_status = "trained" if best_model.exists() else "not_trained"
    training_status = trainer.training_state.get("status", "idle")

    return {
        "backend": "operational",
        "satellite_api": satellite_status,
        "preprocessing": preprocessing_status,
        "flood_detection": flood_detection_status,
        "deep_learning": model_status,
        "training_status": training_status,
        "processed_tiles": num_processed_tiles,
        "flood_analyses": num_flood_analyses,
        "version": "5.0.0",
        "week": 5
    }


# ===== Week 2: Satellite Imagery Endpoints =====

@app.post("/api/satellite/fetch")
async def fetch_satellite_image(request: SatelliteRequest):
    """
    Fetch satellite image for given coordinates
    
    Args:
        request: SatelliteRequest with lat, lon, and optional parameters
        
    Returns:
        Image metadata and download URL
    """
    if not sentinel_service:
        raise HTTPException(
            status_code=503,
            detail="Sentinel Hub API not configured. Please set SENTINEL_CLIENT_ID and SENTINEL_CLIENT_SECRET environment variables."
        )
    
    try:
        image_path, metadata = sentinel_service.fetch_satellite_image(
            lat=request.latitude,
            lon=request.longitude,
            date=request.date,
            days_before=request.days_before,
            resolution=request.resolution,
            bbox_size=request.bbox_size
        )
        
        # Extract filename for download URL
        filename = Path(image_path).name
        
        return {
            "status": "success",
            "message": "Satellite image fetched successfully",
            "data": {
                "download_url": f"/api/satellite/download/{filename}",
                "metadata": metadata
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/satellite/fetch-city")
async def fetch_satellite_by_city(request: CityRequest):
    """
    Fetch satellite image for a city by name
    
    Args:
        request: CityRequest with city_name and optional parameters
        
    Returns:
        Image metadata and download URL
    """
    if not sentinel_service:
        raise HTTPException(
            status_code=503,
            detail="Sentinel Hub API not configured. Please set SENTINEL_CLIENT_ID and SENTINEL_CLIENT_SECRET environment variables."
        )
    
    try:
        image_path, metadata = sentinel_service.get_image_by_city(request.city_name)
        
        # Extract filename for download URL
        filename = Path(image_path).name
        
        return {
            "status": "success",
            "message": f"Satellite image for {request.city_name} fetched successfully",
            "data": {
                "download_url": f"/api/satellite/download/{filename}",
                "metadata": metadata
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/satellite/download/{filename}")
async def download_satellite_image(filename: str):
    """
    Download a satellite image by filename
    
    Args:
        filename: Name of the image file
        
    Returns:
        The image file
    """
    data_dir = Path(__file__).parent / "data" / "satellite_images"
    file_path = data_dir / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(
        path=file_path,
        media_type="image/png",
        filename=filename
    )


@app.get("/api/satellite/cities")
async def get_available_cities():
    """Get list of available cities for satellite imagery"""
    cities = [
        "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai",
        "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
        "New York", "London", "Paris", "Tokyo"
    ]
    return {
        "status": "success",
        "cities": cities,
        "message": "Add your college/city coordinates in sentinel_service.py"
    }


# ===== Week 3: Image Preprocessing Endpoints =====

class PreprocessRequest(BaseModel):
    """Request model for image preprocessing"""
    image_filename: str  # Filename in satellite_images folder
    tile_size: Optional[int] = 512
    overlap: Optional[int] = 64
    normalize_method: Optional[str] = "minmax"  # minmax, standardize, clahe


@app.post("/api/preprocess/process")
async def preprocess_image(request: PreprocessRequest):
    """
    Process a satellite image: tile, normalize, and prepare for AI
    
    Expected image to be in backend/data/satellite_images/
    """
    try:
        # Construct path to satellite image
        data_dir = Path(__file__).parent / "data" / "satellite_images"
        image_path = data_dir / request.image_filename
        
        if not image_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Image not found: {request.image_filename}. Make sure to download it first."
            )
        
        # Process the image
        result = preprocessor.process_satellite_image(
            str(image_path),
            output_prefix=request.image_filename.replace(".png", ""),
            tile_size=request.tile_size,
            overlap=request.overlap,
            normalize_method=request.normalize_method
        )
        
        # Return metadata and tile info (without the actual tile data)
        tiles_info = []
        for tile_dict in result['tiles']:
            tiles_info.append({
                'position': tile_dict['position'],
                'bbox': tile_dict['bbox'],
                'coverage': tile_dict['coverage']
            })
        
        return {
            "status": "success",
            "message": f"Processed {len(result['saved_paths'])} tiles",
            "metadata": result['metadata'],
            "tiles": tiles_info,
            "saved_paths": result['saved_paths']
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/preprocess/list-images")
async def list_available_images():
    """List all available satellite images for preprocessing"""
    data_dir = Path(__file__).parent / "data" / "satellite_images"
    
    if not data_dir.exists():
        return {
            "status": "success",
            "images": [],
            "message": "No images directory found. Download satellite images first."
        }
    
    # Get all PNG files
    images = []
    for img_path in data_dir.glob("*.png"):
        # Skip NIR images
        if "_NIR" not in img_path.name:
            stat = img_path.stat()
            images.append({
                "filename": img_path.name,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    
    return {
        "status": "success",
        "images": sorted(images, key=lambda x: x['modified'], reverse=True),
        "count": len(images)
    }


@app.get("/api/preprocess/list-tiles")
async def list_processed_tiles():
    """List all processed tiles"""
    processed_dir = Path(__file__).parent / "data" / "processed"
    
    if not processed_dir.exists():
        return {
            "status": "success",
            "tiles": [],
            "message": "No processed tiles yet"
        }
    
    tiles = []
    for tile_path in processed_dir.glob("*.png"):
        stat = tile_path.stat()
        tiles.append({
            "filename": tile_path.name,
            "size_kb": round(stat.st_size / 1024, 2),
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
        })
    
    return {
        "status": "success",
        "tiles": sorted(tiles, key=lambda x: x['modified'], reverse=True),
        "count": len(tiles)
    }


@app.get("/api/preprocess/tile/{filename}")
async def get_processed_tile(filename: str):
    """Download a specific processed tile"""
    processed_dir = Path(__file__).parent / "data" / "processed"
    tile_path = processed_dir / filename
    
    if not tile_path.exists():
        raise HTTPException(status_code=404, detail="Tile not found")
    
    return FileResponse(
        path=tile_path,
        media_type="image/png",
        filename=filename
    )


@app.post("/api/preprocess/extract-bands")
async def extract_image_bands(request: PreprocessRequest):
    """
    Extract spectral bands (R, G, B, NIR) from satellite image
    Also calculates NDVI and NDWI indices
    """
    try:
        # Construct paths
        data_dir = Path(__file__).parent / "data" / "satellite_images"
        rgb_path = data_dir / request.image_filename
        
        # Check for NIR image
        nir_filename = request.image_filename.replace(".png", "_NIR.tiff")
        nir_path = data_dir / nir_filename
        
        if not rgb_path.exists():
            raise HTTPException(status_code=404, detail="RGB image not found")
        
        # Extract bands
        bands = preprocessor.extract_bands(
            str(rgb_path),
            str(nir_path) if nir_path.exists() else None
        )
        
        result = {
            "status": "success",
            "bands_extracted": list(bands.keys()),
            "has_nir": "nir" in bands
        }
        
        # Calculate indices if NIR is available
        if "nir" in bands:
            ndvi = preprocessor.calculate_ndvi(bands['red'], bands['nir'])
            ndwi = preprocessor.calculate_ndwi(bands['green'], bands['nir'])
            
            result["indices"] = {
                "ndvi_available": True,
                "ndwi_available": True,
                "ndvi_mean": float(ndvi.mean()),
                "ndwi_mean": float(ndwi.mean()),
                "ndvi_description": "Vegetation index (-1 to 1, higher = more vegetation)",
                "ndwi_description": "Water index (-1 to 1, higher = more water)"
            }
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== Week 4: Flood Detection Endpoints =====

class FloodDetectionRequest(BaseModel):
    """Request model for flood detection"""
    image_filename: str  # Filename in satellite_images folder
    ndwi_threshold: Optional[float] = 0.3
    save_results: Optional[bool] = True


class FloodComparisonRequest(BaseModel):
    """Request model for before/after flood comparison"""
    before_image: str  # Filename of image before flood
    after_image: str  # Filename of image after flood
    ndwi_threshold: Optional[float] = 0.3


@app.post("/api/flood/detect")
async def detect_flood(request: FloodDetectionRequest):
    """
    Detect flood/water bodies in a satellite image using NDWI
    
    Analyzes RGB + NIR bands to identify water presence
    Returns flood statistics, heatmap, and visualization
    """
    try:
        # Construct paths
        data_dir = Path(__file__).parent / "data" / "satellite_images"
        rgb_path = data_dir / request.image_filename
        
        # Look for NIR image
        nir_filename = request.image_filename.replace(".png", "_NIR.tiff")
        nir_path = data_dir / nir_filename
        
        if not rgb_path.exists():
            raise HTTPException(status_code=404, detail="RGB image not found")
        
        if not nir_path.exists():
            raise HTTPException(
                status_code=404,
                detail="NIR band not found. Make sure you downloaded the full image with NIR band."
            )
        
        # Update detector threshold
        flood_detector.ndwi_threshold = request.ndwi_threshold
        
        # Analyze image
        results = flood_detector.analyze_image(
            str(rgb_path),
            str(nir_path),
            output_prefix=request.image_filename.replace(".png", ""),
            save_results=request.save_results
        )

        # Auto-create alert (Moderate+ only) based on NDWI stats
        try:
            stats = results.get("statistics", {})
            if stats:
                alert_service.create_alert(
                    image_filename=request.image_filename,
                    water_percentage=stats.get("water_percentage", 0),
                    analysis_type="ndwi",
                    location=None,
                    water_area_km2=stats.get("water_area_km2"),
                )
        except Exception as alert_err:
            logger.warning(f"Alert creation skipped: {alert_err}")
        
        # Prepare response
        response = {
            "status": "success",
            "message": "Flood detection complete",
            "statistics": results["statistics"],
            "threshold_used": request.ndwi_threshold
        }
        
        if "saved_files" in results:
            # Convert absolute paths to filenames for download
            saved_files = {}
            for key, path in results["saved_files"].items():
                filename = Path(path).name
                saved_files[key] = filename
            response["saved_files"] = saved_files
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/flood/compare")
async def compare_flood_extent(request: FloodComparisonRequest):
    """
    Compare flood extent between two time periods (before/after)
    
    Analyzes change in water coverage and creates change detection map
    """
    try:
        data_dir = Path(__file__).parent / "data" / "satellite_images"
        
        # Before image
        before_rgb = data_dir / request.before_image
        before_nir = data_dir / request.before_image.replace(".png", "_NIR.tiff")
        
        # After image
        after_rgb = data_dir / request.after_image
        after_nir = data_dir / request.after_image.replace(".png", "_NIR.tiff")
        
        # Check all files exist
        for path in [before_rgb, before_nir, after_rgb, after_nir]:
            if not path.exists():
                raise HTTPException(status_code=404, detail=f"File not found: {path.name}")
        
        # Update threshold
        flood_detector.ndwi_threshold = request.ndwi_threshold
        
        # Analyze before image
        logger.info("Analyzing 'before' image...")
        before_results = flood_detector.analyze_image(
            str(before_rgb),
            str(before_nir),
            output_prefix=f"before_{request.before_image.replace('.png', '')}",
            save_results=False
        )
        
        # Analyze after image
        logger.info("Analyzing 'after' image...")
        after_results = flood_detector.analyze_image(
            str(after_rgb),
            str(after_nir),
            output_prefix=f"after_{request.after_image.replace('.png', '')}",
            save_results=False
        )
        
        # Compare extents
        logger.info("Comparing flood extents...")
        comparison = flood_detector.compare_flood_extent(
            before_results["water_mask"],
            after_results["water_mask"]
        )
        
        # Create change map
        change_map = flood_detector.create_change_map(
            before_results["water_mask"],
            after_results["water_mask"]
        )
        
        # Save change map
        results_dir = Path(__file__).parent / "data" / "flood_results"
        change_map_path = results_dir / f"change_map_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        Image.fromarray(change_map).save(change_map_path)
        
        return {
            "status": "success",
            "message": "Flood comparison complete",
            "before_statistics": before_results["statistics"],
            "after_statistics": after_results["statistics"],
            "comparison": comparison,
            "change_map": change_map_path.name,
            "interpretation": {
                "flood_increased": comparison["flood_change_km2"] > 0,
                "new_flood_area_km2": comparison["new_flood_km2"],
                "receded_water_km2": comparison["receded_water_km2"],
                "net_change_km2": comparison["flood_change_km2"],
                "increase_percentage": comparison["flood_increase_percentage"]
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/flood/results/{filename}")
async def get_flood_result(filename: str):
    """Download a specific flood detection result image"""
    results_dir = Path(__file__).parent / "data" / "flood_results"
    file_path = results_dir / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Result file not found")
    
    return FileResponse(
        path=file_path,
        media_type="image/png",
        filename=filename
    )


@app.get("/api/flood/list-results")
async def list_flood_results():
    """List all flood detection results"""
    results_dir = Path(__file__).parent / "data" / "flood_results"
    
    if not results_dir.exists():
        return {
            "status": "success",
            "results": [],
            "message": "No flood detection results yet"
        }
    
    results = []
    for result_path in results_dir.glob("*.png"):
        stat = result_path.stat()
        results.append({
            "filename": result_path.name,
            "size_kb": round(stat.st_size / 1024, 2),
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "type": "heatmap" if "heatmap" in result_path.name else
                    "mask" if "mask" in result_path.name else
                    "overlay" if "overlay" in result_path.name else
                    "change_map" if "change_map" in result_path.name else
                    "ndwi" if "ndwi" in result_path.name else "other"
        })
    
    return {
        "status": "success",
        "results": sorted(results, key=lambda x: x['modified'], reverse=True),
        "count": len(results)
    }


# ============================================================
#  Week 5 — Deep Learning Endpoints
# ============================================================

class TrainRequest(BaseModel):
    epochs:         int   = 20
    batch_size:     int   = 4
    learning_rate:  float = 1e-4
    ndwi_threshold: float = 0.3
    val_split:      float = 0.2


class PredictRequest(BaseModel):
    image_filename: str
    threshold:      float = 0.5
    save_results:   bool  = True


@app.post("/api/model/train")
async def start_training(request: TrainRequest):
    """
    Start U-Net training in a background thread.
    Returns immediately; poll /api/model/status for progress.
    """
    if trainer.training_state["is_training"]:
        raise HTTPException(status_code=409, detail="Training already in progress")

    sat_dir = SAT_DIR
    if not sat_dir.exists() or not list(sat_dir.glob("*.png")):
        raise HTTPException(
            status_code=404,
            detail="No satellite images found. Download images from the Satellite page first."
        )

    def run():
        trainer.train(
            data_dir        = sat_dir,
            model_dir       = MODEL_DIR,
            epochs          = request.epochs,
            batch_size      = request.batch_size,
            learning_rate   = request.learning_rate,
            ndwi_threshold  = request.ndwi_threshold,
            val_split       = request.val_split,
        )
        # Reload inferencer with newly saved weights
        reload_inferencer(MODEL_DIR)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()

    return {
        "status":  "started",
        "message": "Training started in background. Poll /api/model/status for updates.",
        "config":  request.model_dump(),
    }


@app.get("/api/model/status")
async def get_training_status():
    """Return current training progress and metrics."""
    state = trainer.training_state.copy()
    # Add model-file info
    best  = MODEL_DIR / "best_model.pth"
    final = MODEL_DIR / "final_model.pth"
    state["model_saved"]   = best.exists()
    state["best_model_kb"] = round(best.stat().st_size / 1024, 1) if best.exists() else 0
    return state


@app.post("/api/model/predict")
async def predict_flood(request: PredictRequest):
    """Run the trained U-Net on a satellite image and return flood statistics."""
    inferencer = get_inferencer(MODEL_DIR)

    if not inferencer.is_ready():
        raise HTTPException(
            status_code=404,
            detail="No trained model found. Train a model first via /api/model/train."
        )

    rgb_path = SAT_DIR / request.image_filename
    nir_name = request.image_filename.replace(".png", "_NIR.tiff")
    nir_path = SAT_DIR / nir_name

    if not rgb_path.exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {request.image_filename}")
    if not nir_path.exists():
        raise HTTPException(status_code=404, detail=f"NIR band not found: {nir_name}")

    try:
        prefix = request.image_filename.replace(".png", "")
        result = inferencer.predict(
            rgb_path    = str(rgb_path),
            nir_path    = str(nir_path),
            threshold   = request.threshold,
            output_dir  = PRED_DIR if request.save_results else None,
            output_prefix = prefix,
        )

        # Auto-create alert (Moderate+ only) based on U-Net stats
        try:
            stats = result.get("statistics", {})
            if stats:
                alert_service.create_alert(
                    image_filename=request.image_filename,
                    water_percentage=stats.get("water_percentage", 0),
                    analysis_type="unet",
                    location=None,
                    water_area_km2=stats.get("water_area_km2"),
                )
        except Exception as alert_err:
            logger.warning(f"Alert creation skipped: {alert_err}")

        return {"status": "success", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/model/predictions/{filename}")
async def get_prediction_image(filename: str):
    """Serve a saved prediction visualisation image."""
    path = PRED_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Prediction file not found")
    return FileResponse(str(path), media_type="image/png")

@app.get("/api/model/info")
async def get_model_info():
    """Return metadata of the current best model checkpoint."""
    best = MODEL_DIR / "best_model.pth"
    if not best.exists():
        return {"status": "no_model", "message": "No trained model yet"}

    import torch
    ckpt = torch.load(str(best), map_location="cpu", weights_only=False)
    return {
        "status":          "ready",
        "epoch":           ckpt.get("epoch"),
        "val_iou":         round(ckpt.get("val_iou", 0), 4),
        "val_f1":          round(ckpt.get("val_f1",  0), 4),
        "ndwi_threshold":  ckpt.get("ndwi_threshold", 0.3),
        "model_size_kb":   round(best.stat().st_size / 1024, 1),
    }

# ============================================================
#  Weeks 6-8 — Alert System & Risk Mapping Endpoints
# ============================================================

class ClassifyRequest(BaseModel):
    water_percentage: float
    image_filename: str | None = None
    location: str | None = None
    analysis_type: str | None = "manual"  # ndwi | unet | manual
    water_area_km2: float | None = None
    persist: bool = False


class ClassifyImageRequest(BaseModel):
    image_filename: str
    mode: str = "ndwi"  # ndwi | unet
    ndwi_threshold: float | None = None
    unet_threshold: float | None = 0.5
    persist: bool = True
    location: str | None = None
    water_area_km2: float | None = None


class ClassifyAllRequest(BaseModel):
    mode: str = "ndwi"          # ndwi | unet
    ndwi_threshold: float | None = None
    unet_threshold: float | None = 0.5
    persist: bool = True


@app.post("/api/alerts/classify")
async def classify_risk(request: ClassifyRequest):
    """Classify a water coverage percentage into a risk level.

    By default this acts as a pure "what-if" calculator.
    If `persist=true` and a risk level of Moderate or above is detected,
    the alert is stored via AlertService.create_alert so it appears in the
    live alert log.
    """
    # Always compute risk tier for UI display
    risk = alert_service.classify_risk(request.water_percentage)

    created_alert = None
    if request.persist:
        created_alert = alert_service.create_alert(
            image_filename=request.image_filename or "manual_input",
            water_percentage=request.water_percentage,
            analysis_type=(request.analysis_type or "manual"),
            location=request.location,
            water_area_km2=request.water_area_km2,
        )

    return {
        "status": "success",
        "risk": risk,
        "alert": created_alert,
    }


@app.post("/api/alerts/classify-image")
async def classify_image_risk(request: ClassifyImageRequest):
    """Classify flood risk for an existing image using NDWI or U-Net.

    - mode="ndwi": runs the NDWI detector on the image (requires NIR)
    - mode="unet": runs the trained U-Net (requires trained model)
    - persist=True (default): stores Moderate+ alerts in the log
    """

    img_name = request.image_filename
    mode = request.mode.lower()

    # Resolve paths
    rgb_path = SAT_DIR / img_name
    nir_path = SAT_DIR / img_name.replace(".png", "_NIR.tiff")

    if not rgb_path.exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {img_name}")
    if mode == "ndwi" and not nir_path.exists():
        raise HTTPException(status_code=404, detail=f"NIR band not found for {img_name}")

    stats = None
    analysis_type = mode

    try:
        if mode == "ndwi":
            # Use flood detector (NDWI)
            flood_detector.ndwi_threshold = request.ndwi_threshold or flood_detector.ndwi_threshold
            res = flood_detector.analyze_image(
                str(rgb_path),
                str(nir_path),
                output_prefix=img_name.replace(".png", ""),
                save_results=False,
            )
            stats = res.get("statistics", {})

        elif mode == "unet":
            inferencer = get_inferencer(MODEL_DIR)
            if not inferencer.is_ready():
                raise HTTPException(status_code=404, detail="No trained U-Net model found. Train it first.")
            res = inferencer.predict(
                rgb_path=str(rgb_path),
                nir_path=str(nir_path),
                threshold=request.unet_threshold or 0.5,
                output_dir=None,
                output_prefix=img_name.replace(".png", ""),
            )
            stats = res.get("statistics", {})
        else:
            raise HTTPException(status_code=400, detail="mode must be 'ndwi' or 'unet'")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not stats:
        raise HTTPException(status_code=500, detail="No statistics returned from analysis")

    # Risk classification
    water_pct = stats.get("water_percentage", 0)
    risk = alert_service.classify_risk(water_pct)

    created_alert = None
    if request.persist:
        try:
            created_alert = alert_service.create_alert(
                image_filename=img_name,
                water_percentage=water_pct,
                analysis_type=analysis_type,
                location=request.location,
                water_area_km2=stats.get("water_area_km2"),
            )
        except Exception as alert_err:
            logger.warning(f"Alert creation skipped: {alert_err}")

    return {
        "status": "success",
        "mode": mode,
        "risk": risk,
        "statistics": stats,
        "alert": created_alert,
    }


@app.post("/api/alerts/classify-all")
async def classify_all_images(request: ClassifyAllRequest):
    """Classify all stored satellite images using NDWI or U-Net and log alerts.

    Now runs in a background thread so the API returns immediately. Prevents
    concurrent runs via a simple state flag.
    """

    if classify_all_state.get("is_running"):
        raise HTTPException(status_code=409, detail="Bulk classification already running")

    mode = request.mode.lower()

    def run_bulk():
        classify_all_state["is_running"] = True
        processed = []
        failures = []

        try:
            pngs = [p for p in SAT_DIR.glob("*.png") if not p.name.endswith("_NIR.png")]

            inferencer = None
            if mode == "unet":
                inferencer = get_inferencer(MODEL_DIR)
                if not inferencer.is_ready():
                    raise RuntimeError("No trained U-Net model found. Train it first.")

            for png in pngs:
                img_name = png.name
                nir_path = SAT_DIR / img_name.replace(".png", "_NIR.tiff")
                try:
                    stats = None
                    if mode == "ndwi":
                        if not nir_path.exists():
                            raise FileNotFoundError(f"NIR band missing for {img_name}")
                        flood_detector.ndwi_threshold = request.ndwi_threshold or flood_detector.ndwi_threshold
                        res = flood_detector.analyze_image(
                            str(png), str(nir_path), output_prefix=img_name.replace(".png", ""), save_results=False
                        )
                        stats = res.get("statistics", {})
                    elif mode == "unet":
                        res = inferencer.predict(
                            rgb_path=str(png),
                            nir_path=str(nir_path),
                            threshold=request.unet_threshold or 0.5,
                            output_dir=None,
                            output_prefix=img_name.replace(".png", ""),
                        )
                        stats = res.get("statistics", {})
                    else:
                        raise RuntimeError("mode must be 'ndwi' or 'unet'")

                    if not stats:
                        raise RuntimeError("No statistics returned from analysis")

                    risk = alert_service.classify_risk(stats.get("water_percentage", 0))
                    created_alert = None
                    if request.persist:
                        created_alert = alert_service.create_alert(
                            image_filename=img_name,
                            water_percentage=stats.get("water_percentage", 0),
                            analysis_type=mode,
                            location=None,
                            water_area_km2=stats.get("water_area_km2"),
                        )

                    processed.append({
                        "image": img_name,
                        "risk": risk,
                        "statistics": stats,
                        "alert": created_alert,
                    })
                except Exception as e:
                    failures.append({"image": img_name, "error": str(e)})

            logger.info(f"Bulk classify finished | mode={mode} | processed={len(processed)} | failed={len(failures)}")
        except Exception as e:
            logger.warning(f"Bulk classify failed early: {e}")
        finally:
            classify_all_state["is_running"] = False

    thread = threading.Thread(target=run_bulk, daemon=True)
    thread.start()

    return {
        "status": "started",
        "mode": mode,
        "message": "Bulk classification started. Refresh alerts after it completes.",
    }



@app.get("/api/alerts/list")
async def list_alerts(limit: int = 50, min_level: int = 0):
    """
    Get stored alerts.

    Query params:
        limit     — max number of results (default 50)
        min_level — 0=all, 1=Moderate+, 2=High+, 3=Critical only
    """
    alerts = alert_service.get_alerts(limit=limit, min_level=min_level)
    return {
        "status": "success",
        "count": len(alerts),
        "alerts": alerts,
    }


@app.get("/api/alerts/summary")
async def get_alerts_summary():
    """
    Return aggregate statistics: counts by risk level, most recent alert,
    last critical event, and risk tier definitions.
    """
    summary = alert_service.get_risk_summary()
    return {"status": "success", **summary}


@app.delete("/api/alerts/clear")
async def clear_alerts():
    """Delete all stored alerts (dev / reset use)."""
    result = alert_service.clear_alerts()
    return {"status": "success", "message": f"Cleared {result['deleted']} alerts."}


# ============================================================
#  Week 9 — 3D Map & Geospatial Endpoints (SMART AUTO-OVERLAY)
# ============================================================

class GeoJsonRequest(BaseModel):
    mask_filename: str
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float


@app.post("/api/map/geojson")
async def generate_geojson(request: GeoJsonRequest):
    """Manual fallback: generate GeoJSON with explicit bbox."""
    try:
        bbox = (request.min_lon, request.min_lat, request.max_lon, request.max_lat)
        geojson = geo_service.generate_and_save(
            mask_filename=request.mask_filename, bbox=bbox,
        )
        return {"status": "success", **geojson}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/map/auto-overlay/{mask_filename}")
async def auto_generate_overlay(mask_filename: str):
    """
    SMART: Auto-detect bbox from a mask filename and generate GeoJSON.
    No manual coordinate input needed — the AI extracts everything.
    """
    try:
        geojson = geo_service.auto_generate_overlay(mask_filename)
        return {"status": "success", **geojson}
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/map/auto-overlay-all")
async def auto_generate_all_overlays():
    """
    BATCH: Scan all mask files, auto-detect coordinates, generate
    GeoJSON for every result. Frontend calls this once on page load.
    """
    try:
        results = geo_service.auto_generate_all()
        return {
            "status": "success",
            "count": len(results),
            "overlays": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/map/layers")
async def get_map_layers():
    """List all available mask files with auto-detected bounding boxes."""
    layers = geo_service.get_available_layers()
    return {"status": "success", "count": len(layers), "layers": layers}


@app.get("/api/map/geojson/{filename}")
async def get_saved_geojson(filename: str):
    """Serve a previously generated GeoJSON file."""
    path = geo_service.geojson_dir / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"GeoJSON not found: {filename}")
    import json
    data = json.loads(path.read_text(encoding="utf-8"))
    return {"status": "success", **data}


