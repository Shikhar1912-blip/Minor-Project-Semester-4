"""
Week 4 System Tests
Test flood detection functionality
"""

import sys
from pathlib import Path
import numpy as np

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from services.flood_detector import FloodDetector


def test_flood_detector_initialization():
    """Test flood detector can be initialized"""
    print("Test 1: Flood Detector Initialization")
    
    detector = FloodDetector(ndwi_threshold=0.3)
    assert detector.ndwi_threshold == 0.3
    assert detector.results_dir.exists()
    
    print("✅ Flood detector initialized successfully")
    return True


def test_ndwi_calculation():
    """Test NDWI calculation"""
    print("\nTest 2: NDWI Calculation")
    
    detector = FloodDetector()
    
    # Create test bands (100x100 pixels)
    green_band = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
    nir_band = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
    
    # Calculate NDWI
    ndwi = detector.calculate_ndwi(green_band, nir_band)
    
    # Validate
    assert ndwi.shape == green_band.shape
    assert ndwi.min() >= -1 and ndwi.max() <= 1
    assert ndwi.dtype == np.float32
    
    print(f"  ✅ NDWI calculated: range [{ndwi.min():.2f}, {ndwi.max():.2f}]")
    print(f"  ✅ Mean NDWI: {ndwi.mean():.3f}")
    return True


def test_water_detection():
    """Test water body detection"""
    print("\nTest 3: Water Body Detection")
    
    detector = FloodDetector(ndwi_threshold=0.3)
    
    # Create synthetic NDWI with known water/land pattern
    ndwi = np.zeros((100, 100), dtype=np.float32)
    # Top half = water (NDWI > 0.3)
    ndwi[:50, :] = 0.5
    # Bottom half = land (NDWI < 0.3)
    ndwi[50:, :] = 0.1
    
    # Detect water
    water_mask = detector.detect_water_bodies(ndwi, threshold=0.3)
    
    # Validate
    assert water_mask.shape == ndwi.shape
    assert water_mask.dtype == np.uint8
    water_pixels = np.sum(water_mask)
    expected_water = 50 * 100  # Top half
    
    print(f"  ✅ Water pixels detected: {water_pixels}")
    print(f"  ✅ Expected ~{expected_water}, got {water_pixels}")
    # Allow some tolerance due to morphological operations
    assert water_pixels > expected_water * 0.8
    
    return True


def test_flood_probability():
    """Test flood probability calculation"""
    print("\nTest 4: Flood Probability Calculation")
    
    detector = FloodDetector()
    
    # Create NDWI with range of values
    ndwi = np.array([
        [-0.5, 0.0, 0.1],  # No water
        [0.2, 0.3, 0.4],   # Low to high probability
        [0.5, 0.6, 0.8]    # High probability water
    ], dtype=np.float32)
    
    # Calculate probability
    probability = detector.calculate_flood_probability(ndwi, low_threshold=0.0, high_threshold=0.5)
    
    # Validate
    assert probability.shape == ndwi.shape
    assert probability.min() >= 0 and probability.max() <= 1
    
    print(f"  ✅ Probability range: [{probability.min():.2f}, {probability.max():.2f}]")
    print(f"  ✅ Probability at NDWI=0.5: {probability[2,0]:.2f} (should be ~1.0)")
    print(f"  ✅ Probability at NDWI=0.0: {probability[1,0]:.2f} (should be ~0.0)")
    
    return True


def test_flood_statistics():
    """Test flood statistics calculation"""
    print("\nTest 5: Flood Statistics")
    
    detector = FloodDetector()
    
    # Create water mask (50% water)
    water_mask = np.zeros((100, 100), dtype=np.uint8)
    water_mask[:50, :] = 1  # Top half is water
    
    # Create NDWI
    ndwi = np.ones((100, 100), dtype=np.float32) * 0.5
    
    # Calculate statistics
    stats = detector.calculate_flood_statistics(water_mask, ndwi, pixel_size_m=10.0)
    
    # Validate
    assert stats['total_pixels'] == 10000
    assert stats['water_pixels'] == 5000
    assert stats['land_pixels'] == 5000
    assert stats['water_percentage'] == 50.0
    assert stats['water_area_km2'] == 0.5  # 5000 pixels * (10m)^2 / 1,000,000
    
    print(f"  ✅ Total pixels: {stats['total_pixels']}")
    print(f"  ✅ Water pixels: {stats['water_pixels']}")
    print(f"  ✅ Water area: {stats['water_area_km2']} km²")
    print(f"  ✅ Water percentage: {stats['water_percentage']}%")
    
    return True


