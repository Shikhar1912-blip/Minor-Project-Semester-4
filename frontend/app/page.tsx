'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

interface ApiResponse {
  message: string
  status: string
  data?: {
    project: string
    description: string
    week: number
    phase: string
  }
}

interface SystemStatus {
  backend: string
  ai_model: string
  satellite_api: string
  preprocessing: string
  flood_detection: string
  processed_tiles: number
  flood_analyses: number
  version: string
  week: number
}

export default function Home() {
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch hello world endpoint
      const helloResponse = await axios.get(`${API_URL}/api/hello`)
      setApiResponse(helloResponse.data)

      // Fetch system status
      const statusResponse = await axios.get(`${API_URL}/api/status`)
      setSystemStatus(statusResponse.data)

      setLoading(false)
    } catch (err) {
      setError('Failed to connect to backend. Make sure FastAPI is running on port 8000.')
      setLoading(false)
      console.error('Error fetching data:', err)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-terra-dark via-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-terra-blue via-terra-green to-blue-400 bg-clip-text text-transparent">
            Terra-Form
          </h1>
          <p className="text-xl text-gray-300">
            AI-Driven Disaster Response Planning System
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Week 4: NDWI-Based Flood Detection 💧
          </p>
        </div>

        {/* Week 2, 3 & 4: Navigation Cards */}
        <div className="max-w-4xl mx-auto mb-8 space-y-4">
          {/* Week 2 Card */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold mb-2">🛰️ Satellite Imagery Module</h2>
                <p className="text-gray-300">Download real-time satellite images from Sentinel-2</p>
              </div>
              <a
                href="/satellite"
                className="bg-gradient-to-r from-terra-blue to-blue-600 hover:from-blue-600 hover:to-terra-blue px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Launch →
              </a>
            </div>
          </div>

          {/* Week 3 Card */}
          <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-green-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold mb-2">🔧 Image Pre-processing</h2>
                <p className="text-gray-300">Tile, normalize, and extract bands from satellite imagery</p>
              </div>
              <a
                href="/preprocess"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-emerald-600 hover:to-green-600 px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Launch →
              </a>
            </div>
          </div>

          {/* Week 4 Card */}
          <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-cyan-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold mb-2">💧 Flood Detection</h2>
                <p className="text-gray-300">NDWI-based water body detection and flood extent analysis</p>
              </div>
              <a
                href="/flood"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-blue-600 hover:to-cyan-600 px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Launch →
              </a>
            </div>
          </div>
        </div>

        {/* Connection Status Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-semibold mb-6 flex items-center">
              <span className="mr-3">🔗</span>
              Frontend-Backend Connection Test
            </h2>

            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-terra-blue"></div>
                <p className="mt-4 text-gray-400">Connecting to backend...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-6 mb-6">
                <p className="text-red-300 flex items-center">
                  <span className="mr-2">❌</span>
                  {error}
                </p>
                <button
                  onClick={fetchData}
                  className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {apiResponse && systemStatus && (
              <div className="space-y-6">
                {/* Success Message */}
                <div className="bg-green-900/30 border border-green-500 rounded-lg p-6">
                  <p className="text-green-300 flex items-center text-lg font-semibold">
                    <span className="mr-2">✅</span>
                    Connection Successful!
                  </p>
                  <p className="text-gray-300 mt-2">{apiResponse.message}</p>
                </div>

                {/* Project Info */}
                {apiResponse.data && (
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-4 text-blue-300">
                      📋 Project Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Project Name</p>
                        <p className="text-white font-medium">{apiResponse.data.project}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Current Week</p>
                        <p className="text-white font-medium">Week {apiResponse.data.week}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-gray-400 text-sm">Description</p>
                        <p className="text-white font-medium">{apiResponse.data.description}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-gray-400 text-sm">Current Phase</p>
                        <p className="text-white font-medium">{apiResponse.data.phase}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Status */}
                <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-purple-300">
                    ⚙️ System Status
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Backend</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        systemStatus.backend === 'operational' 
                          ? 'bg-green-900/50 text-green-300' 
                          : 'bg-red-900/50 text-red-300'
                      }`}>
                        {systemStatus.backend}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">AI Model</span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-700 text-gray-300">
                        {systemStatus.ai_model}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Satellite API</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        systemStatus.satellite_api === 'configured' 
                          ? 'bg-green-900/50 text-green-300' 
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {systemStatus.satellite_api}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Pre-processing</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        systemStatus.preprocessing === 'active' 
                          ? 'bg-green-900/50 text-green-300' 
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {systemStatus.preprocessing} {systemStatus.processed_tiles > 0 ? `(${systemStatus.processed_tiles})` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Flood Detection</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        systemStatus.flood_detection === 'active' 
                          ? 'bg-cyan-900/50 text-cyan-300' 
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {systemStatus.flood_detection} {systemStatus.flood_analyses > 0 ? `(${systemStatus.flood_analyses})` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Version</span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-900/50 text-blue-300">
                        v{systemStatus.version}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Current Week</span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-900/50 text-purple-300">
                        Week {systemStatus.week}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Refresh Button */}
                <div className="text-center">
                  <button
                    onClick={fetchData}
                    className="bg-gradient-to-r from-terra-blue to-blue-600 hover:from-blue-600 hover:to-terra-blue px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                  >
                    🔄 Refresh Connection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Week Progress */}
          <div className="mt-8 bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">📅 Project Progress</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-green-400 mr-2">✅</span>
                <span className="text-gray-300">Week 1: Foundation Complete</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-400 mr-2">✅</span>
                <span className="text-gray-300">Week 2: Satellite API Integration Complete</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-400 mr-2">✅</span>
                <span className="text-gray-300">Week 3: Image Pre-processing Complete</span>
              </div>
              <div className="flex items-center">
                <span className="text-blue-400 mr-2">🔄</span>
                <span className="text-gray-300 font-semibold">Week 4: NDWI Flood Detection (In Progress)</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">⏳</span>
                <span className="text-gray-500">Week 5-8: Deep Learning Models</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
