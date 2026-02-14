import rasterio
import numpy as np
import cv2

# Load NIR image
with rasterio.open('data/satellite_images/delhi_NIR.tiff') as src:
    nir = src.read(1)
    print(f'NIR dtype: {nir.dtype}')
    print(f'NIR shape: {nir.shape}')
    print(f'NIR range: [{nir.min()}, {nir.max()}]')
    print(f'NIR mean: {nir.mean():.2f}')

# Load RGB image
rgb = cv2.imread('data/satellite_images/delhi.png')
rgb = cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB)
green = rgb[:, :, 1]

print(f'\nGreen dtype: {green.dtype}')
print(f'Green shape: {green.shape}')
print(f'Green range: [{green.min()}, {green.max()}]')
print(f'Green mean: {green.mean():.2f}')

# Test NDWI calculation with CORRECT conversion for float32
nir_uint8 = np.clip(nir * 255, 0, 255).astype(np.uint8)
print(f'\nNIR uint8 range: [{nir_uint8.min()}, {nir_uint8.max()}]')
print(f'NIR uint8 mean: {nir_uint8.mean():.2f}')

# Calculate NDWI
ndwi = (green.astype(float) - nir_uint8.astype(float)) / (green.astype(float) + nir_uint8.astype(float) + 1e-10)
print(f'\nNDWI range: [{ndwi.min():.3f}, {ndwi.max():.3f}]')
print(f'NDWI mean: {ndwi.mean():.3f}')
print(f'NDWI > 0.3: {(ndwi > 0.3).sum()} pixels ({(ndwi > 0.3).sum() / ndwi.size * 100:.1f}%)')
