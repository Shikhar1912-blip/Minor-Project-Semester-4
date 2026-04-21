'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface Overlay {
  filename: string
  source: string
  status: string
  polygons?: number
  water_pct?: number
  risk_label?: string
  center?: [number, number]
  bbox?: [number, number, number, number]
  error?: string
}

interface FloodZone {
  uid: string          // globally unique key
  zone_id: number
  centroid_lat: number
  centroid_lng: number
  area_km2: number
  area_pct: number
  risk_label: string
  risk_color: string
  zone_bbox: [number, number, number, number]
}

const CITIES = [
  { name: 'Mumbai', lng: 72.8777, lat: 19.0760, zoom: 11 },
  { name: 'Delhi', lng: 77.1025, lat: 28.7041, zoom: 11 },
  { name: 'Chennai', lng: 80.2707, lat: 13.0827, zoom: 11 },
  { name: 'Kolkata', lng: 88.3639, lat: 22.5726, zoom: 11 },
  { name: 'Bangalore', lng: 77.5946, lat: 12.9716, zoom: 11 },
  { name: 'Hyderabad', lng: 78.4867, lat: 17.3850, zoom: 11 },
  { name: 'New York', lng: -74.006, lat: 40.7128, zoom: 10 },
  { name: 'London', lng: -0.1276, lat: 51.5074, zoom: 10 },
  { name: 'Tokyo', lng: 139.6917, lat: 35.6895, zoom: 10 },
  { name: 'Sydney', lng: 151.2093, lat: -33.8688, zoom: 10 },
]

