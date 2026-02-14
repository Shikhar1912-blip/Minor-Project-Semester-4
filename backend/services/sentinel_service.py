"""
Sentinel-2 Satellite Imagery Service
Week 2: Download satellite imagery using Sentinel Hub API
"""
from datetime import datetime, timedelta
from typing import Optional, Tuple
import os
from pathlib import Path
import numpy as np
from PIL import Image
from sentinelhub import (
    SHConfig,
    CRS,
    BBox,
    DataCollection,
    MimeType,
    SentinelHubRequest,
    bbox_to_dimensions,
)


class SentinelService:
    """Service for fetching Sentinel-2 satellite imagery"""
    
    def __init__(self, client_id: str, client_secret: str):
        """
        Initialize Sentinel Hub configuration
        
        Args:
            client_id: Sentinel Hub OAuth client ID
            client_secret: Sentinel Hub OAuth client secret
        """
        self.config = SHConfig()
        self.config.sh_client_id = client_id
        self.config.sh_client_secret = client_secret
        
        # Create data directory if it doesn't exist
        self.data_dir = Path(__file__).parent.parent / "data" / "satellite_images"
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def fetch_satellite_image(
        self,
        lat: float,
        lon: float,
        date: Optional[str] = None,
        days_before: int = 30,  # Increased default to 30 days
        resolution: int = 10,
        bbox_size: float = 0.1,
        image_name: Optional[str] = None
    ) -> Tuple[str, dict]:
        """
        Fetch Sentinel-2 satellite image for given coordinates
        
        Args:
            lat: Latitude of center point
            lon: Longitude of center point
            date: Date in YYYY-MM-DD format (default: yesterday)
            days_before: Number of days before date to search for images
            resolution: Resolution in meters (10, 20, or 60)
            bbox_size: Size of bounding box in degrees (default 0.1 = ~11km)
            image_name: Optional custom name for saved image
            
        Returns:
            Tuple of (image_path, metadata)
        """
        # Set date range
        if date is None:
            end_date = datetime.now() - timedelta(days=1)
        else:
            end_date = datetime.strptime(date, "%Y-%m-%d")
        
        start_date = end_date - timedelta(days=days_before)
        
        # Create bounding box around coordinates
        bbox = BBox(
            bbox=[
                lon - bbox_size/2,  # min_lon
                lat - bbox_size/2,  # min_lat
                lon + bbox_size/2,  # max_lon
                lat + bbox_size/2   # max_lat
            ],
            crs=CRS.WGS84
        )
        
        # Calculate image size based on resolution
        bbox_size_meters = bbox_to_dimensions(bbox, resolution=resolution)
        
        # Define evalscript for RGB image
        evalscript = """
        //VERSION=3
        function setup() {
            return {
                input: [{
                    bands: ["B04", "B03", "B02", "B08"],  // Red, Green, Blue, NIR
                    units: "REFLECTANCE"
                }],
                output: {
                    bands: 4,
                    sampleType: "FLOAT32"
                }
            };
        }
        
        function evaluatePixel(sample) {
            // Return RGB + NIR bands with brightness adjustment
            // Reflectance values are typically 0-1, multiply by 3.5 for better visibility
            return [
                sample.B04 * 3.5,  // Red
                sample.B03 * 3.5,  // Green  
                sample.B02 * 3.5,  // Blue
                sample.B08 * 3.5   // NIR (for future water detection)
            ];
        }
        """
        
        # Create request
        request = SentinelHubRequest(
            evalscript=evalscript,
            input_data=[
                SentinelHubRequest.input_data(
                    data_collection=DataCollection.SENTINEL2_L2A,
                    time_interval=(start_date.isoformat(), end_date.isoformat()),
                    maxcc=0.8  # Maximum cloud coverage 80% (more lenient)
                )
            ],
            responses=[
                SentinelHubRequest.output_response("default", MimeType.TIFF)
            ],
            bbox=bbox,
            size=bbox_size_meters,
            config=self.config
        )
        
        # Get the image
        image_data = request.get_data()[0]
        
        # Separate RGB and NIR
        rgb_image = image_data[:, :, :3]
        nir_image = image_data[:, :, 3]
        
        # Check if image is all zeros (no data)
        if np.max(rgb_image) == 0:
            raise ValueError("No satellite data available for this location and date range. Try increasing days_before parameter.")
        
        # Normalize and convert to uint8 with better contrast
        # Clip to 0-1 range first
        rgb_image = np.clip(rgb_image, 0, 1)
        
        # Apply gamma correction for better visibility
        rgb_image = np.power(rgb_image, 0.8)
        
        # Convert to 0-255 range
        rgb_image = (rgb_image * 255).astype(np.uint8)
        
        # Generate filename
        if image_name is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            image_name = f"sentinel_{lat}_{lon}_{timestamp}"
        
        # Save RGB image
        rgb_path = self.data_dir / f"{image_name}.png"
        Image.fromarray(rgb_image).save(rgb_path)
        
        # Save NIR band for future processing (Week 4)
        nir_path = self.data_dir / f"{image_name}_NIR.tiff"
        Image.fromarray(nir_image).save(nir_path)
        
        # Metadata
        metadata = {
            "location": {
                "latitude": lat,
                "longitude": lon
            },
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "bbox": {
                "min_lon": lon - bbox_size/2,
                "min_lat": lat - bbox_size/2,
                "max_lon": lon + bbox_size/2,
                "max_lat": lat + bbox_size/2
            },
            "resolution_meters": resolution,
            "image_size": {
                "width": rgb_image.shape[1],
                "height": rgb_image.shape[0]
            },
            "files": {
                "rgb": str(rgb_path),
                "nir": str(nir_path)
            }
        }
        
        return str(rgb_path), metadata
    
    def get_image_by_city(self, city_name: str) -> Tuple[str, dict]:
        """
        Fetch satellite image for a city by name
        
        Args:
            city_name: Name of the city
            
        Returns:
            Tuple of (image_path, metadata)
            
        Note: This is a simplified version. In production, you'd use a
        geocoding service like Google Maps API or Nominatim.
        """
        # Predefined coordinates for common cities (extend this list)
        city_coordinates = {
            "delhi": (28.6139, 77.2090),
            "mumbai": (19.0760, 72.8777),
            "bangalore": (12.9716, 77.5946),
            "hyderabad": (17.3850, 78.4867),
            "chennai": (13.0827, 80.2707),
            "kolkata": (22.5726, 88.3639),
            "pune": (18.5204, 73.8567),
            "ahmedabad": (23.0225, 72.5714),
            "jaipur": (26.9124, 75.7873),
            "lucknow": (26.8467, 80.9462),
            # Add your college/city here
            "new york": (40.7128, -74.0060),
            "london": (51.5074, -0.1278),
            "paris": (48.8566, 2.3522),
            "tokyo": (35.6762, 139.6503),
        }
        
        city_lower = city_name.lower()
        if city_lower not in city_coordinates:
            raise ValueError(
                f"City '{city_name}' not found. Available cities: "
                f"{', '.join(city_coordinates.keys())}"
            )
        
        lat, lon = city_coordinates[city_lower]
        return self.fetch_satellite_image(
            lat=lat,
            lon=lon,
            image_name=city_name.lower().replace(" ", "_")
        )
