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
    <main className="min-h-screen grid-bg text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <a href="/" className="hover:text-gray-300 transition-colors">Home</a>
            <span>/</span>
            <span className="text-gray-300">Satellite Imagery</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl">🛰️</div>
            <div>
              <h1 className="text-3xl font-bold text-white">Satellite Imagery</h1>
              <p className="text-sm text-gray-500">Sentinel-2 real-time data · Week 2</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-2 space-y-5">

            {/* Fetch Form */}
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Fetch Image</h2>
              <form onSubmit={handleFetchImage} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">City Name</label>
                  <input
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="e.g., Delhi, Mumbai, New York"
                    className="input-dark"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Downloading from satellite...
                    </>
                  ) : (
                    <>
                      <span>🛰️</span> Fetch Satellite Image
                    </>
                  )}
                </button>
              </form>

              {error && (
                <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-400 flex items-center gap-2"><span>⚠️</span>{error}</p>
                </div>
              )}
            </div>

            {/* City chips */}
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Available Cities</h2>
              <div className="flex flex-wrap gap-2">
                {availableCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => setCityName(city)}
                    className="px-3 py-1 text-xs rounded-full badge-blue hover:bg-blue-500/20 transition-colors"
                  >
                    {city}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">Click to auto-fill</p>
            </div>

            {/* Metadata */}
            {metadata && (
              <div className="glass rounded-2xl p-5 border border-purple-500/15">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Image Metadata</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Coordinates', value: `${metadata.location.latitude.toFixed(4)}°, ${metadata.location.longitude.toFixed(4)}°` },
                    { label: 'Resolution', value: `${metadata.resolution_meters}m / pixel` },
                    { label: 'Dimensions', value: `${metadata.image_size.width} × ${metadata.image_size.height} px` },
                    { label: 'Date Range', value: `${new Date(metadata.date_range.start).toLocaleDateString()} – ${new Date(metadata.date_range.end).toLocaleDateString()}` },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{item.label}</span>
                      <span className="text-xs text-gray-200 font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Image */}
          <div className="lg:col-span-3">
            <div className="glass rounded-2xl border border-white/5 overflow-hidden h-full min-h-[500px] flex flex-col">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300">Satellite View</h2>
                {imageUrl && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs text-emerald-400">Live</span>
                  </div>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center p-5">
                {!imageUrl && !loading && (
                  <div className="text-center text-gray-600">
                    <div className="text-5xl mb-4 opacity-40">🛰️</div>
                    <p className="text-sm">No image loaded</p>
                    <p className="text-xs mt-1">Enter a city name and click fetch</p>
                  </div>
                )}

                {loading && (
                  <div className="text-center text-gray-500">
                    <div className="text-5xl mb-5 animate-bounce">🛸</div>
                    <p className="text-sm font-medium text-gray-300">Downloading from space...</p>
                    <p className="text-xs mt-1.5 mb-5">This may take 15–30 seconds</p>
                    <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden mx-auto">
                      <div className="h-full w-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                )}

                {imageUrl && (
                  <div className="w-full space-y-4">
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <img src={imageUrl} alt="Satellite imagery" className="w-full h-auto" onError={() => setError('Failed to load image')} />
                    </div>
                    <div className="flex gap-3">
                      <a href={imageUrl} download className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center bg-emerald-600/80 hover:bg-emerald-600 transition-colors">
                        💾 Download
                      </a>
                      <button onClick={() => { setImageUrl(null); setMetadata(null); setCityName('') }} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 transition-colors">
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
