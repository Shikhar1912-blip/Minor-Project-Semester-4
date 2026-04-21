'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface ImageInfo {
  filename: string
  size_mb: number
  modified: string
}

interface TileInfo {
  position: [number, number]
  bbox: [number, number, number, number]
  coverage: number
}

interface ProcessResult {
  status: string
  message: string
  metadata: {
    input_image: string
    tile_size: number
    overlap: number
    normalize_method: string
    num_tiles: number
    output_directory: string
  }
  tiles: TileInfo[]
  saved_paths: string[]
}

export default function PreprocessingPage() {
  const [images, setImages] = useState<ImageInfo[]>([])
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [tileSize, setTileSize] = useState(512)
  const [overlap, setOverlap] = useState(64)
  const [normalizeMethod, setNormalizeMethod] = useState('minmax')
  const [selectedTiles, setSelectedTiles] = useState<string[]>([])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Load available images on mount
  useEffect(() => {
    fetchAvailableImages()
  }, [])

  const fetchAvailableImages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/preprocess/list-images`)
      setImages(response.data.images)
      if (response.data.images.length > 0) {
        setSelectedImage(response.data.images[0].filename)
      }
    } catch (err) {
      console.error('Failed to fetch images:', err)
      setError('Failed to load images. Make sure you have downloaded satellite images first.')
    }
  }

  const handleProcessImage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedImage) {
      setError('Please select an image to process')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await axios.post(`${API_URL}/api/preprocess/process`, {
        image_filename: selectedImage,
        tile_size: tileSize,
        overlap: overlap,
        normalize_method: normalizeMethod
      })

      setResult(response.data)
      
      // Load first 9 tiles for preview
      const tilesToShow = response.data.saved_paths.slice(0, 9).map((path: string) => {
        const filename = path.split('\\').pop() || path.split('/').pop()
        return filename
      })
      setSelectedTiles(tilesToShow)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process image')
    } finally {
      setLoading(false)
    }
  }

  const handleExtractBands = async () => {
    if (!selectedImage) return

    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(`${API_URL}/api/preprocess/extract-bands`, {
        image_filename: selectedImage
      })

      alert(`Bands extracted successfully!\n\nBands: ${response.data.bands_extracted.join(', ')}\n\n${
        response.data.indices ? 
        `NDVI (vegetation): ${response.data.indices.ndvi_mean.toFixed(3)}\nNDWI (water): ${response.data.indices.ndwi_mean.toFixed(3)}` : 
        'NIR band not available for indices calculation'
      }`)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to extract bands')
    } finally {
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
            <span className="text-gray-300">Image Pre-processing</span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl">🔧</div>
            <div>
              <h1 className="text-3xl font-bold text-white">Image Pre-processing</h1>
              <p className="text-sm text-gray-500">Tiling · Normalisation · Band extraction</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 glass rounded-xl p-4 border border-red-500/20 bg-red-500/5">
            <p className="text-sm text-red-400">⚠️ {error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── LEFT: Config ──────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Image selection */}
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Select Image</h2>

              {images.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-3">No satellite images found</p>
                  <a href="/satellite" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    Download satellite images first →
                  </a>
                </div>
              ) : (
                <>
                  <select value={selectedImage} onChange={e => setSelectedImage(e.target.value)} className="input-dark mb-2">
                    {images.map(img => (
                      <option key={img.filename} value={img.filename}>{img.filename} ({img.size_mb} MB)</option>
                    ))}
                  </select>
                  <button onClick={fetchAvailableImages} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    ↻ Refresh list
                  </button>
                </>
              )}
            </div>

            {/* Processing options */}
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Processing Options</h2>

              <form onSubmit={handleProcessImage} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400">Tile Size: <span className="text-white font-mono">{tileSize}×{tileSize}</span> px</label>
                  <input type="range" min={256} max={1024} step={256} value={tileSize}
                    onChange={e => setTileSize(+e.target.value)}
                    className="w-full mt-1.5 accent-emerald-500" />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    {[256,512,768,1024].map(v => <span key={v}>{v}</span>)}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Overlap: <span className="text-white font-mono">{overlap}</span> px</label>
                  <input type="range" min={0} max={256} step={32} value={overlap}
                    onChange={e => setOverlap(+e.target.value)}
                    className="w-full mt-1.5 accent-emerald-500" />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Normalisation Method</label>
                  <select value={normalizeMethod} onChange={e => setNormalizeMethod(e.target.value)} className="input-dark">
                    <option value="minmax">Min-Max (0–255)</option>
                    <option value="standardize">Standardize (Z-score)</option>
                    <option value="clahe">CLAHE (Contrast Enhancement)</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    {normalizeMethod === 'minmax' && 'Scale values to 0–255 range'}
                    {normalizeMethod === 'standardize' && 'Zero mean, unit variance'}
                    {normalizeMethod === 'clahe' && 'Adaptive histogram equalisation'}
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={loading || !selectedImage} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Processing…</>
                      : '🚀 Process Image'}
                  </button>
                  <button type="button" onClick={handleExtractBands} disabled={loading || !selectedImage}
                    className="btn-primary flex-1 flex items-center justify-center gap-1" style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
                    📊 Extract Bands
                  </button>
                </div>
              </form>
            </div>

            {/* Info */}
            <div className="glass rounded-2xl p-5 border border-emerald-500/10">
              <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider mb-3">What this module does</p>
              <div className="space-y-2 text-xs text-gray-400">
                <p>✂️ <span className="text-gray-300 font-medium">Tiling</span> — splits large images into smaller patches for AI processing</p>
                <p>🎨 <span className="text-gray-300 font-medium">Normalisation</span> — standardises pixel values across captures</p>
                <p>📡 <span className="text-gray-300 font-medium">Band Extraction</span> — separates RGB and NIR spectral bands</p>
                <p>💧 <span className="text-gray-300 font-medium">Water Index</span> — calculates NDWI for flood detection</p>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Results ────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {result ? (
              <>
                {/* Stats */}
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Processing Complete</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Tiles Created', value: result.metadata.num_tiles, color: 'text-emerald-400' },
                      { label: 'Tile Size',     value: `${result.metadata.tile_size}×${result.metadata.tile_size}`, color: 'text-blue-400' },
                      { label: 'Overlap',       value: `${result.metadata.overlap}px`, color: 'text-gray-300' },
                      { label: 'Method',        value: result.metadata.normalize_method, color: 'text-purple-400' },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl bg-white/3 border border-white/5 p-3">
                        <p className="text-xs text-gray-500">{s.label}</p>
                        <p className={`text-2xl font-bold capitalize ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tile preview */}
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Tile Preview (first 9)</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTiles.map((filename, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/10">
                        <img src={`${API_URL}/api/preprocess/tile/${filename}`} alt={`Tile ${idx + 1}`}
                          className="w-full h-auto" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100">Tile {idx + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {result.metadata.num_tiles > 9 && (
                    <p className="text-xs text-gray-500 mt-3 text-center">+{result.metadata.num_tiles - 9} more tiles saved to disk</p>
                  )}
                </div>

                {/* Tile table */}
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Tile Details</h2>
                  <div className="overflow-y-auto max-h-52 rounded-xl border border-white/5">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-900/80">
                        <tr className="text-gray-500">
                          <th className="py-2 px-3 text-left font-medium">Position</th>
                          <th className="py-2 px-3 text-left font-medium">Coverage</th>
                          <th className="py-2 px-3 text-left font-medium">Dimensions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.tiles.map((tile, idx) => (
                          <tr key={idx} className="border-t border-white/5 hover:bg-white/3">
                            <td className="py-1.5 px-3 text-gray-300">Row {tile.position[0]}, Col {tile.position[1]}</td>
                            <td className="py-1.5 px-3 text-emerald-400 font-medium">{(tile.coverage * 100).toFixed(1)}%</td>
                            <td className="py-1.5 px-3 text-gray-400">{tile.bbox[2]}×{tile.bbox[3]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass rounded-2xl border border-dashed border-white/10 p-20 text-center">
                <div className="text-6xl mb-4 opacity-30">🔧</div>
                <p className="text-sm text-gray-500 mb-1">Ready to process</p>
                <p className="text-xs text-gray-600">Select an image and click "Process Image" to start</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
