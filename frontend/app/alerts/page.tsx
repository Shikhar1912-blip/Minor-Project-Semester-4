'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface RiskLevel {
  label: string
  level: number
  color: string
  hex: string
  threshold_max: number
  description: string
}

interface Alert {
  id: string
  timestamp: string
  image_filename: string
  location: string
  analysis_type: string
  water_percentage: number
  water_area_km2: number | null
  risk_level: number
  risk_label: string
  risk_color: string
  risk_hex: string
  description: string
  recommended_action: string
}

interface Summary {
  total_alerts: number
  counts: {
    Low: number
    Moderate: number
    High: number
    Critical: number
  }
  most_recent: Alert | null
  last_critical: Alert | null
  risk_levels: RiskLevel[]
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quick classify state
  const [testPct, setTestPct] = useState<string>('')
  const [testResult, setTestResult] = useState<any>(null)
  const [isClassifying, setIsClassifying] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const fetchData = async () => {
    try {
      setLoading(true)
      const [alertsRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/api/alerts/list?limit=100`),
        axios.get(`${API_URL}/api/alerts/summary`)
      ])
      setAlerts(alertsRes.data.alerts)
      setSummary(summaryRes.data)
      setError(null)
    } catch (err) {
      setError('Failed to load alert data. Is the backend running?')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleQuickClassify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testPct) return

    setIsClassifying(true)
    try {
      const res = await axios.post(`${API_URL}/api/alerts/classify`, {
        water_percentage: parseFloat(testPct)
      })
      setTestResult(res.data.risk)
    } catch (err) {
      console.error(err)
    } finally {
      setIsClassifying(false)
    }
  }

  const clearAlerts = async () => {
    if (!window.confirm('Are you sure you want to clear all alert history?')) return
    try {
      await axios.delete(`${API_URL}/api/alerts/clear`)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const getBadgeClass = (color: string) => {
    switch (color) {
      case 'green': return 'badge-green'
      case 'yellow': return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
      case 'orange': return 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
      case 'red': return 'bg-red-500/15 text-red-400 border border-red-500/30'
      default: return 'badge-gray'
    }
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
              <span className="text-gray-300">Alert System</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl">⚠️</div>
              <div>
                <h1 className="text-3xl font-bold text-white">Risk Dashboard</h1>
                <p className="text-sm text-gray-500">Automated flood classification & alerts</p>
              </div>
            </div>
          </div>
          <button 
            onClick={fetchData}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors flex items-center gap-2 border border-white/5"
          >
            🔄 Refresh Data
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-5 border border-white/5 flex flex-col justify-center items-center text-center">
            <span className="text-xs text-gray-400 uppercase tracking-wider mb-2">Total Alerts</span>
            <span className="text-4xl font-bold text-white">{summary?.total_alerts || 0}</span>
          </div>
          <div className="glass rounded-xl p-5 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent flex flex-col justify-center items-center text-center">
            <span className="text-xs text-yellow-500/70 uppercase tracking-wider mb-2">Moderate</span>
            <span className="text-4xl font-bold text-yellow-400">{summary?.counts.Moderate || 0}</span>
          </div>
          <div className="glass rounded-xl p-5 border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent flex flex-col justify-center items-center text-center">
            <span className="text-xs text-orange-500/70 uppercase tracking-wider mb-2">High Risk</span>
            <span className="text-4xl font-bold text-orange-400">{summary?.counts.High || 0}</span>
          </div>
          <div className="glass rounded-xl p-5 border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent flex flex-col justify-center items-center text-center">
            <span className="text-xs text-red-500/70 uppercase tracking-wider mb-2">Critical</span>
            <span className="text-4xl font-bold text-red-500">{summary?.counts.Critical || 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="space-y-6">
            
            {/* Quick Classify Widget */}
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Quick Classify</h2>
              <p className="text-xs text-gray-500 mb-4 flex-1">
                Enter a hypothetical water coverage percentage to test the risk engine.
              </p>
              
              <form onSubmit={handleQuickClassify} className="flex gap-2 mb-4">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={testPct}
                  onChange={(e) => setTestPct(e.target.value)}
                  placeholder="e.g. 18.5"
                  className="input-dark flex-1"
                  required
                />
                <button 
                  type="submit" 
                  disabled={isClassifying}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isClassifying ? '...' : 'Test'}
                </button>
              </form>

              {testResult && (
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Result for {testResult.water_percentage}%</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getBadgeClass(testResult.color)}`}>
                      {testResult.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {testResult.description}
                  </p>
                  <p className="text-xs text-emerald-400 mt-2">
                    Action: {testResult.recommended_action}
                  </p>
                </div>
              )}
            </div>

            {/* Threshold Legend */}
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Risk Thresholds</h2>
              <div className="space-y-3">
                {summary?.risk_levels.map((t, idx) => (
                  <div key={t.level} className="flex items-center gap-3">
                    <div className="w-2 h-10 rounded-full" style={{ backgroundColor: t.hex }}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{t.label}</span>
                        <span className="text-xs text-gray-400 font-mono">
                          {idx === 0 ? '< ' : `${summary.risk_levels[idx-1].threshold_max} - `}{t.threshold_max}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{t.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Alert Feed */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl border border-white/5 h-full flex flex-col min-h-[500px]">
              
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Live Alert Log</h2>
                </div>
                <button 
                  onClick={clearAlerts}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear History
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto max-h-[700px] space-y-4 pr-3 custom-scrollbar">
                {loading && alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                    <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin mb-3"></div>
                    <span className="text-sm">Loading alerts...</span>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                    <span className="text-3xl mb-2 opacity-50">✅</span>
                    <span className="text-sm">No active alerts. Systems normal.</span>
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div 
                      key={alert.id}
                      className="group relative p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: alert.risk_hex }}></div>
                      
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeClass(alert.risk_color)}`}>
                            {alert.risk_label}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-black/30 text-gray-400 uppercase tracking-wide">
                          {alert.analysis_type}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-baseline gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white">
                            {alert.water_percentage}% Water Detected
                          </h3>
                          {alert.water_area_km2 && (
                            <span className="text-sm text-gray-400">({alert.water_area_km2} km²)</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 mb-3">{alert.description}</p>
                        
                        <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
                          <span className="text-gray-500 font-mono flex items-center gap-1.5 hover:text-gray-300 cursor-pointer">
                            <span>📄</span> {alert.image_filename}
                          </span>
                          <span className="text-emerald-400">
                            Action: {alert.recommended_action}
                          </span>
                        </div>
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
