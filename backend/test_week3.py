"""
Week 3 System Tests
Test preprocessing functionality
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from services.image_preprocessor import ImagePreprocessor
import numpy as np


def test_preprocessor_initialization():
    """Test preprocessor can be initialized"""
    print("Test 1: Preprocessor Initialization")
    
    preprocessor = ImagePreprocessor(tile_size=512)
    assert preprocessor.tile_size == 512
    assert preprocessor.processed_dir.exists()
    
    print("✅ Preprocessor initialized successfully")
    return True


def test_normalization_methods():
    """Test all normalization methods"""
    print("\nTest 2: Normalization Methods")
    
    preprocessor = ImagePreprocessor()
    
    # Create test image
    test_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    
    # Test each method
    methods = ['minmax', 'standardize', 'clahe']
    for method in methods:
        normalized = preprocessor.normalize_colors(test_image, method=method)
        assert normalized.shape == test_image.shape
        assert normalized.dtype == np.uint8
        print(f"  ✅ {method} normalization works")
    
    print("✅ All normalization methods working")
    return True


def test_coverage_calculation():
    """Test coverage calculation"""
    print("\nTest 3: Coverage Calculation")
    
    preprocessor = ImagePreprocessor()
    
    # Test with all black image
    black_tile = np.zeros((512, 512, 3), dtype=np.uint8)
    coverage = preprocessor._calculate_coverage(black_tile)
    assert coverage == 0.0
    print(f"  ✅ Black tile coverage: {coverage}")
    
    # Test with all white image
    white_tile = np.ones((512, 512, 3), dtype=np.uint8) * 255
    coverage = preprocessor._calculate_coverage(white_tile)
    assert coverage == 1.0
    print(f"  ✅ White tile coverage: {coverage}")
    
    print("✅ Coverage calculation working")
    return True


def test_indices_calculation():
    """Test NDVI and NDWI calculation"""
    print("\nTest 4: Spectral Indices Calculation")
    
    preprocessor = ImagePreprocessor()
    
    # Create test bands
    red_band = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
    green_band = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
    nir_band = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
    
    # Calculate NDVI
    ndvi = preprocessor.calculate_ndvi(red_band, nir_band)
    assert ndvi.shape == red_band.shape
    assert ndvi.min() >= -1 and ndvi.max() <= 1
    print(f"  ✅ NDVI calculated: range [{ndvi.min():.2f}, {ndvi.max():.2f}]")
    
    # Calculate NDWI
    ndwi = preprocessor.calculate_ndwi(green_band, nir_band)
    assert ndwi.shape == green_band.shape
    assert ndwi.min() >= -1 and ndwi.max() <= 1
    print(f"  ✅ NDWI calculated: range [{ndwi.min():.2f}, {ndwi.max():.2f}]")
    
    print("✅ Spectral indices working")
    return True


def test_data_directories():
    """Test required directories exist"""
    print("\nTest 5: Data Directories")
    
    backend_dir = Path(__file__).parent
    
    # Check satellite images directory (from Week 2)
    sat_dir = backend_dir / "data" / "satellite_images"
    if sat_dir.exists():
        num_images = len(list(sat_dir.glob("*.png")))
        print(f"  ✅ Satellite images directory exists ({num_images} images)")
    else:
        print(f"  ⚠️  Satellite images directory not found (download images first)")
    
    # Check processed directory (Week 3)
    proc_dir = backend_dir / "data" / "processed"
    assert proc_dir.exists()
    num_tiles = len(list(proc_dir.glob("*.png")))
    print(f"  ✅ Processed tiles directory exists ({num_tiles} tiles)")
    
    print("✅ Data directories check complete")
    return True


def run_all_tests():
    """Run all tests"""
    print("="*60)
    print("🧪 WEEK 3 SYSTEM TESTS")
    print("="*60)
    
    tests = [
        test_preprocessor_initialization,
        test_normalization_methods,
        test_coverage_calculation,
        test_indices_calculation,
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
            failed += 1
    
    print("\n" + "="*60)
    print(f"📊 TEST RESULTS: {passed} passed, {failed} failed")
    print("="*60)
    
    if failed == 0:
        print("🎉 All tests passed! Week 3 is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
