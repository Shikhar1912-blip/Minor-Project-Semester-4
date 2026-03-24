'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface Layer {
  filename: string
  source: string
  type: string
  path: string
}

const CITIES = [
  { name: 'Mumbai', lng: 72.8777, lat: 19.0760, zoom: 11 },
  { name: 'Delhi', lng: 77.1025, lat: 28.7041, zoom: 11 },
  { name: 'Chennai', lng: 80.2707, lat: 13.0827, zoom: 11 },
  { name: 'Kolkata', lng: 88.3639, lat: 22.5726, zoom: 11 },
  { name: 'Bangalore', lng: 77.5946, lat: 12.9716, zoom: 11 },
  { name: 'Hyderabad', lng: 78.4867, lat: 17.3850, zoom: 11 },
  { name: 'Ahmedabad', lng: 72.5714, lat: 23.0225, zoom: 11 },
  { name: 'Pune', lng: 73.8567, lat: 18.5204, zoom: 11 },
  { name: 'Jaipur', lng: 75.7873, lat: 26.9124, zoom: 11 },
  { name: 'Lucknow', lng: 80.9462, lat: 26.8467, zoom: 11 },
  { name: 'New York', lng: -74.006, lat: 40.7128, zoom: 10 },
  { name: 'London', lng: -0.1276, lat: 51.5074, zoom: 10 },
  { name: 'Tokyo', lng: 139.6917, lat: 35.6895, zoom: 10 },
  { name: 'Sydney', lng: 151.2093, lat: -33.8688, zoom: 10 },
]

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [layers, setLayers] = useState<Layer[]>([])
  const [activeLayer, setActiveLayer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [terrainEnabled, setTerrainEnabled] = useState(true)
  const [coords, setCoords] = useState({ lng: 77.1025, lat: 28.7041 })
  const [zoom, setZoom] = useState(11)

  // GeoJSON generation form
  const [geoForm, setGeoForm] = useState({
    mask_filename: '',
    min_lon: '',
    min_lat: '',
    max_lon: '',
    max_lat: '',
  })
  const [generating, setGenerating] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

  // ─── Initialize Map ───
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [coords.lng, coords.lat],
      zoom: zoom,
      pitch: 60,
      bearing: -30,
      antialias: true,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-right')

    map.current.on('load', () => {
      // Add 3D terrain
      map.current!.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      map.current!.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })

      // Add sky layer for realism
      map.current!.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      })

      setMapLoaded(true)
    })

    map.current.on('move', () => {
      if (!map.current) return
      const center = map.current.getCenter()
      setCoords({ lng: +center.lng.toFixed(4), lat: +center.lat.toFixed(4) })
      setZoom(+map.current.getZoom().toFixed(1))
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // ─── Fetch layer list ───
  useEffect(() => {
    fetchLayers()
  }, [])

  const fetchLayers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/map/layers`)
      setLayers(res.data.layers)
    } catch (err) {
      console.error(err)
    }
  }

  // ─── Fly to city ───
  const flyToCity = (city: typeof CITIES[0]) => {
    map.current?.flyTo({
      center: [city.lng, city.lat],
      zoom: city.zoom,
      pitch: 60,
      bearing: -30,
      duration: 2000,
    })
  }

  // ─── Toggle terrain ───
  const toggleTerrain = () => {
    if (!map.current || !mapLoaded) return
    if (terrainEnabled) {
      map.current.setTerrain(null)
    } else {
      map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
    }
    setTerrainEnabled(!terrainEnabled)
  }

  // ─── Generate GeoJSON overlay ───
  const handleGenerateGeoJSON = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    setError(null)

    try {
      const res = await axios.post(`${API_URL}/api/map/geojson`, {
        mask_filename: geoForm.mask_filename,
        min_lon: parseFloat(geoForm.min_lon),
        min_lat: parseFloat(geoForm.min_lat),
        max_lon: parseFloat(geoForm.max_lon),
        max_lat: parseFloat(geoForm.max_lat),
      })

      const geojson = res.data
      addGeoJSONLayer(geojson, geoForm.mask_filename)
      fetchLayers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate GeoJSON')
    } finally {
      setGenerating(false)
    }
  }

  // ─── Add GeoJSON to map ───
  const addGeoJSONLayer = (geojson: any, layerName: string) => {
    if (!map.current || !mapLoaded) return

    const sourceId = `flood-${layerName}`
    const layerId = `flood-fill-${layerName}`
    const outlineId = `flood-outline-${layerName}`

    // Remove existing layer if present
    if (map.current.getLayer(layerId)) map.current.removeLayer(layerId)
    if (map.current.getLayer(outlineId)) map.current.removeLayer(outlineId)
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId)

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: geojson.features || [],
      },
    })

    // Fill layer
    map.current.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': ['get', 'risk_color'],
        'fill-opacity': 0.45,
      },
    })

    // Outline layer
    map.current.addLayer({
      id: outlineId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#ffffff',
        'line-width': 1.5,
        'line-opacity': 0.7,
      },
    })

    // Fit map to the data bounds
    if (geojson.properties?.bbox) {
      const [minLng, minLat, maxLng, maxLat] = geojson.properties.bbox
      map.current.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 50, pitch: 60, duration: 1500 }
      )
    }

    setActiveLayer(layerName)
  }

  // ─── Load a saved GeoJSON ───
  const loadSavedGeoJSON = async (filename: string) => {
    setLoading(true)
    try {
      const geojsonName = filename.replace('.png', '.geojson')
      const res = await axios.get(`${API_URL}/api/map/geojson/${geojsonName}`)
      addGeoJSONLayer(res.data, filename)
    } catch (err) {
      // If no saved GeoJSON, the user needs to generate it first
      setGeoForm(prev => ({ ...prev, mask_filename: filename }))
      setError('No GeoJSON found for this mask. Fill in the bounding box below to generate one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen grid-bg text-white">
      <div className="flex h-[calc(100vh-56px)]">

        {/* ─── Sidebar ─── */}
        <div className="w-80 glass border-r border-white/5 overflow-y-auto custom-scrollbar flex flex-col">

          {/* Header */}
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <a href="/" className="hover:text-gray-300 transition-colors">Home</a>
              <span>/</span>
              <span className="text-gray-300">3D Map</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg">🗺️</div>
              <div>
                <h1 className="text-lg font-bold text-white">3D Terrain Map</h1>
                <p className="text-xs text-gray-500">Mapbox GL • Flood Overlays</p>
              </div>
            </div>
          </div>

          {/* Coordinates */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Position</span>
              <span className="font-mono text-gray-300">{coords.lng}, {coords.lat}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-gray-500">Zoom</span>
              <span className="font-mono text-gray-300">{zoom}</span>
            </div>
          </div>

          {/* City Selector */}
          <div className="p-4 border-b border-white/5">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Fly to City</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {CITIES.map(city => (
                <button
                  key={city.name}
                  onClick={() => flyToCity(city)}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-left truncate"
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 border-b border-white/5 space-y-2">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Controls</h3>
            <button
              onClick={toggleTerrain}
              className={`w-full px-3 py-2 text-xs rounded-lg transition-all flex items-center justify-between ${
                terrainEnabled
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/5'
              }`}
            >
              <span>3D Terrain</span>
              <span>{terrainEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Available Layers */}
          <div className="p-4 border-b border-white/5 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Flood Layers</h3>
              <button onClick={fetchLayers} className="text-xs text-gray-500 hover:text-gray-300">🔄</button>
            </div>
            {layers.length === 0 ? (
              <p className="text-xs text-gray-500">No mask files found. Run a flood detection first.</p>
            ) : (
              <div className="space-y-1.5">
                {layers.map(layer => (
                  <button
                    key={layer.filename}
                    onClick={() => loadSavedGeoJSON(layer.filename)}
                    className={`w-full px-3 py-2 text-xs rounded-lg transition-all text-left flex items-center gap-2 ${
                      activeLayer === layer.filename
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${layer.source === 'ndwi' ? 'bg-cyan-400' : 'bg-purple-400'}`} />
                    <span className="truncate flex-1">{layer.filename}</span>
                    <span className="text-[10px] uppercase opacity-60">{layer.source}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate GeoJSON Form */}
          <div className="p-4 border-t border-white/5">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Generate Overlay</h3>
            {error && (
              <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleGenerateGeoJSON} className="space-y-2">
              <input
                type="text"
                value={geoForm.mask_filename}
                onChange={e => setGeoForm(p => ({ ...p, mask_filename: e.target.value }))}
                placeholder="Mask filename"
                className="input-dark w-full text-xs"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="any" value={geoForm.min_lon} onChange={e => setGeoForm(p => ({ ...p, min_lon: e.target.value }))} placeholder="Min Lon" className="input-dark text-xs" required />
                <input type="number" step="any" value={geoForm.min_lat} onChange={e => setGeoForm(p => ({ ...p, min_lat: e.target.value }))} placeholder="Min Lat" className="input-dark text-xs" required />
                <input type="number" step="any" value={geoForm.max_lon} onChange={e => setGeoForm(p => ({ ...p, max_lon: e.target.value }))} placeholder="Max Lon" className="input-dark text-xs" required />
                <input type="number" step="any" value={geoForm.max_lat} onChange={e => setGeoForm(p => ({ ...p, max_lat: e.target.value }))} placeholder="Max Lat" className="input-dark text-xs" required />
              </div>
              <button
                type="submit"
                disabled={generating}
                className="w-full px-3 py-2 text-xs rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-medium transition-all disabled:opacity-50"
              >
                {generating ? 'Generating...' : '🗺️ Generate & Overlay'}
              </button>
            </form>
          </div>
        </div>

        {/* ─── Map Area ─── */}
        <div className="flex-1 relative">
          {!MAPBOX_TOKEN && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
              <div className="glass p-8 rounded-2xl border border-white/10 max-w-md text-center">
                <span className="text-4xl mb-4 block">🔑</span>
                <h2 className="text-xl font-bold text-white mb-2">Mapbox Token Required</h2>
                <p className="text-sm text-gray-400 mb-4">
                  Add <code className="text-cyan-400">NEXT_PUBLIC_MAPBOX_TOKEN</code> to your <code className="text-cyan-400">.env.local</code> file.
                </p>
                <p className="text-xs text-gray-500">Get a free token at mapbox.com</p>
              </div>
            </div>
          )}
          <div ref={mapContainer} className="w-full h-full" />
          {loading && (
            <div className="absolute top-4 left-4 z-10 glass px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-xs text-gray-300">Loading overlay...</span>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
