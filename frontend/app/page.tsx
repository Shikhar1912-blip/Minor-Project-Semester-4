'use client'

import { useEffect, useState, useRef } from 'react'

/* ────────────────────────── Module Data (no week labels) ────────────────────────── */
const features = [
  {
    icon: '🛰️',
    title: 'Satellite Intelligence',
    description: 'Real-time Sentinel-2 imagery acquisition for any location on Earth.',
    href: '/satellite',
    gradient: 'from-blue-500/20 to-cyan-500/5',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: '💧',
    title: 'Flood Detection',
    description: 'NDWI-based water body identification and flood extent mapping.',
    href: '/flood',
    gradient: 'from-cyan-500/20 to-teal-500/5',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: '🧠',
    title: 'Deep Learning',
    description: 'U-Net neural network for automated flood segmentation at scale.',
    href: '/model',
    gradient: 'from-violet-500/20 to-purple-500/5',
    iconBg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: '⚠️',
    title: 'Risk Assessment',
    description: 'Multi-hazard scoring with automated alert classification.',
    href: '/alerts',
    gradient: 'from-orange-500/20 to-red-500/5',
    iconBg: 'bg-orange-500/10 border-orange-500/20',
  },
  {
    icon: '🗺️',
    title: '3D Terrain & Evacuation',
    description: 'Interactive Mapbox terrain with real-time shelter routing.',
    href: '/map',
    gradient: 'from-emerald-500/20 to-green-500/5',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    description: 'City-by-city flood intelligence with population impact estimates.',
    href: '/dashboard',
    gradient: 'from-indigo-500/20 to-blue-500/5',
    iconBg: 'bg-indigo-500/10 border-indigo-500/20',
  },
]

const stats = [
  { value: '5+', label: 'Cities Monitored' },
  { value: '7.8M', label: 'Model Parameters' },
  { value: '10m', label: 'Spatial Resolution' },
  { value: '<2s', label: 'Detection Speed' },
]

const pipeline = [
  { step: '01', title: 'Acquire', desc: 'Download multi-band imagery from ESA Sentinel-2 constellation', icon: '📡' },
  { step: '02', title: 'Process', desc: 'Tile, normalize, and extract spectral bands (RGB + NIR)', icon: '⚙️' },
  { step: '03', title: 'Detect', desc: 'Run NDWI analysis and U-Net inference to map flood extent', icon: '🔍' },
  { step: '04', title: 'Respond', desc: 'Generate risk alerts, evacuation routes, and impact analytics', icon: '🚨' },
]

