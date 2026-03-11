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
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">← Back to Dashboard</a>
          <h1 className="text-3xl font-bold mt-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🧠 Deep Learning — U-Net Flood Segmentation
          </h1>
          <p className="text-gray-400 mt-1">Week 5 · Train a U-Net on your satellite images, then run predictions</p>
        </div>

        {/* Model Status Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Model',       value: modelInfo?.status === 'ready' ? '✅ Trained' : '⏳ Not trained' },
            { label: 'Best IoU',    value: modelInfo?.val_iou != null ? modelInfo.val_iou.toFixed(4) : '—' },
            { label: 'Best F1',     value: modelInfo?.val_f1  != null ? modelInfo.val_f1.toFixed(4)  : '—' },
            { label: 'Model Size',  value: modelInfo?.model_size_kb ? `${modelInfo.model_size_kb} KB` : '—' },
          ].map(card => (
            <div key={card.label} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{card.label}</p>
              <p className="text-lg font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['train', 'predict'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab === 'train' ? '🏋️ Train Model' : '🔍 Run Prediction'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200">
            ❌ {error}
          </div>
        )}

        {/* ── TRAIN TAB ─────────────────────────────────────────────── */}
        {activeTab === 'train' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Config panel */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">⚙️ Training Configuration</h2>

              <div className="space-y-4">
                {/* Epochs */}
                <div>
                  <label className="text-sm text-gray-400">Epochs: <span className="text-white font-bold">{config.epochs}</span></label>
                  <input type="range" min={5} max={50} step={5} value={config.epochs}
                    onChange={e => setConfig(c => ({ ...c, epochs: +e.target.value }))}
                    className="w-full mt-1" />
                </div>

                {/* Batch size */}
                <div>
                  <label className="text-sm text-gray-400">Batch Size</label>
                  <select value={config.batch_size}
                    onChange={e => setConfig(c => ({ ...c, batch_size: +e.target.value }))}
                    className="w-full mt-1 bg-gray-700 text-white rounded-lg px-3 py-2">
                    {[2, 4, 8].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>

                {/* Learning rate */}
                <div>
                  <label className="text-sm text-gray-400">Learning Rate</label>
                  <select value={config.learning_rate}
                    onChange={e => setConfig(c => ({ ...c, learning_rate: +e.target.value }))}
                    className="w-full mt-1 bg-gray-700 text-white rounded-lg px-3 py-2">
                    {[0.001, 0.0001, 0.00001].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                {/* NDWI threshold */}
                <div>
                  <label className="text-sm text-gray-400">
                    NDWI Threshold (label generation): <span className="text-white font-bold">{config.ndwi_threshold}</span>
                  </label>
                  <input type="range" min={0.1} max={0.6} step={0.05} value={config.ndwi_threshold}
                    onChange={e => setConfig(c => ({ ...c, ndwi_threshold: +e.target.value }))}
                    className="w-full mt-1" />
                </div>

                {/* Validation split */}
                <div>
                  <label className="text-sm text-gray-400">
                    Validation Split: <span className="text-white font-bold">{Math.round(config.val_split * 100)}%</span>
                  </label>
                  <input type="range" min={0.1} max={0.4} step={0.05} value={config.val_split}
                    onChange={e => setConfig(c => ({ ...c, val_split: +e.target.value }))}
                    className="w-full mt-1" />
                </div>
              </div>

              <button
                onClick={handleStartTraining}
                disabled={trainStatus?.is_training}
                className="w-full mt-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {trainStatus?.is_training ? '⏳ Training in progress…' : '🚀 Start Training'}
              </button>

              {/* Info box */}
              <div className="mt-4 bg-purple-900/30 border border-purple-700 rounded-lg p-3">
                <p className="text-xs text-purple-300 font-semibold mb-1">ℹ️ How it works</p>
                <ul className="text-xs text-purple-200 space-y-1">
                  <li>• Cuts satellite images into 256×256 patches</li>
                  <li>• Uses NDWI to auto-generate water labels</li>
                  <li>• Trains a U-Net with BCE + Dice loss</li>
                  <li>• Saves best checkpoint by validation IoU</li>
                </ul>
              </div>
            </div>

            {/* Training progress */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">📈 Training Progress</h2>

              {trainStatus ? (
                <>
                  <p className={`text-sm font-semibold mb-3 ${statusColor(trainStatus.status)}`}>
                    Status: {trainStatus.status.toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-400 mb-4">{trainStatus.message}</p>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Epoch {trainStatus.epoch} / {trainStatus.total_epochs}</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Live metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Train Loss', value: trainStatus.train_loss?.toFixed(4) ?? '—' },
                      { label: 'Val Loss',   value: trainStatus.val_loss?.toFixed(4)   ?? '—' },
                      { label: 'Val IoU',    value: trainStatus.val_iou?.toFixed(4)    ?? '—' },
                      { label: 'Val F1',     value: trainStatus.val_f1?.toFixed(4)     ?? '—' },
                    ].map(m => (
                      <div key={m.label} className="bg-gray-700 rounded-lg p-3">
                        <p className="text-xs text-gray-400">{m.label}</p>
                        <p className="text-lg font-bold">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* History table */}
                  {trainStatus.history?.length > 0 && (
                    <div className="overflow-y-auto max-h-48">
                      <table className="w-full text-xs text-gray-300">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-700">
                            {['Epoch','T-Loss','V-Loss','IoU','F1'].map(h => (
                              <th key={h} className="pb-1 text-center">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...trainStatus.history].reverse().map(row => (
                            <tr key={row.epoch} className="border-b border-gray-800">
                              <td className="py-1 text-center">{row.epoch}</td>
                              <td className="py-1 text-center">{row.train_loss}</td>
                              <td className="py-1 text-center">{row.val_loss}</td>
                              <td className="py-1 text-center text-green-400">{row.val_iou}</td>
                              <td className="py-1 text-center text-blue-400">{row.val_f1}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-sm">No training started yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ── PREDICT TAB ──────────────────────────────────────────── */}
        {activeTab === 'predict' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Controls */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">🔍 Run Flood Prediction</h2>

              {modelInfo?.status !== 'ready' && (
                <div className="mb-4 bg-yellow-900/40 border border-yellow-600 rounded-lg p-3 text-yellow-200 text-sm">
                  ⚠️ No trained model found. Train a model on the Train tab first.
                </div>
              )}

              {/* Image selector */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Satellite Image</label>
                <select value={selectedImage}
                  onChange={e => setSelected(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2">
                  {images.length === 0
                    ? <option>No images available</option>
                    : images.map(img => (
                        <option key={img.filename} value={img.filename}>
                          {img.filename} ({img.size_mb} MB)
                        </option>
                      ))
                  }
                </select>
              </div>

              {/* Threshold */}
              <div className="mb-6">
                <label className="text-sm text-gray-400">
                  Prediction Threshold: <span className="text-white font-bold">{threshold}</span>
                </label>
                <input type="range" min={0.1} max={0.9} step={0.05} value={threshold}
                  onChange={e => setThreshold(+e.target.value)}
                  className="w-full mt-1" />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.1 (sensitive)</span><span>0.9 (strict)</span>
                </div>
              </div>

              <button
                onClick={handlePredict}
                disabled={predLoading || !selectedImage || modelInfo?.status !== 'ready'}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {predLoading ? '⏳ Running prediction…' : '▶️ Predict Flood'}
              </button>

              {/* Comparison note */}
              <div className="mt-4 bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-300 font-semibold mb-1">💡 U-Net vs NDWI</p>
                <p className="text-xs text-gray-400">
                  The U-Net was trained on NDWI labels so it learns spatial patterns beyond
                  simple thresholding — detecting flood edges, shadows, and mixed pixels more accurately.
                </p>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {predResult ? (
                <>
                  {/* Stats */}
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">📊 Prediction Statistics</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Water Area',   value: `${predResult.statistics.water_area_km2.toFixed(3)} km²`, color: 'text-blue-400' },
                        { label: 'Coverage',     value: `${predResult.statistics.water_percentage.toFixed(2)}%`,  color: 'text-cyan-400' },
                        { label: 'Water Pixels', value: predResult.statistics.water_pixels.toLocaleString(),       color: 'text-purple-400' },
                        { label: 'Mean Prob',    value: predResult.statistics.mean_probability.toFixed(4),         color: 'text-yellow-400' },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400">{s.label}</p>
                          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {predResult.metadata && (
                      <p className="mt-3 text-xs text-gray-500">
                        Model: Epoch {predResult.metadata.epoch} · IoU {predResult.metadata.val_iou} · F1 {predResult.metadata.val_f1}
                      </p>
                    )}
                  </div>

                  {/* Visualisations */}
                  {predResult.saved_files && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h2 className="text-xl font-semibold mb-4">🗺️ Visualisations</h2>
                      <div className="space-y-4">
                        {[
                          { key: 'heatmap',    label: 'Probability Heatmap' },
                          { key: 'water_mask', label: 'Water Mask' },
                          { key: 'overlay',    label: 'Overlay on RGB' },
                        ].map(({ key, label }) => (
                          predResult.saved_files![key as keyof typeof predResult.saved_files] && (
                            <div key={key}>
                              <p className="text-sm text-gray-400 mb-1">{label}</p>
                              <img
                                src={`${API_URL}/api/model/predictions/${predResult.saved_files![key as keyof typeof predResult.saved_files]}`}
                                alt={label}
                                className="w-full rounded-lg border border-gray-600"
                              />
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center text-gray-500">
                  <p className="text-4xl mb-2">🧠</p>
                  <p>Select an image and click Predict Flood to see the U-Net results here.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
