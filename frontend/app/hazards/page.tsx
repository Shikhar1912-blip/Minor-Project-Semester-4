'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface Breakdown {
  flood: { score: number; weight: number }
  elevation: { score: number; weight: number }
  proximity: { score: number; weight: number }
  population: { score: number; weight: number }
}

interface HazardResult {
  composite_score: number
  severity: string
  severity_color: string
  breakdown: Breakdown
  metadata: {
    water_percentage: number
    mask_filename: string | null
    location: string
    timestamp: string
  }
}

const CITIES = [
  'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore',
  'Hyderabad', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow',
  'New York', 'London', 'Tokyo', 'Sydney',
]

export default function HazardsPage() {
  const [result, setResult] = useState<HazardResult | null>(null)
  const [history, setHistory] = useState<HazardResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [waterPct, setWaterPct] = useState('')
  const [location, setLocation] = useState('')
  const [maskFile, setMaskFile] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/hazards/history?limit=20`)
      setHistory(res.data.history)
    } catch (err) {
      console.error(err)
    }
  }

  const handleScore = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await axios.post(`${API_URL}/api/hazards/score`, {
        water_percentage: parseFloat(waterPct),
        location: location || undefined,
        mask_filename: maskFile || undefined,
      })
      setResult(res.data)
      fetchHistory()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to calculate score')
    } finally {
      setLoading(false)
    }
  }

  const getGaugeRotation = (score: number) => {
    return (score / 100) * 180 - 90
  }

  const factorIcons: Record<string, string> = {
    flood: '🌊',
    elevation: '⛰️',
    proximity: '📍',
    population: '👥',
  }

  const factorLabels: Record<string, string> = {
    flood: 'Flood Risk',
    elevation: 'Elevation',
    proximity: 'Water Proximity',
    population: 'Population Density',
  }

  return (
    <main className="min-h-screen grid-bg text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <a href="/" className="hover:text-gray-300 transition-colors">Home</a>
              <span>/</span>
              <span className="text-gray-300">Multi-Hazard</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-xl">🔥</div>
              <div>
                <h1 className="text-3xl font-bold text-white">Hazard Risk Engine</h1>
                <p className="text-sm text-gray-500">Composite multi-factor risk scoring</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Input Form */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Calculate Risk Score</h2>
              <form onSubmit={handleScore} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Water Coverage (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={waterPct} onChange={e => setWaterPct(e.target.value)} placeholder="e.g. 22.5" className="input-dark w-full" required />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">City / Location</label>
                  <select value={location} onChange={e => setLocation(e.target.value)} className="input-dark w-full">
                    <option value="">Select city (optional)</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Mask Filename (optional)</label>
                  <input type="text" value={maskFile} onChange={e => setMaskFile(e.target.value)} placeholder="e.g. ndwi_water_mask.png" className="input-dark w-full" />
                </div>
                <button type="submit" disabled={loading} className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 font-medium text-sm transition-all disabled:opacity-50">
                  {loading ? 'Calculating...' : '🔥 Calculate Risk'}
                </button>
              </form>
              {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            </div>

            {/* Factor Weights */}
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Scoring Weights</h2>
              <div className="space-y-3">
                {[
                  { name: 'Flood Risk', weight: 40, color: 'bg-blue-500' },
                  { name: 'Elevation', weight: 20, color: 'bg-emerald-500' },
                  { name: 'Proximity', weight: 20, color: 'bg-yellow-500' },
                  { name: 'Population', weight: 20, color: 'bg-purple-500' },
                ].map(f => (
                  <div key={f.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">{f.name}</span>
                      <span className="text-gray-300 font-mono">{f.weight}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full rounded-full ${f.color}`} style={{ width: `${f.weight}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Risk Gauge + Breakdown */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Gauge */}
                <div className="glass rounded-2xl p-6 border border-white/5 flex flex-col items-center">
                  <div className="relative w-48 h-24 overflow-hidden mb-4">
                    {/* Gauge background */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 rounded-t-full border-[8px] border-white/10" style={{ borderBottom: 'none' }} />
                    {/* Gauge fill */}
                    <div
                      className="absolute bottom-0 left-1/2 w-1 h-20 origin-bottom transition-transform duration-1000"
                      style={{
                        transform: `rotate(${getGaugeRotation(result.composite_score)}deg)`,
                        backgroundColor: result.severity_color,
                        boxShadow: `0 0 12px ${result.severity_color}`,
                      }}
                    />
                    {/* Center dot */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg" />
                  </div>
                  <span className="text-5xl font-bold" style={{ color: result.severity_color }}>
                    {result.composite_score}
                  </span>
                  <span className="text-sm text-gray-400 mt-1">out of 100</span>
                  <span className="mt-2 px-3 py-1 rounded-full text-xs font-bold border" style={{ color: result.severity_color, borderColor: result.severity_color + '40', backgroundColor: result.severity_color + '15' }}>
                    {result.severity}
                  </span>
                </div>

                {/* Breakdown */}
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Factor Breakdown</h2>
                  <div className="space-y-4">
                    {Object.entries(result.breakdown).map(([key, val]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-gray-300 flex items-center gap-2">
                            {factorIcons[key]} {factorLabels[key]}
                          </span>
                          <span className="text-sm font-bold text-white">{val.score}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${val.score}%`,
                              backgroundColor: val.score > 75 ? '#ef4444' : val.score > 50 ? '#f97316' : val.score > 25 ? '#eab308' : '#22c55e',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="glass rounded-2xl p-8 border border-white/5 flex flex-col items-center justify-center h-64 text-gray-500">
                <span className="text-4xl mb-3 opacity-50">🔥</span>
                <p className="text-sm">Enter parameters to calculate a risk score</p>
              </div>
            )}
          </div>

          {/* Right: History */}
          <div>
            <div className="glass rounded-2xl border border-white/5 h-full flex flex-col min-h-[400px]">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Score History</h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[600px] space-y-3 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <span className="text-2xl mb-2 opacity-50">📊</span>
                    <span className="text-xs">No scores yet</span>
                  </div>
                ) : (
                  history.map((h, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold" style={{ color: h.severity_color }}>{h.composite_score}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: h.severity_color, backgroundColor: h.severity_color + '15', border: `1px solid ${h.severity_color}40` }}>
                          {h.severity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{h.metadata.location}</span>
                        <span>{h.metadata.water_percentage}%</span>
                      </div>
                      <div className="text-[10px] text-gray-600 mt-1">
                        {new Date(h.metadata.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