const RISK_COLORS: Record<string, string> = {
  Low: '#22c55e',
  Moderate: '#eab308',
  High: '#f97316',
  Critical: '#ef4444',
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [loadedLayers, setLoadedLayers] = useState<Set<string>>(new Set())
  const [autoLoading, setAutoLoading] = useState(false)
  const [terrainEnabled, setTerrainEnabled] = useState(true)
  const [coords, setCoords] = useState({ lng: 77.1025, lat: 28.7041 })
  const [zoom, setZoom] = useState(11)

  // Flood zone details
  const [floodZones, setFloodZones] = useState<FloodZone[]>([])
  const [selectedZone, setSelectedZone] = useState<FloodZone | null>(null)
  const [activeOverlayName, setActiveOverlayName] = useState<string>('')

  // Routing state
  const [routingState, setRoutingState] = useState<{
    status: 'idle' | 'routing' | 'done' | 'error',
    distance?: string,
    duration?: string,
    shelterName?: string,
    errorMsg?: string
  }>({ status: 'idle' })

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
  const ORS_TOKEN = process.env.NEXT_PUBLIC_ORS_TOKEN || ''



  // ─── Initialize Map ───
  useEffect(() => {
    if (map.current || !mapContainer.current || !MAPBOX_TOKEN) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [coords.lng, coords.lat],
      zoom: zoom,
      pitch: 55,
      bearing: -20,
      antialias: false,
      fadeDuration: 0,
      maxTileCacheSize: 200,
    } as any)

    map.current = m

    m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
    m.addControl(new mapboxgl.ScaleControl({ maxWidth: 150 }), 'bottom-right')

    m.on('load', () => {
      // Terrain-RGB
      m.addSource('mapbox-terrain-rgb', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.terrain-rgb',
        tileSize: 256,
        maxzoom: 14,
      })
      m.setTerrain({ source: 'mapbox-terrain-rgb', exaggeration: 1.5 })

      m.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 85.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      })

      setMapLoaded(true)
    })

    m.on('move', () => {
      const center = m.getCenter()
      setCoords({ lng: +center.lng.toFixed(4), lat: +center.lat.toFixed(4) })
      setZoom(+m.getZoom().toFixed(1))
    })

    return () => { m.remove(); map.current = null }
  }, [MAPBOX_TOKEN])

  // ─── Auto-load overlays ───
  useEffect(() => {
    if (mapLoaded) autoLoadOverlays()
  }, [mapLoaded])

  const autoLoadOverlays = useCallback(async () => {
    setAutoLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/map/auto-overlay-all`)
      const data: Overlay[] = res.data.overlays || []
      setOverlays(data)

      for (const ov of data) {
        if (ov.status === 'ok' && ov.bbox) {
          await loadOverlayToMap(ov)
        }
      }

      const first = data.find(o => o.status === 'ok' && o.center)
      if (first && first.center) {
        map.current?.flyTo({ center: first.center, zoom: 12, pitch: 55, duration: 1200 })
      }
    } catch (err) {
      console.error('Auto-overlay failed:', err)
    } finally {
      setAutoLoading(false)
    }
  }, [mapLoaded])

  // ─── Load overlay with click interaction ───
  const loadOverlayToMap = async (ov: Overlay) => {
    if (!map.current || !mapLoaded) return
    const m = map.current

    const geojsonName = ov.filename.replace('.png', '.geojson')
    const sourceId = `flood-${ov.source}-${ov.filename}`
    const fillId = `fill-${ov.source}-${ov.filename}`
    const lineId = `line-${ov.source}-${ov.filename}`

    if (m.getSource(sourceId)) return

    try {
      const res = await axios.get(`${API_URL}/api/map/geojson/${geojsonName}`)
      const features = res.data.features || []

      // Extract flood zone details for the sidebar
      const zones: FloodZone[] = features.map((f: any, idx: number) => ({
        uid: `${ov.source}-${ov.filename}-z${idx}`,
        zone_id: f.properties.zone_id,
        centroid_lat: f.properties.centroid_lat,
        centroid_lng: f.properties.centroid_lng,
        area_km2: f.properties.area_km2,
        area_pct: f.properties.area_pct,
        risk_label: f.properties.risk_label,
        risk_color: f.properties.risk_color,
        zone_bbox: f.properties.zone_bbox,
      }))

      m.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      })

      m.addLayer({
        id: fillId,
        type: 'fill-extrusion',
        source: sourceId,
        paint: {
          'fill-extrusion-color': ['get', 'risk_color'],
          'fill-extrusion-height': 50,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.6,
        },
      })

      m.addLayer({
        id: lineId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#ffffff',
          'line-width': 1.5,
          'line-opacity': 0.5,
        },
      })

      // ── Click handler: show popup with exact coordinates ──
      m.on('click', fillId, (e) => {
        if (!e.features || e.features.length === 0) return
        const props = e.features[0].properties as any
        const lngLat = e.lngLat

        // Remove old popup
        popupRef.current?.remove()

        const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '280px' })
          .setLngLat(lngLat)
          .setHTML(`
            <div style="font-family: Inter, sans-serif; color: #f1f5f9; background: #0f1629; border-radius: 12px; padding: 14px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="background: ${props.risk_color}22; color: ${props.risk_color}; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid ${props.risk_color}40;">
                  ${props.risk_label} RISK
                </span>
                <span style="color: #9ca3af; font-size: 11px;">Zone #${props.zone_id}</span>
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">📍 <b>Exact Coordinates</b></div>
              <div style="font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 8px;">
                ${props.centroid_lat}°N, ${props.centroid_lng}°E
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
                <div style="background: rgba(255,255,255,0.05); padding: 6px 8px; border-radius: 6px;">
                  <div style="color: #6b7280;">Area</div>
                  <div style="color: #e2e8f0; font-weight: 600;">${props.area_km2} km²</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 6px 8px; border-radius: 6px;">
                  <div style="color: #6b7280;">Coverage</div>
                  <div style="color: #e2e8f0; font-weight: 600;">${props.area_pct}%</div>
                </div>
              </div>
              <a href="https://www.google.com/maps?q=${props.centroid_lat},${props.centroid_lng}" target="_blank"
                 style="display: block; margin-top: 10px; text-align: center; padding: 6px; border-radius: 8px; background: linear-gradient(90deg, #2563eb, #0891b2); color: white; font-size: 11px; font-weight: 600; text-decoration: none;">
                🧭 Open in Google Maps
              </a>
            </div>
          `)
          .addTo(m)

        popupRef.current = popup

        // Highlight in sidebar
        setSelectedZone(zones.find(z => z.zone_id === props.zone_id) || null)
      })

      // Cursor change on hover
      m.on('mouseenter', fillId, () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', fillId, () => { m.getCanvas().style.cursor = '' })

      setLoadedLayers(prev => new Set([...prev, `${ov.source}-${ov.filename}`]))
      // Deduplicate: skip zones with identical centroid already in list
      setFloodZones(prev => {
        const existingKeys = new Set(prev.map(z => `${z.centroid_lat.toFixed(5)}_${z.centroid_lng.toFixed(5)}`))
        const unique = zones.filter(z => !existingKeys.has(`${z.centroid_lat.toFixed(5)}_${z.centroid_lng.toFixed(5)}`))
        return [...prev, ...unique]
      })
      setActiveOverlayName(ov.filename)
    } catch (err) {
      console.error(`Failed to load overlay ${ov.filename}:`, err)
    }
  }

  // ─── Navigate to a specific flood zone ───
  const navigateToZone = (zone: FloodZone) => {
    setSelectedZone(zone)
    if (!map.current) return
    
    clearRoute() // Clear existing route on selecting a new zone

    // Fly to the exact centroid
    map.current.flyTo({
      center: [zone.centroid_lng, zone.centroid_lat],
      zoom: 14,
      pitch: 60,
      bearing: 0,
      duration: 1500,
    })

    // Show popup at centroid
    popupRef.current?.remove()
    const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '280px' })
      .setLngLat([zone.centroid_lng, zone.centroid_lat])
      .setHTML(`
        <div style="font-family: Inter, sans-serif; color: #f1f5f9; background: #0f1629; border-radius: 12px; padding: 14px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span style="background: ${zone.risk_color}22; color: ${zone.risk_color}; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid ${zone.risk_color}40;">
              ${zone.risk_label} RISK
            </span>
            <span style="color: #9ca3af; font-size: 11px;">Zone #${zone.zone_id}</span>
          </div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">📍 <b>Rescue Coordinates</b></div>
          <div style="font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 8px;">
            ${zone.centroid_lat.toFixed(5)}°N, ${zone.centroid_lng.toFixed(5)}°E
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
            <div style="background: rgba(255,255,255,0.05); padding: 6px 8px; border-radius: 6px;">
              <div style="color: #6b7280;">Area</div>
              <div style="color: #e2e8f0; font-weight: 600;">${zone.area_km2} km²</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 6px 8px; border-radius: 6px;">
              <div style="color: #6b7280;">Coverage</div>
              <div style="color: #e2e8f0; font-weight: 600;">${zone.area_pct}%</div>
            </div>
          </div>
          <a href="https://www.google.com/maps?q=${zone.centroid_lat},${zone.centroid_lng}" target="_blank"
             style="display: block; margin-top: 10px; text-align: center; padding: 6px; border-radius: 8px; background: linear-gradient(90deg, #2563eb, #0891b2); color: white; font-size: 11px; font-weight: 600; text-decoration: none;">
            🧭 Open in Google Maps
          </a>
        </div>
      `)
      .addTo(map.current)
    popupRef.current = popup
  }

  // ─── Mapbox Directions API for Evacuation Routing ───
  const clearRoute = () => {
    if (!map.current) return
    document.querySelectorAll('.evac-marker').forEach(el => el.remove())
    if (map.current.getLayer('evac-route-line')) map.current.removeLayer('evac-route-line')
    if (map.current.getSource('evac-route')) map.current.removeSource('evac-route')
    setRoutingState({ status: 'idle' })
  }

  const plotEvacuationRoute = async (zone: FloodZone) => {
    if (!map.current || !MAPBOX_TOKEN) return
    const m = map.current
    
    setRoutingState({ status: 'routing' })
    try {
      // 1. Get Nearest Shelter
      const shelterRes = await axios.get(`${API_URL}/api/evacuation/nearest-shelter`, {
        params: { lat: zone.centroid_lat, lng: zone.centroid_lng }
      })
      const shelter = shelterRes.data.shelter
      
      // 2. Fetch Mapbox Directions
      const dirRes = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${zone.centroid_lng},${zone.centroid_lat};${shelter.lng},${shelter.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`)
      
      if (!dirRes.data.routes || dirRes.data.routes.length === 0) {
        throw new Error('No land route found')
      }
      
      const route = dirRes.data.routes[0]
      const geojson = route.geometry
      
      const distance = (route.distance / 1000).toFixed(1) + ' km'
      const duration = Math.round(route.duration / 60) + ' min'
      
      // 3. Draw on Map
      if (m.getSource('evac-route')) {
        (m.getSource('evac-route') as mapboxgl.GeoJSONSource).setData(geojson)
      } else {
        m.addSource('evac-route', {
          type: 'geojson',
          data: geojson
        })
        m.addLayer({
          id: 'evac-route-line',
          type: 'line',
          source: 'evac-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#06b6d4',
            'line-width': 5,
            'line-opacity': 0.8
          }
        })
      }
      
      // 4. Add Destination Marker
      document.querySelectorAll('.evac-marker').forEach(el => el.remove())
      const el = document.createElement('div')
      el.className = 'evac-marker'
      el.innerHTML = '🏥'
      el.style.fontSize = '24px'
      el.style.cursor = 'pointer'
      el.style.filter = 'drop-shadow(0 0 8px rgba(6,182,212,0.8))'
      
      new mapboxgl.Marker(el)
        .setLngLat([shelter.lng, shelter.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: Inter, sans-serif; padding: 6px; color: #0f172a;">
            <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px;">${shelter.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">${shelter.city} • Capacity: ${shelter.capacity}</div>
            <div style="font-size: 11px; color: #10b981; font-weight: 600;">Safe Elev: ${shelter.elevation_m}m • Dist: ${shelter.distance_km}km</div>
          </div>
        `))
        .addTo(m)
      
      // 5. Fit Bounds to show full route
      const bounds = new mapboxgl.LngLatBounds(
        [zone.centroid_lng, zone.centroid_lat],
        [shelter.lng, shelter.lat]
      )
      
      m.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 350, right: 100 },
        pitch: 45,
        duration: 2000
      })
      
      setRoutingState({
        status: 'done',
        distance,
        duration,
        shelterName: shelter.name
      })

    } catch (err: any) {
      console.error('Evacuation Route Error:', err)
      setRoutingState({ status: 'error', errorMsg: err.message || 'Routing failed' })
    }
  }



  // ─── Toggle overlay ───
  const toggleOverlay = (ov: Overlay) => {
    if (!map.current) return
    const m = map.current
    const fillId = `fill-${ov.source}-${ov.filename}`
    const lineId = `line-${ov.source}-${ov.filename}`
    const sourceId = `flood-${ov.source}-${ov.filename}`

    const layerKey = `${ov.source}-${ov.filename}`
    if (loadedLayers.has(layerKey)) {
      if (m.getLayer(fillId)) m.removeLayer(fillId)
      if (m.getLayer(lineId)) m.removeLayer(lineId)
      if (m.getSource(sourceId)) m.removeSource(sourceId)
      setLoadedLayers(prev => { const s = new Set(prev); s.delete(layerKey); return s })
      setFloodZones(prev => prev.filter(z => !z.uid.startsWith(layerKey)))
    } else {
      loadOverlayToMap(ov)
      if (ov.center) {
        m.flyTo({ center: ov.center, zoom: 12, pitch: 55, duration: 1000 })
      }
    }
  }

  const flyToCity = (city: typeof CITIES[0]) => {
    map.current?.flyTo({ center: [city.lng, city.lat], zoom: city.zoom, pitch: 55, bearing: -20, duration: 1500 })
  }

  const toggleTerrain = () => {
    if (!map.current || !mapLoaded) return
    map.current.setTerrain(terrainEnabled ? null : { source: 'mapbox-terrain-rgb', exaggeration: 1.5 })
    setTerrainEnabled(!terrainEnabled)
  }

  return (
    <main className="min-h-screen grid-bg text-white">
      <div className="flex h-[calc(100vh-56px)]">

        {/* ─── Sidebar ─── */}
        <div className="w-80 glass border-r border-white/5 overflow-y-auto custom-scrollbar flex flex-col">

          {/* Header */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <a href="/" className="hover:text-gray-300 transition-colors">Home</a>
              <span>/</span>
              <span className="text-gray-300">3D Map</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg">🗺️</div>
              <div>
                <h1 className="text-lg font-bold text-white">3D Terrain Map</h1>
                <p className="text-[10px] text-gray-500">Click any flood zone for exact coordinates</p>
              </div>
            </div>
          </div>

          {/* HUD */}
          <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-gray-500">📍</span>
            <span className="font-mono text-gray-400">{coords.lng}, {coords.lat}</span>
            <span className="font-mono text-gray-500">z{zoom}</span>
          </div>

          {/* Controls */}
          <div className="p-3 border-b border-white/5 flex gap-2">
            <button onClick={toggleTerrain} className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg transition-all flex items-center justify-center gap-1 ${terrainEnabled ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-500 border border-white/5'}`}>
              ⛰️ {terrainEnabled ? '3D ON' : '3D OFF'}
            </button>
            <button onClick={autoLoadOverlays} disabled={autoLoading} className="flex-1 px-2 py-1.5 text-[11px] rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all disabled:opacity-50">
              {autoLoading ? '⏳...' : '🔄 Refresh'}
            </button>
          </div>

          {/* City Selector */}
          <div className="p-3 border-b border-white/5">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Fly to City</h3>
            <div className="grid grid-cols-2 gap-1">
              {CITIES.map(city => (
                <button key={city.name} onClick={() => flyToCity(city)} className="px-2 py-1 text-[11px] rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-left truncate">
                  {city.name}
                </button>
              ))}
            </div>
          </div>

          {/* Overlays */}
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Flood Overlays</h3>
              <span className="text-[10px] text-gray-600">{overlays.filter(o => o.status === 'ok').length} found</span>
            </div>
            {autoLoading ? (
              <div className="flex items-center gap-2 py-3 justify-center">
                <div className="w-3 h-3 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
                <span className="text-[11px] text-gray-500">Auto-detecting...</span>
              </div>
            ) : overlays.length === 0 ? (
              <p className="text-[11px] text-gray-600 py-2">No masks found. Run flood detection first.</p>
            ) : (
              <div className="space-y-1">
                {overlays.filter(o => o.status === 'ok').map(ov => {
                  const active = loadedLayers.has(`${ov.source}-${ov.filename}`)
                  return (
                    <button key={`${ov.source}-${ov.filename}`} onClick={() => toggleOverlay(ov)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left transition-all flex items-center gap-2 ${active ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}>
                      <span className={`w-2 h-2 rounded-full ${active ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'}`} />
                      <span className="text-[11px] text-gray-300 truncate flex-1">{ov.filename.replace('_water_mask.png', '')}</span>
                      <span className="text-[10px]" style={{ color: RISK_COLORS[ov.risk_label || 'Low'] }}>{ov.risk_label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ─── FLOOD ZONE NAVIGATOR ─── */}
          <div className="p-3 flex-1">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">
              🎯 Flood Zones ({floodZones.length})
            </h3>
            <p className="text-[10px] text-gray-600 mb-2">Click to navigate rescue teams to exact location</p>

            {floodZones.length === 0 ? (
              <div className="text-center py-4 text-gray-600">
                <span className="text-2xl opacity-30 block mb-1">🎯</span>
                <span className="text-[11px]">Zones appear after overlay loads</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {floodZones.map((zone) => (
                  <button
                    key={zone.uid}
                    onClick={() => navigateToZone(zone)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all ${
                      selectedZone?.uid === zone.uid
                        ? 'bg-cyan-500/15 border border-cyan-500/30 ring-1 ring-cyan-500/20'
                        : 'bg-white/5 border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-300">Zone #{zone.zone_id}</span>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: zone.risk_color }} />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: zone.risk_color }}>{zone.risk_label}</span>
                    </div>
                    <div className="font-mono text-[11px] text-cyan-400 mb-1">
                      {zone.centroid_lat.toFixed(4)}°N, {zone.centroid_lng.toFixed(4)}°E
                    </div>
                    <div className="flex gap-3 text-[10px] text-gray-500">
                      <span>{zone.area_km2} km²</span>
                      <span>{zone.area_pct}% coverage</span>
                    </div>
                  </button>
                ))}
            </div>
          )}
          </div>
        </div>

        {/* ─── Map Area ─── */}
        <div className="flex-1 relative">
          {!MAPBOX_TOKEN && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
              <div className="glass p-8 rounded-2xl border border-white/10 max-w-md text-center">
                <span className="text-4xl mb-4 block">🔑</span>
                <h2 className="text-xl font-bold text-white mb-2">Mapbox Token Required</h2>
                <p className="text-sm text-gray-400">Add <code className="text-cyan-400">NEXT_PUBLIC_MAPBOX_TOKEN</code> to <code className="text-cyan-400">.env.local</code></p>
              </div>
            </div>
          )}
          <div ref={mapContainer} className="w-full h-full" />

          {autoLoading && (
            <div className="absolute top-4 left-4 z-10 glass px-3 py-2 rounded-lg border border-white/10 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-[11px] text-gray-300">Processing flood zones...</span>
            </div>
          )}

          {/* Selected Zone HUD */}
          {selectedZone && (
            <div className="absolute top-4 left-4 z-10 glass px-4 py-3 rounded-xl border border-cyan-500/20 max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">🎯 Zone #{selectedZone.zone_id}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: selectedZone.risk_color, backgroundColor: selectedZone.risk_color + '20', border: `1px solid ${selectedZone.risk_color}40` }}>
                  {selectedZone.risk_label}
                </span>
              </div>
              <div className="font-mono text-sm text-cyan-400 mb-1">
                {selectedZone.centroid_lat.toFixed(6)}°N
              </div>
              <div className="font-mono text-sm text-cyan-400 mb-2">
                {selectedZone.centroid_lng.toFixed(6)}°E
              </div>
              <div className="flex gap-3 text-[10px] text-gray-400 mb-3">
                <span>📐 {selectedZone.area_km2} km²</span>
                <span>💧 {selectedZone.area_pct}%</span>
              </div>
              
              {/* Routing UI */}
              <div className="pt-3 border-t border-cyan-500/20">
                {routingState.status === 'idle' && (
                  <button 
                    onClick={() => plotEvacuationRoute(selectedZone)}
                    className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2"
                  >
                    🚁 Plot Evacuation Route
                  </button>
                )}
                {routingState.status === 'routing' && (
                  <div className="w-full py-2 bg-cyan-900/40 text-cyan-400 text-xs font-bold rounded-lg flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-cyan-700 border-t-cyan-400 rounded-full animate-spin" />
                    Calculating safe path...
                  </div>
                )}
                {routingState.status === 'done' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Destination:</span>
                      <span className="font-bold text-cyan-400 truncate ml-2">{routingState.shelterName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] bg-black/20 p-2 rounded-md">
                      <div className="flex flex-col">
                        <span className="text-gray-500">Travel Time</span>
                        <span className="font-bold text-white">{routingState.duration}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-gray-500">Distance</span>
                        <span className="font-bold text-white">{routingState.distance}</span>
                      </div>
                    </div>
                    <button 
                      onClick={clearRoute}
                      className="w-full py-1.5 mt-1 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-semibold rounded-md transition-all"
                    >
                      Clear Route
                    </button>
                  </div>
                )}
                {routingState.status === 'error' && (
                  <div className="text-center">
                    <div className="text-[11px] text-red-400 mb-2">Failed: {routingState.errorMsg}</div>
                    <button 
                      onClick={() => setRoutingState({ status: 'idle' })}
                      className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] rounded-md"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          {overlays.some(o => o.status === 'ok') && (
            <div className="absolute bottom-6 left-4 z-10 glass px-3 py-2 rounded-lg border border-white/10">
              <span className="text-[10px] text-gray-500 block mb-1 font-semibold">RISK LEVEL</span>
              <div className="flex gap-3">
                {Object.entries(RISK_COLORS).map(([label, color]) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