export default function Home() {
  const [scrollY, setScrollY] = useState(0)
  const [visible, setVisible] = useState<Set<string>>(new Set())
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible((prev) => new Set(prev).add(entry.target.id))
          }
        })
      },
      { threshold: 0.15 }
    )
    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const isVisible = (id: string) => visible.has(id)

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white overflow-x-hidden">

      {/* ═══════════ HERO — Full-viewport cinematic section ═══════════ */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background image with parallax */}
        <div
          className="absolute inset-0 z-0"
          style={{ transform: `translateY(${scrollY * 0.35}px)` }}
        >
          <img
            src="/hero-flood.jpg"
            alt=""
            className="w-full h-[120%] object-cover"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/60 via-[#0a0e1a]/40 to-[#0a0e1a]" />
          {/* Side vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e1a]/70 via-transparent to-[#0a0e1a]/70" />
        </div>

        {/* Animated network dots overlay */}
        <div className="absolute inset-0 z-[1] opacity-30">
          <div className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <div className="absolute top-[35%] left-[25%] w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-[25%] right-[20%] w-2 h-2 rounded-full bg-cyan-300 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[45%] right-[30%] w-1 h-1 rounded-full bg-blue-300 animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute bottom-[35%] left-[35%] w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs text-gray-300 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-Powered Disaster Intelligence Platform
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-[0.95]">
            <span className="block gradient-text">Terra-Form</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300/80 max-w-2xl mx-auto leading-relaxed mb-10">
            Transforming satellite imagery into actionable flood intelligence.
            <br className="hidden sm:block" />
            Detect. Assess. Respond — in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/dashboard"
              className="group px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all duration-300 hover:-translate-y-0.5"
            >
              Open Dashboard
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </a>
            <a
              href="/map"
              className="px-8 py-3.5 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
            >
              Explore 3D Map
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-gray-400/50">
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent animate-pulse" />
        </div>
      </section>


      {/* ═══════════ STATS BAR ═══════════ */}
      <section
        id="stats-bar"
        data-animate
        className={`relative z-10 -mt-1 border-y border-white/5 bg-[#0a0e1a]/90 backdrop-blur-xl transition-all duration-1000 ${isVisible('stats-bar') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold gradient-text">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ═══════════ PIPELINE — How It Works ═══════════ */}
      <section className="relative py-28 overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/3 blur-[120px]" />

        <div className="max-w-6xl mx-auto px-6">
          <div
            id="pipeline-header"
            data-animate
            className={`text-center mb-16 transition-all duration-1000 ${isVisible('pipeline-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-400 font-medium mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">From Satellite to Response</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {pipeline.map((p, i) => (
              <div
                key={p.step}
                id={`pipeline-${i}`}
                data-animate
                className={`relative group transition-all duration-700 ${isVisible(`pipeline-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Connector line */}
                {i < pipeline.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-40px)] h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}

                <div className="glass rounded-2xl p-6 h-full border border-white/5 hover:border-cyan-500/20 transition-all duration-500 group-hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{p.icon}</span>
                    <span className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-widest">{p.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════ FEATURES — Module Grid ═══════════ */}
      <section className="relative py-28">
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-violet-500/3 blur-[100px]" />

        <div className="max-w-6xl mx-auto px-6">
          <div
            id="features-header"
            data-animate
            className={`text-center mb-16 transition-all duration-1000 ${isVisible('features-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-violet-400 font-medium mb-3">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">End-to-End Flood Intelligence</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <a
                key={f.title}
                href={f.href}
                id={`feature-${i}`}
                data-animate
                className={`group glass rounded-2xl p-6 border border-white/5 bg-gradient-to-br ${f.gradient} hover:border-white/15 transition-all duration-500 hover:-translate-y-1 ${isVisible(`feature-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl ${f.iconBg} border flex items-center justify-center text-2xl mb-5`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-cyan-300 transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{f.description}</p>
                <span className="text-xs text-cyan-400/70 font-medium group-hover:text-cyan-300 transition-colors flex items-center gap-1">
                  Explore
                  <svg suppressHydrationWarning className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════ VISUAL SHOWCASE — Side-by-side hero images ═══════════ */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/3 to-transparent" />

        <div className="max-w-6xl mx-auto px-6">
          <div
            id="showcase-header"
            data-animate
            className={`text-center mb-12 transition-all duration-1000 ${isVisible('showcase-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-medium mb-3">Visual Intelligence</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">See the Impact. Plan the Response.</h2>
          </div>

          <div
            id="showcase-images"
            data-animate
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-1000 ${isVisible('showcase-images') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <div className="relative rounded-2xl overflow-hidden aspect-video group">
              <img src="/hero-flood-2.jpg" alt="Flood detection AI analysis" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <p className="text-xs text-cyan-400 font-medium mb-1">AI Network Analysis</p>
                <p className="text-sm text-gray-300">Neural pathways mapping flood patterns in real-time</p>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-video group">
              <img src="/hero-flood-3.jpg" alt="Urban flood monitoring" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <p className="text-xs text-emerald-400 font-medium mb-1">Urban Impact Assessment</p>
                <p className="text-sm text-gray-300">Ground-level flood detection with satellite correlation</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════ CTA SECTION ═══════════ */}
      <section
        id="cta"
        data-animate
        className={`relative py-28 transition-all duration-1000 ${isVisible('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-violet-500/5" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to explore?
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            Start analyzing satellite imagery, detect floods, and plan emergency response — all from one platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/satellite"
              className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all duration-300 hover:-translate-y-0.5"
            >
              Get Started
            </a>
            <a
              href="/compare"
              className="px-8 py-3.5 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/10 transition-all"
            >
              Before vs. After
            </a>
          </div>
        </div>
      </section>


      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-[10px] font-bold">T</div>
            <span className="text-sm text-gray-400">Terra-Form</span>
          </div>
          <p className="text-xs text-gray-600">AI-Driven Disaster Response Planning System</p>
          <div className="flex gap-4">
            <a href="/satellite" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Satellite</a>
            <a href="/flood" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Flood</a>
            <a href="/map" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Map</a>
            <a href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Dashboard</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
