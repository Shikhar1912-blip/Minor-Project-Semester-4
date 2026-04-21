'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'

interface CompareMode {
  id: string
  label: string
  url: string
}

interface CityStats {
  water_pixels: number
  total_pixels: number
  water_percentage: number
  water_area_km2: number
}

interface CompareCity {
  city: string
  key: string
  satellite_url: string
  modes: CompareMode[]
  stats: CityStats
}

export default function ComparePage() {
  const [cities, setCities] = useState<CompareCity[]>([])
  const [selectedCity, setSelectedCity] = useState<CompareCity | null>(null)
  const [selectedMode, setSelectedMode] = useState<string>('overlay')
  const [loading, setLoading] = useState(true)
  const [sliderPos, setSliderPos] = useState(50) // percentage 0-100
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchCities()
  }, [])

  const fetchCities = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/api/compare/cities`)
      const data: CompareCity[] = res.data.cities || []
      setCities(data)
      if (data.length > 0) {
        setSelectedCity(data[0])
        if (data[0].modes.length > 0) {
          setSelectedMode(data[0].modes[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch compare cities:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCityChange = (key: string) => {
    const city = cities.find(c => c.key === key)
    if (city) {
      setSelectedCity(city)
      setSliderPos(50)
      if (city.modes.length > 0) {
        // keep current mode if available, otherwise pick first
        const hasCurrentMode = city.modes.some(m => m.id === selectedMode)
        if (!hasCurrentMode) setSelectedMode(city.modes[0].id)
      }
    }
  }

  const getAfterUrl = (): string => {
    if (!selectedCity) return ''
    const mode = selectedCity.modes.find(m => m.id === selectedMode)
    return mode ? `${API_URL}${mode.url}` : ''
  }

  const getBeforeUrl = (): string => {
    if (!selectedCity) return ''
    return `${API_URL}${selectedCity.satellite_url}`
  }

  // ─── Drag handling ───
  const handlePointerDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setSliderPos(pct)
    },
    [isDragging]
  )

  // Also handle click-to-move (without dragging)
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setSliderPos(pct)
    },
    []
  )

  const modeColors: Record<string, string> = {
    overlay: 'from-cyan-500 to-blue-600',
    heatmap: 'from-orange-500 to-red-600',
    ndwi: 'from-emerald-500 to-teal-600',
  }

  const modeIcons: Record<string, string> = {
    overlay: '🌊',
    heatmap: '🔥',
    ndwi: '📊',
  }

  return (
    <main className="min-h-screen grid-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <a href="/" className="hover:text-gray-300 transition-colors">Home</a>
            <span>/</span>
            <span className="text-gray-300">Compare</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xl">🔄</div>
            <div>
              <h1 className="text-3xl font-bold text-white">Before vs. After</h1>
              <p className="text-sm text-gray-500">Interactive satellite imagery comparison</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-400">Loading comparison data...</p>
            </div>
          </div>
        ) : cities.length === 0 ? (
          <div className="glass rounded-2xl border border-dashed border-white/10 p-16 text-center">
            <div className="text-5xl mb-4 opacity-30">🛰️</div>
            <p className="text-sm text-gray-500 mb-3">No comparison data available yet.</p>
            <p className="text-xs text-gray-600">Run flood detection on satellite images first via the <a href="/flood" className="text-cyan-400 underline underline-offset-2">Flood Detection</a> page.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

            {/* ─── Left Panel: Controls ─── */}
            <div className="xl:col-span-1 space-y-5">

              {/* City Selector */}
              <div className="glass rounded-2xl p-5 border border-white/5">
                <h2 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 font-semibold">Select City</h2>
                <div className="space-y-1.5">
                  {cities.map(c => (
                    <button
                      key={c.key}
                      onClick={() => handleCityChange(c.key)}
                      className={`w-full px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        selectedCity?.key === c.key
                          ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{c.city}</span>
                        {c.stats?.water_percentage !== undefined && (
                          <span className="text-[10px] font-mono text-cyan-400/70">{c.stats.water_percentage}%</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Selector */}
              <div className="glass rounded-2xl p-5 border border-white/5">
                <h2 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 font-semibold">Comparison Mode</h2>
                <div className="space-y-1.5">
                  {selectedCity?.modes.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className={`w-full px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all flex items-center gap-2 ${
                        selectedMode === mode.id
                          ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                      }`}
                    >
                      <span>{modeIcons[mode.id] || '📄'}</span>
                      <span>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Flood Stats */}
              {selectedCity?.stats && Object.keys(selectedCity.stats).length > 0 && (
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 font-semibold">Flood Statistics</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Water Coverage</p>
                      <p className="text-2xl font-bold text-cyan-400">{selectedCity.stats.water_percentage}%</p>
                      <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                          style={{ width: `${Math.min(selectedCity.stats.water_percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white/3 border border-white/5 p-3">
                        <p className="text-[10px] text-gray-500 mb-0.5">Area</p>
                        <p className="text-sm font-bold text-white">{selectedCity.stats.water_area_km2} km²</p>
                      </div>
                      <div className="rounded-lg bg-white/3 border border-white/5 p-3">
                        <p className="text-[10px] text-gray-500 mb-0.5">Pixels</p>
                        <p className="text-sm font-bold text-white">{selectedCity.stats.water_pixels?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="glass rounded-2xl p-5 border border-violet-500/10">
                <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3">How to Use</h3>
                <div className="space-y-1.5 text-xs text-gray-400">
                  <p>• <strong className="text-gray-300">Drag</strong> the slider left/right to compare</p>
                  <p>• <strong className="text-gray-300">Click</strong> anywhere on the image to jump</p>
                  <p>• Switch cities and modes from the panel</p>
                  <p>• Left side = original satellite image</p>
                  <p>• Right side = flood detection result</p>
                </div>
              </div>
            </div>

            {/* ─── Right: Interactive Slider ─── */}
            <div className="xl:col-span-3">
              <div className="glass rounded-2xl border border-white/5 overflow-hidden">

                {/* Slider Header */}
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">{selectedCity?.city}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${modeColors[selectedMode] || 'from-gray-500 to-gray-600'} text-white`}>
                      {modeIcons[selectedMode]} {selectedCity?.modes.find(m => m.id === selectedMode)?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      Original Satellite
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      Flood Detection
                    </span>
                  </div>
                </div>

                {/* Slider Container */}
                <div
                  ref={containerRef}
                  className="relative w-full aspect-square cursor-col-resize select-none overflow-hidden bg-black"
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onPointerMove={handlePointerMove}
                  onClick={handleClick}
                  style={{ touchAction: 'none' }}
                >
                  {/* After image (full, under) */}
                  <img
                    src={getAfterUrl()}
                    alt="After - Flood Detection"
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                  />

                  {/* Before image (clipped by slider position) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <img
                      src={getBeforeUrl()}
                      alt="Before - Satellite"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ width: `${containerRef.current?.offsetWidth || 1000}px`, maxWidth: 'none' }}
                      draggable={false}
                    />
                  </div>

                  {/* Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 z-10"
                    style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                  >
                    {/* Vertical line */}
                    <div className="w-0.5 h-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.5)]" />

                    {/* Handle */}
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center cursor-grab active:cursor-grabbing"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M5 3L2 8L5 13" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M11 3L14 8L11 13" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">🛰️ Before</span>
                  </div>
                  <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
                    <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">{modeIcons[selectedMode]} After</span>
                  </div>

                  {/* Position percentage */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                    <span className="text-[10px] font-mono text-white/70">{Math.round(sliderPos)}%</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
