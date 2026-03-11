'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Types ──────────────────────────────────────────────────────────────
interface ImageInfo { filename: string; size_mb: number }

interface TrainingConfig {
  epochs: number
  batch_size: number
  learning_rate: number
  ndwi_threshold: number
  val_split: number
}

interface EpochRecord {
  epoch: number
  train_loss: number
  val_loss: number
  val_iou: number
  val_f1: number
}

interface TrainingStatus {
  is_training: boolean
  epoch: number
  total_epochs: number
  train_loss: number
  val_loss: number
  val_iou: number
  val_f1: number
  best_iou: number
  status: string
  message: string
  history: EpochRecord[]
  model_saved: boolean
  best_model_kb: number
}

interface PredictionResult {
  statistics: {
    total_pixels: number
    water_pixels: number
    water_area_km2: number
    water_percentage: number
    mean_probability: number
    threshold: number
  }
  saved_files?: { heatmap: string; water_mask: string; overlay: string }
  metadata?: { epoch: number; val_iou: number; val_f1: number }
}

interface ModelInfo {
  status: string
  epoch?: number
  val_iou?: number
  val_f1?: number
  model_size_kb?: number
}

// ── Component ─────────────────────────────────────────────────────────
export default function ModelPage() {
  const [activeTab, setActiveTab]     = useState<'train' | 'predict'>('train')
  const [images, setImages]           = useState<ImageInfo[]>([])
  const [selectedImage, setSelected]  = useState('')
  const [threshold, setThreshold]     = useState(0.5)
  const [trainStatus, setTrainStatus] = useState<TrainingStatus | null>(null)
  const [modelInfo, setModelInfo]     = useState<ModelInfo | null>(null)
  const [predResult, setPredResult]   = useState<PredictionResult | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [predLoading, setPredLoading] = useState(false)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [config, setConfig] = useState<TrainingConfig>({
    epochs: 20,
    batch_size: 4,
    learning_rate: 0.0001,
    ndwi_threshold: 0.3,
    val_split: 0.2,
  })

  // Initial data fetch
  useEffect(() => {
    fetchImages()
    fetchModelInfo()
    fetchStatus()
  }, [])

  // Clean up polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  // ── API calls ────────────────────────────────────────────────────────
  const fetchImages = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/preprocess/list-images`)
      setImages(res.data.images || [])
      if (res.data.images?.length) setSelected(res.data.images[0].filename)
    } catch { /* silently ignore */ }
  }

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/model/status`)
      setTrainStatus(res.data)
    } catch { /* silently ignore */ }
  }

  const fetchModelInfo = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/model/info`)
      setModelInfo(res.data)
    } catch { /* silently ignore */ }
  }

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      await fetchStatus()
      const res = await axios.get(`${API_URL}/api/model/status`)
      if (!res.data.is_training) {
        clearInterval(pollingRef.current!)
        pollingRef.current = null
        fetchModelInfo()
      }
    }, 2000)
  }

  const handleStartTraining = async () => {
    setError(null)
    try {
      await axios.post(`${API_URL}/api/model/train`, config)
      startPolling()
      fetchStatus()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to start training')
    }
  }

  const handlePredict = async () => {
    if (!selectedImage) return
    setPredLoading(true)
    setError(null)
    setPredResult(null)
    try {
      const res = await axios.post(`${API_URL}/api/model/predict`, {
        image_filename: selectedImage,
        threshold,
        save_results: true,
      })
      setPredResult(res.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Prediction failed')
    } finally {
      setPredLoading(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  const progressPct = trainStatus && trainStatus.total_epochs > 0
    ? Math.round((trainStatus.epoch / trainStatus.total_epochs) * 100)
    : 0

  const statusColor = (s?: string) => {
    if (!s) return 'text-gray-400'
    if (s === 'complete')  return 'text-green-400'
    if (s === 'training')  return 'text-yellow-400'
    if (s === 'error')     return 'text-red-400'
    return 'text-gray-400'
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen grid-bg text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <a href="/" className="hover:text-gray-300 transition-colors">Home</a>
            <span>/</span>
            <span className="text-gray-300">Deep Learning Model</span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl">🧠</div>
            <div>
              <h1 className="text-3xl font-bold text-white">U-Net Flood Segmentation</h1>
              <p className="text-sm text-gray-500">Deep learning model · Week 5</p>
            </div>
          </div>

          {/* Model stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Model Status', value: modelInfo?.status === 'ready' ? 'Trained ✓' : 'Not trained', color: modelInfo?.status === 'ready' ? 'text-emerald-400' : 'text-gray-400' },
              { label: 'Best IoU',     value: modelInfo?.val_iou != null ? modelInfo.val_iou.toFixed(4) : '—', color: 'text-blue-400' },
              { label: 'Best F1',      value: modelInfo?.val_f1  != null ? modelInfo.val_f1.toFixed(4)  : '—', color: 'text-purple-400' },
              { label: 'Model Size',   value: modelInfo?.model_size_kb ? `${modelInfo.model_size_kb} KB` : '—', color: 'text-gray-300' },
            ].map(card => (
              <div key={card.label} className="glass rounded-xl p-4 border border-white/5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
                <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: 'train', label: 'Train Model', icon: '🏋️' },
            { id: 'predict', label: 'Run Prediction', icon: '🔍' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 glass rounded-xl p-4 border border-red-500/20 bg-red-500/5">
            <p className="text-sm text-red-400">⚠️ {error}</p>
          </div>
        )}

        {/* ── TRAIN TAB ─────────────────────────────────────────────── */}
        {activeTab === 'train' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Config */}
            <div className="lg:col-span-2 glass rounded-2xl p-5 border border-white/5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Training Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400">Epochs: <span className="text-white font-mono">{config.epochs}</span></label>
                  <input type="range" min={5} max={50} step={5} value={config.epochs}
                    onChange={e => setConfig(c => ({ ...c, epochs: +e.target.value }))}
                    className="w-full mt-1.5 accent-purple-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Batch Size</label>
                  <select value={config.batch_size}
                    onChange={e => setConfig(c => ({ ...c, batch_size: +e.target.value }))}
                    className="input-dark">
                    {[2, 4, 8].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Learning Rate</label>
                  <select value={config.learning_rate}
                    onChange={e => setConfig(c => ({ ...c, learning_rate: +e.target.value }))}
                    className="input-dark">
                    {[0.001, 0.0001, 0.00001].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">NDWI Threshold: <span className="text-white font-mono">{config.ndwi_threshold}</span></label>
                  <input type="range" min={0.1} max={0.6} step={0.05} value={config.ndwi_threshold}
                    onChange={e => setConfig(c => ({ ...c, ndwi_threshold: +e.target.value }))}
                    className="w-full mt-1.5 accent-purple-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Validation Split: <span className="text-white font-mono">{Math.round(config.val_split * 100)}%</span></label>
                  <input type="range" min={0.1} max={0.4} step={0.05} value={config.val_split}
                    onChange={e => setConfig(c => ({ ...c, val_split: +e.target.value }))}
                    className="w-full mt-1.5 accent-purple-500" />
                </div>
              </div>
              <button onClick={handleStartTraining} disabled={trainStatus?.is_training}
                className="btn-primary w-full mt-5 flex items-center justify-center gap-2" style={{background: trainStatus?.is_training ? undefined : 'linear-gradient(135deg,#7c3aed,#9333ea)'}}>
                {trainStatus?.is_training
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Training…</>
                  : '🚀 Start Training'}
              </button>
              <div className="mt-4 rounded-xl bg-purple-500/5 border border-purple-500/15 p-3">
                <p className="text-xs text-purple-300 font-semibold mb-2">How it works</p>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>• Cuts images into 256×256 patches</p>
                  <p>• Auto-generates flood labels via NDWI</p>
                  <p>• Trains U-Net with BCE + Dice loss</p>
                  <p>• Saves best checkpoint by validation IoU</p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="lg:col-span-3 glass rounded-2xl p-5 border border-white/5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Training Progress</h2>
              {trainStatus ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-semibold ${statusColor(trainStatus.status)}`}>
                      {trainStatus.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{trainStatus.message}</span>
                  </div>
                  <div className="mb-5">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Epoch {trainStatus.epoch} / {trainStatus.total_epochs}</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { label: 'Train Loss', value: trainStatus.train_loss?.toFixed(4) ?? '—' },
                      { label: 'Val Loss',   value: trainStatus.val_loss?.toFixed(4)   ?? '—' },
                      { label: 'Val IoU',    value: trainStatus.val_iou?.toFixed(4)    ?? '—' },
                      { label: 'Val F1',     value: trainStatus.val_f1?.toFixed(4)     ?? '—' },
                    ].map(m => (
                      <div key={m.label} className="rounded-xl bg-white/3 border border-white/5 p-3">
                        <p className="text-xs text-gray-500">{m.label}</p>
                        <p className="text-xl font-bold text-white">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  {trainStatus.history?.length > 0 && (
                    <div className="overflow-y-auto max-h-44 rounded-xl border border-white/5">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-900/80">
                          <tr className="text-gray-500">
                            {['Epoch','T-Loss','V-Loss','IoU','F1'].map(h => (
                              <th key={h} className="py-2 px-3 text-center font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...trainStatus.history].reverse().map(row => (
                            <tr key={row.epoch} className="border-t border-white/5 hover:bg-white/3">
                              <td className="py-1.5 px-3 text-center text-gray-400">{row.epoch}</td>
                              <td className="py-1.5 px-3 text-center text-gray-300">{row.train_loss}</td>
                              <td className="py-1.5 px-3 text-center text-gray-300">{row.val_loss}</td>
                              <td className="py-1.5 px-3 text-center text-emerald-400 font-medium">{row.val_iou}</td>
                              <td className="py-1.5 px-3 text-center text-blue-400 font-medium">{row.val_f1}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-600 text-sm">No training started yet</div>
              )}
            </div>
          </div>
        )}

        {/* ── PREDICT TAB ──────────────────────────────────────────── */}
        {activeTab === 'predict' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Controls */}
            <div className="lg:col-span-2 space-y-5">
              <div className="glass rounded-2xl p-5 border border-white/5">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Run Prediction</h2>

                {modelInfo?.status !== 'ready' && (
                  <div className="mb-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <p className="text-xs text-yellow-300">⚠️ No trained model found. Train a model first.</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Satellite Image</label>
                    <select value={selectedImage} onChange={e => setSelected(e.target.value)} className="input-dark">
                      {images.length === 0
                        ? <option>No images available</option>
                        : images.map(img => (
                            <option key={img.filename} value={img.filename}>{img.filename} ({img.size_mb} MB)</option>
                          ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Threshold: <span className="text-white font-mono">{threshold}</span></label>
                    <input type="range" min={0.1} max={0.9} step={0.05} value={threshold}
                      onChange={e => setThreshold(+e.target.value)}
                      className="w-full mt-1.5 accent-purple-500" />
                    <div className="flex justify-between text-xs text-gray-600 mt-1"><span>Sensitive</span><span>Strict</span></div>
                  </div>
                  <button onClick={handlePredict} disabled={predLoading || !selectedImage || modelInfo?.status !== 'ready'}
                    className="btn-primary w-full flex items-center justify-center gap-2" style={{background: 'linear-gradient(135deg,#059669,#10b981)'}}>
                    {predLoading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Running…</>
                      : '▶ Predict Flood'}
                  </button>
                </div>
              </div>

              <div className="glass rounded-2xl p-5 border border-purple-500/10">
                <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider mb-2">U-Net vs NDWI</p>
                <p className="text-xs text-gray-400 leading-relaxed">The U-Net learns spatial patterns beyond simple thresholding — detecting flood edges, shadows, and mixed pixels more accurately.</p>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3 space-y-5">
              {predResult ? (
                <>
                  <div className="glass rounded-2xl p-5 border border-white/5">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Prediction Statistics</h2>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {[
                        { label: 'Water Area',   value: `${predResult.statistics.water_area_km2.toFixed(3)} km²`, color: 'text-cyan-400' },
                        { label: 'Coverage',     value: `${predResult.statistics.water_percentage.toFixed(2)}%`, color: 'text-blue-400' },
                        { label: 'Water Pixels', value: predResult.statistics.water_pixels.toLocaleString(), color: 'text-purple-400' },
                        { label: 'Mean Prob',    value: predResult.statistics.mean_probability.toFixed(4), color: 'text-emerald-400' },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl bg-white/3 border border-white/5 p-3">
                          <p className="text-xs text-gray-500">{s.label}</p>
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    {predResult.metadata && (
                      <p className="text-xs text-gray-600">Model: Epoch {predResult.metadata.epoch} · IoU {predResult.metadata.val_iou} · F1 {predResult.metadata.val_f1}</p>
                    )}
                  </div>

                  {predResult.saved_files && (
                    <div className="glass rounded-2xl p-5 border border-white/5">
                      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Visualisations</h2>
                      <div className="space-y-4">
                        {[
                          { key: 'heatmap',    label: 'Probability Heatmap' },
                          { key: 'water_mask', label: 'Water Mask' },
                          { key: 'overlay',    label: 'Overlay on RGB' },
                        ].map(({ key, label }) => (
                          predResult.saved_files![key as keyof typeof predResult.saved_files] && (
                            <div key={key}>
                              <p className="text-xs text-gray-400 mb-2">{label}</p>
                              <img src={`${API_URL}/api/model/predictions/${predResult.saved_files![key as keyof typeof predResult.saved_files]}`}
                                alt={label} className="w-full rounded-xl border border-white/10" />
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="glass rounded-2xl border border-dashed border-white/10 p-16 text-center">
                  <div className="text-5xl mb-4 opacity-30">🧠</div>
                  <p className="text-sm text-gray-500">Run a prediction to see U-Net results here</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}