def test_flood_comparison():
    """Test before/after flood comparison"""
    print("\nTest 6: Flood Extent Comparison")
    
    detector = FloodDetector()
    
    # Before: 25% water
    before_mask = np.zeros((100, 100), dtype=np.uint8)
    before_mask[:25, :] = 1
    
    # After: 50% water (flood doubled)
    after_mask = np.zeros((100, 100), dtype=np.uint8)
    after_mask[:50, :] = 1
    
    # Compare
    comparison = detector.compare_flood_extent(before_mask, after_mask, pixel_size_m=10.0)
    
    # Validate
    assert comparison['permanent_water_pixels'] == 2500  # Top 25 rows
    assert comparison['new_flood_pixels'] == 2500  # Rows 25-50
    assert comparison['receded_water_pixels'] == 0
    assert comparison['flood_change_km2'] == 0.25  # 2500 pixels * (10m)^2 / 1,000,000
    
    print(f"  ✅ Permanent water: {comparison['permanent_water_km2']} km²")
    print(f"  ✅ New flood: {comparison['new_flood_km2']} km²")
    print(f"  ✅ Receded: {comparison['receded_water_km2']} km²")
    print(f"  ✅ Flood increase: {comparison['flood_increase_percentage']:.1f}%")
    
    return True


def test_heatmap_creation():
    """Test flood heatmap creation"""
    print("\nTest 7: Flood Heatmap Creation")
    
    detector = FloodDetector()
    
    # Create gradient NDWI
    ndwi = np.linspace(-1, 1, 10000).reshape(100, 100).astype(np.float32)
    
    # Create heatmap
    heatmap = detector.create_flood_heatmap(ndwi)
    
    # Validate
    assert heatmap.shape == (100, 100, 3)
    assert heatmap.dtype == np.uint8
    assert heatmap.min() >= 0 and heatmap.max() <= 255
    
    print(f"  ✅ Heatmap shape: {heatmap.shape}")
    print(f"  ✅ Heatmap range: [{heatmap.min()}, {heatmap.max()}]")
    
    return True


def test_data_directories():
    """Test required directories exist"""
    print("\nTest 8: Data Directories")
    
    backend_dir = Path(__file__).parent
    
    # Check satellite images (from Week 2)
    sat_dir = backend_dir / "data" / "satellite_images"
    if sat_dir.exists():
        num_rgb = len(list(sat_dir.glob("*.png")))
        num_nir = len(list(sat_dir.glob("*_NIR.tiff")))
        print(f"  ✅ Satellite images: {num_rgb} RGB, {num_nir} NIR")
    else:
        print(f"  ⚠️  Satellite images directory not found")
    
    # Check flood results (Week 4)
    flood_dir = backend_dir / "data" / "flood_results"
    assert flood_dir.exists()
    num_results = len(list(flood_dir.glob("*.png")))
    print(f"  ✅ Flood results directory exists ({num_results} results)")
    
    return True


def run_all_tests():
    """Run all tests"""
    print("="*60)
    print("🧪 WEEK 4 SYSTEM TESTS")
    print("="*60)
    
    tests = [
        test_flood_detector_initialization,
        test_ndwi_calculation,
        test_water_detection,
        test_flood_probability,
        test_flood_statistics,
        test_flood_comparison,
        test_heatmap_creation,
        test_data_directories
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "="*60)
    print(f"📊 TEST RESULTS: {passed} passed, {failed} failed")
    print("="*60)
    
    if failed == 0:
        print("🎉 All tests passed! Week 4 is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
