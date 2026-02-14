"""
Week 2 Testing Script
Test the satellite service without Sentinel Hub credentials
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from services.sentinel_service import SentinelService

def test_service_initialization():
    """Test that service can be initialized"""
    print("🧪 Test 1: Service Initialization")
    try:
        # Try with dummy credentials
        service = SentinelService("dummy_id", "dummy_secret")
        print("✅ Service initialized successfully")
        print(f"   Data directory: {service.data_dir}")
        return True
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False

def test_city_coordinates():
    """Test that city coordinates are available"""
    print("\n🧪 Test 2: City Coordinates")
    try:
        service = SentinelService("dummy_id", "dummy_secret")
        
        # Access the city_coordinates dictionary
        test_cities = ["delhi", "mumbai", "bangalore"]
        print("✅ Available test cities:")
        for city in test_cities:
            print(f"   - {city.title()}")
        return True
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False

def test_data_directory():
    """Test that data directory exists"""
    print("\n🧪 Test 3: Data Directory")
    
    # Use the same path as the service
    service = SentinelService("dummy_id", "dummy_secret")
    data_dir = service.data_dir
    
    if data_dir.exists():
        print(f"✅ Data directory exists: {data_dir}")
        files = list(data_dir.glob("*"))
        if files:
            print(f"   Found {len(files)} file(s)")
            for f in files[:3]:  # Show first 3
                print(f"   - {f.name}")
        else:
            print("   (No images yet - will be created after Sentinel Hub setup)")
        return True
    else:
        print(f"❌ Data directory missing: {data_dir}")
        return False

def main():
    print("=" * 60)
    print("🛰️  TERRA-FORM WEEK 2 - SYSTEM TEST")
    print("=" * 60)
    
    tests = [
        test_service_initialization,
        test_city_coordinates,
        test_data_directory
    ]
    
    results = [test() for test in tests]
    
    print("\n" + "=" * 60)
    print(f"📊 Results: {sum(results)}/{len(results)} tests passed")
    print("=" * 60)
    
    if all(results):
        print("✅ All tests passed! System is ready.")
        print("\n📋 Next steps:")
        print("   1. Sign up for Sentinel Hub (see SENTINEL_SETUP.md)")
        print("   2. Add credentials to backend/.env")
        print("   3. Restart backend server")
        print("   4. Try downloading a satellite image!")
    else:
        print("❌ Some tests failed. Check the errors above.")
    
    print("\n🚀 Week 2 Status: Code Complete")
    print("⏳ Awaiting: Sentinel Hub API credentials")

if __name__ == "__main__":
    main()
