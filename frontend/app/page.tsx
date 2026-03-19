'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

interface SystemStatus {
  backend: string
  satellite_api: string
  preprocessing: string
  flood_detection: string
  deep_learning: string
  processed_tiles: number
  flood_analyses: number
  version: string
  week: number
}

const modules = [
  {
    week: 2,
    icon: '🛰️',
    title: 'Satellite Imagery',
    description: 'Fetch real-time Sentinel-2 imagery for any city worldwide',
    href: '/satellite',
    color: 'from-blue-600/20 to-blue-900/10',
    border: 'border-blue-500/20',
    badge: 'badge-blue',
    btnColor: 'from-blue-600 to-blue-700',
    glow: 'hover:glow-blue',
    tag: 'Week 2',
  },
  {
    week: 3,
    icon: '⚙️',
    title: 'Image Preprocessing',
    description: 'Tile, normalize and extract spectral bands from satellite data',
    href: '/preprocess',
    color: 'from-emerald-600/20 to-emerald-900/10',
    border: 'border-emerald-500/20',
    badge: 'badge-green',
    btnColor: 'from-emerald-600 to-emerald-700',
    glow: 'hover:glow-green',
    tag: 'Week 3',
  },
  {
    week: 4,
    icon: '💧',
    title: 'Flood Detection',
    description: 'NDWI-based water body detection and flood extent mapping',
    href: '/flood',
    color: 'from-cyan-600/20 to-cyan-900/10',
    border: 'border-cyan-500/20',
    badge: 'badge-cyan',
    btnColor: 'from-cyan-600 to-cyan-700',
    glow: 'hover:glow-cyan',
    tag: 'Week 4',
  },
  {
    week: 5,
    icon: '🧠',
    title: 'Deep Learning Model',
    description: 'U-Net flood segmentation — train a model and run predictions',
    href: '/model',
    color: 'from-purple-600/20 to-purple-900/10',
    border: 'border-purple-500/20',
    badge: 'badge-purple',
    btnColor: 'from-purple-600 to-violet-700',
    glow: 'hover:glow-purple',
    tag: 'Week 5',
  },
  {
    week: 6,
    icon: '⚠️',
    title: 'Alert System',
    description: 'Automated risk classification and emergency alert dashboard',
    href: '/alerts',
    color: 'from-orange-600/20 to-red-900/10',
    border: 'border-orange-500/20',
    badge: 'badge-orange',
    btnColor: 'from-orange-600 to-red-700',
    glow: 'hover:glow-orange',
    tag: 'Weeks 6-8',
  },
]

const weeks = [
  { n: 1, label: 'Foundation & Architecture', done: true },
  { n: 2, label: 'Satellite API Integration', done: true },
  { n: 3, label: 'Image Preprocessing Pipeline', done: true },
  { n: 4, label: 'NDWI Flood Detection', done: true },
  { n: 5, label: 'U-Net Deep Learning Model', done: true },
  { n: '6–8', label: 'Alert System & Risk Mapping', done: true },
  { n: '9–12', label: 'Multi-Hazard Detection', done: false },
  { n: '13–16', label: 'Deployment & Optimisation', done: false },
]

export default function Home() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await axios.get(`${API_URL}/api/status`)
      setStatus(res.data)
    } catch {
      setError('Backend offline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const statusItems = status ? [
    { label: 'Backend', value: status.backend, ok: status.backend === 'operational' },
    { label: 'Satellite API', value: status.satellite_api, ok: status.satellite_api === 'configured' },
    { label: 'Preprocessing', value: status.preprocessing, ok: status.preprocessing === 'active' },
    { label: 'Flood Detection', value: status.flood_detection, ok: status.flood_detection === 'active' },
    { label: 'Deep Learning', value: status.deep_learning, ok: ['trained','active'].includes(status.deep_learning) },
  ] : []

  return (
    <main className="min-h-screen grid-bg text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* ── Hero ── */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium badge-blue mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            Version {status?.version ?? '6.0.0'} · Week {status?.week ?? 8} of 16
          </div>
          <h1 className="text-6xl sm:text-7xl font-extrabold mb-5 tracking-tight gradient-text leading-tight">
            Terra-Form
          </h1>
          <p className="text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
            AI-driven satellite intelligence for real-time disaster detection, flood mapping, and emergency response planning.
          </p>

          {/* Quick stats */}
          {status && (
            <div className="flex items-center justify-center gap-8 mt-10">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{status.processed_tiles}</p>
                <p className="text-xs text-gray-500 mt-1">Tiles Processed</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <p className="text-3xl font-bold text-cyan-400">{status.flood_analyses}</p>
                <p className="text-xs text-gray-500 mt-1">Flood Analyses</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">6</p>
                <p className="text-xs text-gray-500 mt-1">Modules Active</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-400">7.8M</p>
                <p className="text-xs text-gray-500 mt-1">Model Parameters</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Module Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
          {modules.map((m) => (
            <a
              key={m.week}
              href={m.href}
              className={`group glass rounded-2xl p-6 border ${m.border} bg-gradient-to-br ${m.color} ${m.glow} transition-all duration-300 hover:-translate-y-1 hover:border-opacity-50`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-3xl">{m.icon}</div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.badge}`}>{m.tag}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1.5">{m.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">{m.description}</p>
              <div className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r ${m.btnColor} text-white group-hover:opacity-90 transition-opacity`}>
                Open Module
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </a>
          ))}
        </div>

        {/* ── Bottom Row: System Status + Progress ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* System Status */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">System Status</h2>
              {loading ? (
                <span className="text-xs text-gray-500">Checking...</span>
              ) : error ? (
                <span className="text-xs text-red-400">{error}</span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  All systems operational
                </span>
              )}
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Connecting to backend...
              </div>
            )}

            {error && (
              <div className="flex items-center justify-between rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-sm text-red-400">Backend not reachable on port 8000</p>
                <button onClick={fetchStatus} className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors">
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-3">
                {statusItems.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{s.label}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.ok ? 'badge-green' : 'badge-gray'}`}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Timeline */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <h2 className="text-base font-semibold text-white mb-5">Project Timeline</h2>
            <div className="space-y-3">
              {weeks.map((w) => (
                <div key={String(w.n)} className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    w.done
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-700/50 text-gray-500 border border-gray-600/30'
                  }`}>
                    {w.done ? '✓' : '·'}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className={`text-sm ${w.done ? 'text-gray-200' : 'text-gray-500'}`}>{w.label}</span>
                    <span className={`text-xs ${w.done ? 'badge-green' : 'badge-gray'} px-2 py-0.5 rounded-full`}>
                      {w.done ? `Wk ${w.n}` : `Wk ${w.n}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Overall Progress</span>
                <span className="text-emerald-400 font-medium">8 / 16 weeks</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}

