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
    <main className="min-h-screen grid-bg text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <a href="/" className="hover:text-gray-300 transition-colors">Home</a>
            <span>/</span>
            <span className="text-gray-300">Flood Detection</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xl">💧</div>
            <div>
              <h1 className="text-3xl font-bold text-white">Flood Detection</h1>
              <p className="text-sm text-gray-500">NDWI water body analysis · Week 4</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'single', label: 'Single Image Analysis', icon: '🔍' },
            { id: 'compare', label: 'Before / After Comparison', icon: '⚖️' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'single' | 'compare')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Controls */}
          <div className="lg:col-span-2 space-y-5">

            {activeTab === 'single' ? (
              <>
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Select Image</h2>
                  {images.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 mb-3">No satellite images found</p>
                      <a href="/satellite" className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2">Download satellite images first →</a>
                    </div>
                  ) : (
                    <select
                      value={selectedImage}
                      onChange={(e) => setSelectedImage(e.target.value)}
                      className="input-dark"
                    >
                      {images.map((img) => (
                        <option key={img.filename} value={img.filename}>{img.filename} ({img.size_mb} MB)</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Detection Settings</h2>
                  <label className="block text-xs text-gray-400 mb-1.5">NDWI Threshold: <span className="text-white font-mono">{threshold.toFixed(2)}</span></label>
                  <input type="range" min="0" max="0.8" step="0.05" value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-cyan-500" />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Strict</span><span>Default</span><span>Lenient</span>
                  </div>
                  <button onClick={handleDetectFlood} disabled={loading || !selectedImage} className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
                    {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Analyzing...</> : '🚀 Detect Flood'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Select Images</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Before Flood</label>
                      <select value={beforeImage} onChange={(e) => setBeforeImage(e.target.value)} className="input-dark">
                        {images.map((img) => <option key={img.filename} value={img.filename}>{img.filename}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">After Flood</label>
                      <select value={afterImage} onChange={(e) => setAfterImage(e.target.value)} className="input-dark">
                        {images.map((img) => <option key={img.filename} value={img.filename}>{img.filename}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">NDWI Threshold: <span className="text-white font-mono">{threshold.toFixed(2)}</span></label>
                      <input type="range" min="0" max="0.8" step="0.05" value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))} className="w-full accent-cyan-500" />
                    </div>
                    <button onClick={handleCompareFlood} disabled={loading || !beforeImage || !afterImage} className="btn-primary w-full flex items-center justify-center gap-2">
                      {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Comparing...</> : '⚖️ Compare Flood Extent'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* NDWI info */}
            <div className="glass rounded-2xl p-5 border border-cyan-500/10">
              <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">How NDWI Works</h3>
              <p className="text-xs font-mono text-cyan-300 mb-3 bg-cyan-500/5 rounded p-2">NDWI = (Green − NIR) / (Green + NIR)</p>
              <div className="space-y-1.5 text-xs text-gray-400">
                <p>• Values &gt; 0.3 → water present</p>
                <p>• Higher values → more confident detection</p>
                <p>• Negative values → vegetation or dry land</p>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-3 space-y-5">

            {error && (
              <div className="glass rounded-xl p-4 border border-red-500/20 bg-red-500/5">
                <p className="text-sm text-red-400">⚠️ {error}</p>
              </div>
            )}

            {activeTab === 'single' && floodResult && (
              <>
                {/* Stats */}
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Flood Statistics</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Water Detected', value: `${floodResult.statistics.water_area_km2.toFixed(2)} km²`, color: 'text-cyan-400' },
                      { label: 'Area Coverage', value: `${floodResult.statistics.water_percentage.toFixed(1)}%`, color: 'text-blue-400' },
                      { label: 'Water Pixels', value: floodResult.statistics.water_pixels.toLocaleString(), color: 'text-purple-400' },
                      { label: 'Avg NDWI', value: floodResult.statistics.ndwi_mean?.toFixed(3) || 'N/A', color: 'text-emerald-400' },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl bg-white/3 border border-white/5 p-4">
                        <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visualizations */}
                {floodResult.saved_files && (
                  <div className="glass rounded-2xl p-5 border border-white/5">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Visualizations</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Flood Heatmap', key: floodResult.saved_files.heatmap },
                        { label: 'Water Overlay', key: floodResult.saved_files.overlay },
                      ].map(v => (
                        <div key={v.label}>
                          <p className="text-xs text-gray-400 mb-2">{v.label}</p>
                          <img src={`${API_URL}/api/flood/results/${v.key}`} alt={v.label} className="w-full rounded-lg border border-white/10" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'compare' && comparisonResult && (
              <>
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Change Analysis</h2>
                  <div className={`rounded-xl p-4 mb-4 border ${comparisonResult.interpretation.flood_increased ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <p className={`text-sm font-semibold ${comparisonResult.interpretation.flood_increased ? 'text-red-300' : 'text-emerald-300'}`}>
                      {comparisonResult.interpretation.flood_increased ? '⚠️ Flood Increased' : '✅ Water Decreased'}
                    </p>
                    <p className="text-3xl font-bold text-white mt-1">{Math.abs(comparisonResult.interpretation.net_change_km2).toFixed(2)} km²</p>
                    <p className="text-xs text-gray-400 mt-1">{comparisonResult.interpretation.increase_percentage?.toFixed(1)}% change</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Before', value: `${comparisonResult.before_statistics.water_area_km2.toFixed(2)} km²`, color: 'text-blue-400' },
                      { label: 'After', value: `${comparisonResult.after_statistics.water_area_km2.toFixed(2)} km²`, color: 'text-red-400' },
                      { label: 'New Flood', value: `${comparisonResult.comparison.new_flood_km2.toFixed(2)} km²`, color: 'text-red-400' },
                      { label: 'Receded', value: `${comparisonResult.comparison.receded_water_km2.toFixed(2)} km²`, color: 'text-emerald-400' },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl bg-white/3 border border-white/5 p-4">
                        <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Change Detection Map</h2>
                  <img src={`${API_URL}/api/flood/results/${comparisonResult.change_map}`} alt="Change map" className="w-full rounded-lg border border-white/10 mb-4" />
                  <div className="flex gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500"></div>New Flood</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500"></div>Permanent Water</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-yellow-400"></div>Receded</div>
                  </div>
                </div>
              </>
            )}

            {!floodResult && !comparisonResult && !error && !loading && (
              <div className="glass rounded-2xl border border-dashed border-white/10 p-16 text-center">
                <div className="text-5xl mb-4 opacity-30">💧</div>
                <p className="text-sm text-gray-500">Select an image and run analysis to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
