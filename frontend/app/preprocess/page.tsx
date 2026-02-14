'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface ImageInfo {
  filename: string
  size_mb: number
  modified: string
}

interface TileInfo {
  position: [number, number]
  bbox: [number, number, number, number]
  coverage: number
}

interface ProcessResult {
  status: string
  message: string
  metadata: {
    input_image: string
    tile_size: number
    overlap: number
    normalize_method: string
    num_tiles: number
    output_directory: string
  }
  tiles: TileInfo[]
  saved_paths: string[]
}

export default function PreprocessingPage() {
  const [images, setImages] = useState<ImageInfo[]>([])
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [tileSize, setTileSize] = useState(512)
  const [overlap, setOverlap] = useState(64)
  const [normalizeMethod, setNormalizeMethod] = useState('minmax')
  const [selectedTiles, setSelectedTiles] = useState<string[]>([])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Load available images on mount
  useEffect(() => {
    fetchAvailableImages()
  }, [])

  const fetchAvailableImages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/preprocess/list-images`)
      setImages(response.data.images)
      if (response.data.images.length > 0) {
        setSelectedImage(response.data.images[0].filename)
      }
    } catch (err) {
      console.error('Failed to fetch images:', err)
      setError('Failed to load images. Make sure you have downloaded satellite images first.')
    }
  }

  const handleProcessImage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedImage) {
      setError('Please select an image to process')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await axios.post(`${API_URL}/api/preprocess/process`, {
        image_filename: selectedImage,
        tile_size: tileSize,
        overlap: overlap,
        normalize_method: normalizeMethod
      })

      setResult(response.data)
      
      // Load first 9 tiles for preview
      const tilesToShow = response.data.saved_paths.slice(0, 9).map((path: string) => {
        const filename = path.split('\\').pop() || path.split('/').pop()
        return filename
      })
      setSelectedTiles(tilesToShow)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process image')
    } finally {
      setLoading(false)
    }
  }

  const handleExtractBands = async () => {
    if (!selectedImage) return

    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(`${API_URL}/api/preprocess/extract-bands`, {
        image_filename: selectedImage
      })

      alert(`Bands extracted successfully!\n\nBands: ${response.data.bands_extracted.join(', ')}\n\n${
        response.data.indices ? 
        `NDVI (vegetation): ${response.data.indices.ndvi_mean.toFixed(3)}\nNDWI (water): ${response.data.indices.ndwi_mean.toFixed(3)}` : 
        'NIR band not available for indices calculation'
      }`)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to extract bands')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔧 Image Pre-processing
          </h1>
          <p className="text-gray-600">
            Tile, normalize, and extract bands from satellite imagery
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Configuration */}
          <div className="space-y-6">
            
            {/* Image Selection Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">📁 Select Image</h2>
              
              {images.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No satellite images found</p>
                  <a 
                    href="/satellite" 
                    className="text-blue-600 hover:underline"
                  >
                    Download satellite images first →
                  </a>
                </div>
              ) : (
                <select
                  value={selectedImage}
                  onChange={(e) => setSelectedImage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {images.map((img) => (
                    <option key={img.filename} value={img.filename}>
                      {img.filename} ({img.size_mb} MB)
                    </option>
                  ))}
                </select>
              )}

              {images.length > 0 && (
                <button
                  onClick={fetchAvailableImages}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  🔄 Refresh list
                </button>
              )}
            </div>

            {/* Processing Options Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">⚙️ Processing Options</h2>
              
              <form onSubmit={handleProcessImage} className="space-y-4">
                
                {/* Tile Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tile Size: {tileSize}x{tileSize} pixels
                  </label>
                  <input
                    type="range"
                    min="256"
                    max="1024"
                    step="256"
                    value={tileSize}
                    onChange={(e) => setTileSize(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>256</span>
                    <span>512</span>
                    <span>768</span>
                    <span>1024</span>
                  </div>
                </div>

                {/* Overlap */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tile Overlap: {overlap} pixels
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="256"
                    step="32"
                    value={overlap}
                    onChange={(e) => setOverlap(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>128</span>
                    <span>256</span>
                  </div>
                </div>

                {/* Normalization Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Normalization Method
                  </label>
                  <select
                    value={normalizeMethod}
                    onChange={(e) => setNormalizeMethod(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="minmax">Min-Max (0-255)</option>
                    <option value="standardize">Standardize (Z-score)</option>
                    <option value="clahe">CLAHE (Contrast Enhancement)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {normalizeMethod === 'minmax' && 'Scale values to 0-255 range'}
                    {normalizeMethod === 'standardize' && 'Zero mean, unit variance'}
                    {normalizeMethod === 'clahe' && 'Adaptive histogram equalization'}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !selectedImage}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
                  >
                    {loading ? '⏳ Processing...' : '🚀 Process Image'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleExtractBands}
                    disabled={loading || !selectedImage}
                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-semibold"
                  >
                    📊 Extract Bands
                  </button>
                </div>
              </form>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 What does this do?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✂️ <strong>Tiling:</strong> Splits large images into smaller tiles for AI processing</li>
                <li>🎨 <strong>Normalization:</strong> Standardizes colors across different captures</li>
                <li>📡 <strong>Band Extraction:</strong> Separates RGB and NIR spectral bands</li>
                <li>💧 <strong>Water Index:</strong> Calculates NDWI for flood detection</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">❌ {error}</p>
              </div>
            )}

            {/* Processing Results */}
            {result && (
              <>
                {/* Metadata Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">✅ Processing Complete!</h2>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Tiles Created</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {result.metadata.num_tiles}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tile Size</p>
                      <p className="text-2xl font-bold text-green-600">
                        {result.metadata.tile_size}×{result.metadata.tile_size}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Overlap</p>
                      <p className="text-lg font-semibold">{result.metadata.overlap}px</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Method</p>
                      <p className="text-lg font-semibold capitalize">{result.metadata.normalize_method}</p>
                    </div>
                  </div>
                </div>

                {/* Tile Preview Grid */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">🖼️ Tile Preview (first 9)</h2>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTiles.map((filename, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={`${API_URL}/api/preprocess/tile/${filename}`}
                          alt={`Tile ${idx + 1}`}
                          className="w-full h-auto rounded border border-gray-300 hover:border-blue-500 transition-colors"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-semibold">
                            Tile {idx + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {result.metadata.num_tiles > 9 && (
                    <p className="text-sm text-gray-500 mt-4 text-center">
                      + {result.metadata.num_tiles - 9} more tiles
                    </p>
                  )}
                </div>

                {/* Tile Details */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">📋 Tile Details</h2>
                  
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Position</th>
                          <th className="px-3 py-2 text-left">Coverage</th>
                          <th className="px-3 py-2 text-left">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.tiles.map((tile, idx) => (
                          <tr key={idx} className="border-t border-gray-200">
                            <td className="px-3 py-2">
                              Row {tile.position[0]}, Col {tile.position[1]}
                            </td>
                            <td className="px-3 py-2">
                              {(tile.coverage * 100).toFixed(1)}%
                            </td>
                            <td className="px-3 py-2">
                              {tile.bbox[2]}×{tile.bbox[3]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Welcome Message */}
            {!result && !error && !loading && (
              <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <div className="text-6xl mb-4">🔧</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Ready to Process
                </h3>
                <p className="text-gray-500">
                  Select an image and click "Process Image" to start
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
