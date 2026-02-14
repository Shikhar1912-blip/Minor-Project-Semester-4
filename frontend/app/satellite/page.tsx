'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface SatelliteMetadata {
  location: {
    latitude: number
    longitude: number
  }
  date_range: {
    start: string
    end: string
  }
  resolution_meters: number
  image_size: {
    width: number
    height: number
  }
}

export default function SatellitePage() {
  const [cityName, setCityName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<SatelliteMetadata | null>(null)
  const [availableCities, setAvailableCities] = useState<string[]>([])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const fetchAvailableCities = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/satellite/cities`)
      setAvailableCities(response.data.cities)
    } catch (err) {
      console.error('Failed to fetch cities:', err)
    }
  }

  // Load available cities on component mount
  useEffect(() => {
    fetchAvailableCities()
  }, [])

  const handleFetchImage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!cityName.trim()) {
      setError('Please enter a city name')
      return
    }

    setLoading(true)
    setError(null)
    setImageUrl(null)
    setMetadata(null)

    try {
      const response = await axios.post(`${API_URL}/api/satellite/fetch-city`, {
        city_name: cityName,
        days_before: 10
      })

      const downloadUrl = `${API_URL}${response.data.data.download_url}`
      setImageUrl(downloadUrl)
      setMetadata(response.data.data.metadata)
      setLoading(false)
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Failed to fetch satellite image. Make sure Sentinel Hub API is configured.'
      )
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-terra-dark via-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-terra-blue via-terra-green to-blue-400 bg-clip-text text-transparent">
            🛰️ Satellite Imagery
          </h1>
          <p className="text-gray-400 text-lg">
            Week 2: Sentinel-2 API Integration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input Form */}
          <div className="space-y-6">
            {/* Fetch Image Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <span className="mr-2">📍</span>
                Fetch Satellite Image
              </h2>

              <form onSubmit={handleFetchImage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City Name
                  </label>
                  <input
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="e.g., Delhi, Mumbai, New York"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-terra-blue text-white placeholder-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all transform ${
                    loading
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-terra-blue to-blue-600 hover:from-blue-600 hover:to-terra-blue hover:scale-105'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin mr-2">🛸</span>
                      Downloading from satellite...
                    </span>
                  ) : (
                    <span>🛰️ Fetch Satellite Image</span>
                  )}
                </button>
              </form>

              {error && (
                <div className="mt-4 bg-red-900/30 border border-red-500 rounded-lg p-4">
                  <p className="text-red-300 flex items-center">
                    <span className="mr-2">❌</span>
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* Available Cities */}
            <div className="bg-blue-900/20 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-blue-700">
              <h3 className="text-xl font-semibold mb-3 text-blue-300">
                📋 Available Cities
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => setCityName(city)}
                    className="px-3 py-1 bg-blue-900/50 hover:bg-blue-800/50 rounded-full text-sm transition-colors border border-blue-700"
                  >
                    {city}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                💡 Tip: Click a city name to auto-fill
              </p>
            </div>

            {/* Metadata */}
            {metadata && (
              <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-purple-700">
                <h3 className="text-xl font-semibold mb-3 text-purple-300">
                  📊 Image Metadata
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Location:</span>
                    <span className="text-white font-mono">
                      {metadata.location.latitude.toFixed(4)}°, {metadata.location.longitude.toFixed(4)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Resolution:</span>
                    <span className="text-white">{metadata.resolution_meters}m per pixel</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Image Size:</span>
                    <span className="text-white">
                      {metadata.image_size.width} × {metadata.image_size.height} px
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date Range:</span>
                    <span className="text-white text-xs">
                      {new Date(metadata.date_range.start).toLocaleDateString()} - 
                      {new Date(metadata.date_range.end).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Image Display */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="mr-2">🖼️</span>
              Satellite View
            </h2>

            {!imageUrl && !loading && (
              <div className="aspect-square bg-gray-700/50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">🛰️</div>
                  <p className="text-lg">No image loaded</p>
                  <p className="text-sm mt-2">Enter a city name and click fetch</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="aspect-square bg-gray-700/50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4 animate-bounce">🛸</div>
                  <p className="text-lg">Downloading from space...</p>
                  <p className="text-sm mt-2">This may take 15-30 seconds</p>
                  <div className="mt-4">
                    <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden mx-auto">
                      <div className="h-full bg-gradient-to-r from-terra-blue to-terra-green animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {imageUrl && (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border-2 border-gray-600">
                  <img
                    src={imageUrl}
                    alt="Satellite imagery"
                    className="w-full h-auto"
                    onError={() => setError('Failed to load image')}
                  />
                </div>
                <div className="flex gap-2">
                  <a
                    href={imageUrl}
                    download
                    className="flex-1 bg-green-600 hover:bg-green-700 py-2 px-4 rounded-lg font-semibold text-center transition-colors"
                  >
                    💾 Download Image
                  </a>
                  <button
                    onClick={() => {
                      setImageUrl(null)
                      setMetadata(null)
                      setCityName('')
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 px-4 rounded-lg font-semibold transition-colors"
                  >
                    🔄 Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  )
}
