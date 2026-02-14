'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface ImageInfo {
  filename: string
  size_mb: number
  modified: string
}

interface FloodStatistics {
  total_pixels: number
  water_pixels: number
  land_pixels: number
  water_area_km2: number
  water_percentage: number
  ndwi_threshold: number
  ndwi_mean?: number
  ndwi_max?: number
}

interface FloodResult {
  status: string
  message: string
  statistics: FloodStatistics
  threshold_used: number
  saved_files?: {
    water_mask: string
    heatmap: string
    ndwi: string
    overlay: string
  }
}

interface ComparisonResult {
  status: string
  before_statistics: FloodStatistics
  after_statistics: FloodStatistics
  comparison: {
    new_flood_km2: number
    receded_water_km2: number
    flood_change_km2: number
    flood_increase_percentage: number
  }
  change_map: string
  interpretation: {
    flood_increased: boolean
    new_flood_area_km2: number
    net_change_km2: number
    increase_percentage: number
  }
}

export default function FloodDetectionPage() {
  const [images, setImages] = useState<ImageInfo[]>([])
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [beforeImage, setBeforeImage] = useState<string>('')
  const [afterImage, setAfterImage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [floodResult, setFloodResult] = useState<FloodResult | null>(null)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [threshold, setThreshold] = useState(0.3)
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchAvailableImages()
  }, [])

  const fetchAvailableImages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/preprocess/list-images`)
      setImages(response.data.images)
      if (response.data.images.length > 0) {
        setSelectedImage(response.data.images[0].filename)
        setBeforeImage(response.data.images[0].filename)
        if (response.data.images.length > 1) {
          setAfterImage(response.data.images[1].filename)
        }
      }
    } catch (err) {
      console.error('Failed to fetch images:', err)
      setError('Failed to load images')
    }
  }

  const handleDetectFlood = async () => {
    setLoading(true)
    setError(null)
    setFloodResult(null)

    try {
      const response = await axios.post(`${API_URL}/api/flood/detect`, {
        image_filename: selectedImage,
        ndwi_threshold: threshold,
        save_results: true
      })

      setFloodResult(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to detect flood')
    } finally {
      setLoading(false)
    }
  }

  const handleCompareFlood = async () => {
    setLoading(true)
    setError(null)
    setComparisonResult(null)

    try {
      const response = await axios.post(`${API_URL}/api/flood/compare`, {
        before_image: beforeImage,
        after_image: afterImage,
        ndwi_threshold: threshold
      })

      setComparisonResult(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to compare floods')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            💧 Flood Detection System
          </h1>
          <p className="text-gray-600">
            NDWI-based water body detection and flood extent analysis
          </p>
        </div>

        {/* Tab Selection */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'single'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🔍 Single Image Analysis
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'compare'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            ⚖️ Before/After Comparison
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Controls */}
          <div className="space-y-6">
            
            {activeTab === 'single' ? (
              // Single Image Analysis
              <>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">📁 Select Image</h2>
                  
                  {images.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No satellite images found</p>
                      <a href="/satellite" className="text-blue-600 hover:underline">
                        Download satellite images first →
                      </a>
                    </div>
                  ) : (
                    <select
                      value={selectedImage}
                      onChange={(e) => setSelectedImage(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      {images.map((img) => (
                        <option key={img.filename} value={img.filename}>
                          {img.filename} ({img.size_mb} MB)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">⚙️ Detection Settings</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NDWI Threshold: {threshold.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.8"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.0 (Strict)</span>
                      <span>0.3 (Default)</span>
                      <span>0.8 (Lenient)</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Higher values = More water detected (but may include moisture/wet soil)
                    </p>
                  </div>

                  <button
                    onClick={handleDetectFlood}
                    disabled={loading || !selectedImage}
                    className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
                  >
                    {loading ? '⏳ Analyzing...' : '🚀 Detect Flood'}
                  </button>
                </div>
              </>
            ) : (
              // Before/After Comparison
              <>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">📅 Select Images</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Before Flood
                      </label>
                      <select
                        value={beforeImage}
                        onChange={(e) => setBeforeImage(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      >
                        {images.map((img) => (
                          <option key={img.filename} value={img.filename}>
                            {img.filename}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        After Flood
                      </label>
                      <select
                        value={afterImage}
                        onChange={(e) => setAfterImage(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      >
                        {images.map((img) => (
                          <option key={img.filename} value={img.filename}>
                            {img.filename}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">⚙️ Comparison Settings</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NDWI Threshold: {threshold.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.8"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <button
                    onClick={handleCompareFlood}
                    disabled={loading || !beforeImage || !afterImage}
                    className="w-full mt-6 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-semibold"
                  >
                    {loading ? '⏳ Comparing...' : '⚖️ Compare Flood Extent'}
                  </button>
                </div>
              </>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 How NDWI Works</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>📡 <strong>NDWI = (Green - NIR) / (Green + NIR)</strong></li>
                <li>💧 Values &gt; 0.3 indicate water presence</li>
                <li>🌊 Higher values = more confident water detection</li>
                <li>🌿 Negative values = vegetation or dry land</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">❌ {error}</p>
              </div>
            )}

            {activeTab === 'single' && floodResult && (
              <>
                {/* Statistics Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">📊 Flood Statistics</h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Water Detected</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {floodResult.statistics.water_area_km2.toFixed(2)} km²
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Coverage</p>
                      <p className="text-3xl font-bold text-green-600">
                        {floodResult.statistics.water_percentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Water Pixels</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {floodResult.statistics.water_pixels.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Avg NDWI</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {floodResult.statistics.ndwi_mean?.toFixed(3) || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visualization */}
                {floodResult.saved_files && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">🗺️ Visualization</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Flood Heatmap</p>
                        <img
                          src={`${API_URL}/api/flood/results/${floodResult.saved_files.heatmap}`}
                          alt="Flood heatmap"
                          className="w-full rounded border border-gray-300"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Water Overlay</p>
                        <img
                          src={`${API_URL}/api/flood/results/${floodResult.saved_files.overlay}`}
                          alt="Water overlay"
                          className="w-full rounded border border-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'compare' && comparisonResult && (
              <>
                {/* Comparison Summary */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">📈 Flood Change Analysis</h2>
                  
                  <div className={`p-4 rounded-lg mb-4 ${
                    comparisonResult.interpretation.flood_increased 
                      ? 'bg-red-50 border border-red-200' 
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <p className="text-lg font-semibold">
                      {comparisonResult.interpretation.flood_increased 
                        ? '⚠️ Flood Increased' 
                        : '✅ Water Decreased'}
                    </p>
                    <p className="text-2xl font-bold mt-2">
                      {Math.abs(comparisonResult.interpretation.net_change_km2).toFixed(2)} km²
                    </p>
                    <p className="text-sm text-gray-600">
                      {comparisonResult.interpretation.increase_percentage.toFixed(1)}% change
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Before</p>
                      <p className="text-xl font-bold text-blue-600">
                        {comparisonResult.before_statistics.water_area_km2.toFixed(2)} km²
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">After</p>
                      <p className="text-xl font-bold text-red-600">
                        {comparisonResult.after_statistics.water_area_km2.toFixed(2)} km²
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">New Flood</p>
                      <p className="text-xl font-bold text-red-600">
                        {comparisonResult.comparison.new_flood_km2.toFixed(2)} km²
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Receded</p>
                      <p className="text-xl font-bold text-green-600">
                        {comparisonResult.comparison.receded_water_km2.toFixed(2)} km²
                      </p>
                    </div>
                  </div>
                </div>

                {/* Change Map */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">🗺️ Change Detection Map</h2>
                  
                  <img
                    src={`${API_URL}/api/flood/results/${comparisonResult.change_map}`}
                    alt="Change map"
                    className="w-full rounded border border-gray-300 mb-4"
                  />

                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                      <span>New Flood</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded mr-2" style={{backgroundColor: 'rgb(0, 100, 255)'}}></div>
                      <span>Permanent Water</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-400 rounded mr-2"></div>
                      <span>Receded Water</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!floodResult && !comparisonResult && !error && !loading && (
              <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <div className="text-6xl mb-4">💧</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Ready to Detect Floods
                </h3>
                <p className="text-gray-500">
                  Select an image and click the button to start analysis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
