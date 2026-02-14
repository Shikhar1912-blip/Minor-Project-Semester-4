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

app = FastAPI(
    title="Terra-Form API",
    description="AI-Driven Disaster Response Planning System",
    version="4.0.0"  # Week 4
)

# Configure CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
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
    
    return {
        "backend": "operational",
        "ai_model": "not_loaded",
        "satellite_api": satellite_status,
        "preprocessing": preprocessing_status,
        "flood_detection": flood_detection_status,
        "processed_tiles": num_processed_tiles,
        "flood_analyses": num_flood_analyses,
        "version": "4.0.0",
        "week": 4
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
