'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface CityBreakdown {
  city: string
  key: string
  water_percentage: number
  water_area_km2: number
  water_pixels: number
  total_pixels: number
  risk: string
  affected_population: number
  has_overlay: boolean
  has_heatmap: boolean
}

interface Overview {
  cities_analyzed: number
  satellite_images: number
  satellite_size_mb: number
  processed_tiles: number
  flood_analyses: number
  total_water_km2: number
  total_affected_pop: number
  alert_count: number
  hazard_scores: number
  shelter_count: number
  model_trained: boolean
  model_size_mb: number
}

interface DashboardData {
  overview: Overview
  risk_distribution: Record<string, number>
  city_breakdown: CityBreakdown[]
  recent_alerts: any[]
}

const RISK_COLORS: Record<string, string> = {
  Low: '#22c55e',
  Moderate: '#eab308',
  High: '#f97316',
  Critical: '#ef4444',
}

const RISK_BG: Record<string, string> = {
  Low: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  Moderate: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
  High: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
  Critical: 'bg-red-500/15 border-red-500/30 text-red-400',
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/api/dashboard/stats`)
      setData(res.data)
    } catch (err) {
      console.error('Dashboard fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const overview = data?.overview
  const maxWaterPct = data?.city_breakdown?.length
    ? Math.max(...data.city_breakdown.map(c => c.water_percentage))
    : 1

  return (
    <main className="min-h-screen grid-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <a href="/" className="hover:text-gray-300 transition-colors">Home</a>
            <span>/</span>
            <span className="text-gray-300">Dashboard</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl">📊</div>
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500">System-wide statistics and flood intelligence</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-400">Loading analytics...</p>
            </div>
          </div>
        ) : !data ? (
          <div className="glass rounded-2xl border border-dashed border-white/10 p-16 text-center">
            <div className="text-5xl mb-4 opacity-30">📊</div>
            <p className="text-sm text-gray-500">Could not load dashboard data. Is the backend running?</p>
          </div>
        ) : (
          <>
            {/* ─── KPI Cards ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              {[
                { label: 'Cities Analyzed', value: overview?.cities_analyzed || 0, icon: '🏙️', color: 'text-blue-400' },
                { label: 'Est. Affected Pop', value: (overview?.total_affected_pop || 0).toLocaleString(), icon: '👥', color: 'text-rose-400' },
                { label: 'Total Flood Area', value: `${overview?.total_water_km2 || 0} km²`, icon: '🌊', color: 'text-orange-400' },
                { label: 'Satellite Images', value: overview?.satellite_images || 0, icon: '🛰️', color: 'text-cyan-400' },
                { label: 'Alerts Issued', value: overview?.alert_count || 0, icon: '⚠️', color: 'text-yellow-400' },
                { label: 'Shelters Mapped', value: overview?.shelter_count || 0, icon: '🏥', color: 'text-purple-400' },
              ].map(kpi => (
                <div key={kpi.label} className="glass rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="text-lg mb-1">{kpi.icon}</div>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

              {/* ─── Risk Distribution ─── */}
              <div className="glass rounded-2xl p-6 border border-white/5">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-5">Risk Distribution</h2>
                {Object.keys(data.risk_distribution).length === 0 ? (
                  <div className="text-center py-8 text-gray-600 text-sm">No risk data yet</div>
                ) : (
                  <div className="space-y-4">
                    {['Critical', 'High', 'Moderate', 'Low'].map(risk => {
                      const count = data.risk_distribution[risk] || 0
                      const total = data.city_breakdown.length || 1
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={risk}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[risk] }} />
                              <span className="text-sm text-gray-300">{risk}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{count}</span>
                              <span className="text-[10px] text-gray-500">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${pct}%`, backgroundColor: RISK_COLORS[risk] }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ─── System Health ─── */}
              <div className="glass rounded-2xl p-6 border border-white/5">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-5">System Health</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Sentinel-2 API', ok: (overview?.satellite_images || 0) > 0, detail: `${overview?.satellite_images} images (${overview?.satellite_size_mb} MB)` },
                    { label: 'Preprocessing', ok: (overview?.processed_tiles || 0) > 0, detail: `${overview?.processed_tiles} tiles` },
                    { label: 'Flood Detection', ok: (overview?.flood_analyses || 0) > 0, detail: `${overview?.flood_analyses} analyses` },
                    { label: 'U-Net Model', ok: overview?.model_trained, detail: overview?.model_trained ? `${overview?.model_size_mb} MB trained` : 'Not trained' },
                    { label: 'Alert System', ok: (overview?.alert_count || 0) > 0, detail: `${overview?.alert_count} alerts` },
                    { label: 'Evacuation', ok: (overview?.shelter_count || 0) > 0, detail: `${overview?.shelter_count} shelters` },
                  ].map(sys => (
                    <div key={sys.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sys.ok ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                        <span className="text-sm text-gray-300">{sys.label}</span>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sys.ok ? 'badge-green' : 'badge-gray'}`}>
                        {sys.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── Quick Actions ─── */}
              <div className="glass rounded-2xl p-6 border border-white/5">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-5">Quick Actions</h2>
                <div className="space-y-2.5">
                  {[
                    { label: 'Download Satellite Imagery', href: '/satellite', icon: '🛰️', color: 'from-blue-600 to-blue-700' },
                    { label: 'Run Flood Detection', href: '/flood', icon: '💧', color: 'from-cyan-600 to-cyan-700' },
                    { label: 'View Hazard Scores', href: '/hazards', icon: '🔥', color: 'from-red-600 to-orange-600' },
                    { label: 'Open 3D Terrain Map', href: '/map', icon: '🗺️', color: 'from-emerald-600 to-teal-700' },
                    { label: 'Before vs After', href: '/compare', icon: '🔄', color: 'from-violet-600 to-purple-700' },
                  ].map(action => (
                    <a
                      key={action.label}
                      href={action.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r ${action.color} hover:opacity-90 transition-opacity text-white text-sm font-medium`}
                    >
                      <span>{action.icon}</span>
                      <span>{action.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── City Breakdown Table ─── */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">City-by-City Flood Analysis</h2>
                <span className="text-[10px] text-gray-500">{data.city_breakdown.length} cities analyzed</span>
              </div>

              {data.city_breakdown.length === 0 ? (
                <div className="text-center py-12 text-gray-600 text-sm">
                  No flood analysis data yet. Run flood detection from the <a href="/flood" className="text-cyan-400 underline underline-offset-2">Flood Detection</a> page.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-wider">
                        <th className="text-left px-6 py-3 font-semibold">City</th>
                        <th className="text-left px-4 py-3 font-semibold">Risk Level</th>
                        <th className="text-right px-4 py-3 font-semibold">Water %</th>
                        <th className="text-right px-4 py-3 font-semibold">Area (km²)</th>
                        <th className="text-right px-4 py-3 font-semibold">Est. Pop</th>
                        <th className="text-left px-4 py-3 font-semibold min-w-[200px]">Flood Extent</th>
                        <th className="text-center px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.city_breakdown.map((city, i) => (
                        <tr key={city.key} className={`border-b border-white/3 hover:bg-white/3 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                          <td className="px-6 py-3">
                            <span className="font-semibold text-white">{city.city}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${RISK_BG[city.risk]}`}>
                              {city.risk}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono font-bold" style={{ color: RISK_COLORS[city.risk] }}>
                              {city.water_percentage}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-gray-300">{city.water_area_km2}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-rose-300">{city.affected_population?.toLocaleString() || 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{
                                    width: `${(city.water_percentage / maxWaterPct) * 100}%`,
                                    backgroundColor: RISK_COLORS[city.risk],
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <a href="/compare" className="text-[10px] px-2 py-1 rounded-md bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors">Compare</a>
                              <a href="/map" className="text-[10px] px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors">Map</a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
