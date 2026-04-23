'use client'

import { useEffect, useState, useRef } from 'react'

/* ────────────────────────── Module Data ────────────────────────── */
const features = [
  {
    icon: '🛰️',
    title: 'Satellite Intelligence',
    description: 'Real-time Sentinel-2 imagery acquisition for any location on Earth.',
    href: '/satellite',
    gradient: 'from-blue-500/20 to-cyan-500/5',
    iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    bentoSpan: 'col-span-1 md:col-span-2 lg:col-span-4 row-span-2'
  },
  {
    icon: '💧',
    title: 'Flood Detection',
    description: 'NDWI-based water body identification and flood extent mapping.',
    href: '/flood',
    gradient: 'from-cyan-500/20 to-teal-500/5',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    bentoSpan: 'col-span-1 md:col-span-1 lg:col-span-2 row-span-1'
  },
  {
    icon: '🧠',
    title: 'Deep Learning',
    description: 'U-Net neural network for automated flood segmentation at scale.',
    href: '/model',
    gradient: 'from-violet-500/20 to-purple-500/5',
    iconBg: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    bentoSpan: 'col-span-1 md:col-span-1 lg:col-span-2 row-span-1'
  },
  {
    icon: '⚠️',
    title: 'Risk Assessment',
    description: 'Multi-hazard scoring with automated alert classification.',
    href: '/alerts',
    gradient: 'from-orange-500/20 to-red-500/5',
    iconBg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    bentoSpan: 'col-span-1 md:col-span-1 lg:col-span-3 row-span-1'
  },
  {
    icon: '🗺️',
    title: '3D Terrain Route',
    description: 'Interactive Mapbox routing constraints.',
    href: '/map',
    gradient: 'from-emerald-500/20 to-green-500/5',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    bentoSpan: 'col-span-1 md:col-span-1 lg:col-span-2 row-span-1'
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    description: 'City flood intelligence with impact estimates.',
    href: '/dashboard',
    gradient: 'from-indigo-500/20 to-blue-500/5',
    iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    bentoSpan: 'col-span-1 md:col-span-2 lg:col-span-3 row-span-1'
  },
]

const stats = [
  { value: '5+', label: 'Cities Monitored' },
  { value: '7.8M', label: 'Model Parameters' },
  { value: '10m', label: 'Spatial Resolution' },
  { value: '<2s', label: 'Detection Speed' },
]

const pipeline = [
  { step: '01', title: 'Acquisition via Orbit', desc: 'Directly interfacing with ESA Sentinel-2 satellite constellation to pull multi-spectral imagery across global urban geometries.', icon: '📡', img: '/hero-flood.jpg' },
  { step: '02', title: 'Algorithmic Normalisation', desc: 'Extracting essential spectral bands, normalising exposure, and generating high-contrast terrain tiles for deep learning readiness.', icon: '⚙️', img: '/hero-flood-2.jpg' },
  { step: '03', title: 'Water Segmentation AI', desc: 'Deploying our custom-trained U-Net architectures alongside NDWI analyses to precisely map surface water anomalies in real-time.', icon: '🔍', img: '/hero-flood-3.jpg' },
  { step: '04', title: 'Ground Response Protocol', desc: 'Synthesizing the output into actionable evacuation routes, population impact predictions, and severity-mapped alerts.', icon: '🚨', img: '/hero-flood.jpg' },
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
    <main suppressHydrationWarning className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden font-sans">
      
      {/* Dynamic ambient background glow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[150px] rounded-full" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-violet-600/5 blur-[120px] rounded-full" />
      </div>

      {/* ═══════════ HERO — Retained from your commit ═══════════ */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{ transform: `translateY(${scrollY * 0.35}px)` }}
        >
          <img
            src="/hero-flood.jpg"
            alt=""
            className="w-full h-[120%] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/70 via-[#0a0e1a]/50 to-[#0a0e1a]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e1a]/80 via-transparent to-[#0a0e1a]/80" />
        </div>

        <div className="absolute inset-0 z-[1] opacity-30">
          <div className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <div className="absolute top-[35%] left-[25%] w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-[25%] right-[20%] w-2 h-2 rounded-full bg-cyan-300 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[45%] right-[30%] w-1 h-1 rounded-full bg-blue-300 animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute bottom-[35%] left-[35%] w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-xl text-xs text-cyan-300 mb-8 uppercase tracking-widest font-medium shadow-[0_0_30px_rgba(34,211,238,0.05)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            AI-Powered Disaster Intelligence
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-[6rem] font-extrabold tracking-tighter mb-6 leading-[0.95]">
            <span className="text-white">Terra-Form</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10 font-light">
            Transforming satellite imagery into actionable flood intelligence.
            <br className="hidden sm:block" />
            Detect. Assess. Respond — in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <a
              href="/dashboard"
              className="group px-8 py-4 bg-white text-black font-semibold rounded-2xl hover:bg-gray-100 transition-all duration-300 hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.15)] flex items-center gap-2"
            >
              Open Dashboard
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </a>
            <a
              href="/map"
              className="px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md"
            >
              Explore 3D Map
            </a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ═══════════ DATA TAPE (Replacement for basic Stats) ═══════════ */}
      <section className="relative z-20 w-full overflow-hidden border-y border-white/[0.03] bg-black/40 backdrop-blur-xl">
        <div className="flex w-[200%] animate-[marquee_40s_linear_infinite] opacity-70">
          {[...stats, ...stats, ...stats].map((s, i) => (
            <div key={i} className="flex-1 shrink-0 py-6 px-12 border-r border-white/5 flex items-center justify-center gap-4">
              <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">{s.value}</span>
              <span className="text-xs text-gray-500 uppercase tracking-[0.2em]">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ STICKY PIPELINE (Replacement for box row) ═══════════ */}
      <section className="relative z-10 pt-32 pb-40 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-20">
          
          <div className="lg:w-5/12 relative">
            <div className="sticky top-32">
              <div className="inline-block px-3 py-1 mb-6 text-xs text-emerald-400 font-bold uppercase tracking-widest border border-emerald-500/20 rounded bg-emerald-500/10">Architecture</div>
              <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter leading-none mb-8 text-white">Dynamic<br/><span className="text-gray-600">Pipeline.</span></h2>
              <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                Our autonomous system processes raw satellite imagery into human-readable evacuation strategies in a matter of seconds, leveraging state-of-the-art vision models.
              </p>
              
              <div className="hidden lg:block mt-16 p-1 rounded-2xl bg-gradient-to-br from-white/10 to-transparent p-[1px]">
                <div className="bg-[#0a0e1a]/90 backdrop-blur-md rounded-[15px] p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Live System Status</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full w-[85%] bg-blue-500 rounded-full" /></div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full w-[60%] bg-cyan-400 rounded-full" /></div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full w-[95%] bg-violet-500 rounded-full" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-7/12 space-y-8">
            {pipeline.map((p, i) => (
              <div 
                key={p.step} 
                id={`pipeline-${i}`}
                data-animate
                className={`group relative p-[1px] rounded-3xl overflow-hidden bg-gradient-to-br from-white/10 via-transparent to-transparent transition-all duration-1000 ${isVisible(`pipeline-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}
              >
                <div className="bg-[#0a0e1a]/80 backdrop-blur-xl rounded-[23px] overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="p-8 sm:p-10 flex-1 flex flex-col justify-center relative">
                      <div className="absolute top-0 right-0 p-8 text-9xl font-black text-white/[0.02] -z-10">{p.step}</div>
                      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl mb-6 shadow-xl">
                        {p.icon}
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{p.title}</h3>
                      <p className="text-gray-400 leading-relaxed font-light">{p.desc}</p>
                    </div>
                    {/* Integrated image block for the step */}
                    <div className="sm:w-[250px] relative overflow-hidden hidden sm:block">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e1a]/80 to-transparent z-10" />
                      <img src={p.img} alt={p.title} className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ BENTO FEATURES GRID ═══════════ */}
      <section className="relative z-10 py-32 px-6 bg-black/20 border-y border-white/5 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl sm:text-6xl font-bold tracking-tighter text-white">Full-Spectrum<br/>Capabilities.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[220px]">
            {features.map((f, i) => (
              <a
                key={f.title}
                href={f.href}
                id={`feature-${i}`}
                data-animate
                className={`${f.bentoSpan} group relative flex flex-col justify-between overflow-hidden rounded-[2rem] p-[1px] bg-gradient-to-br from-white/10 to-transparent transition-all duration-700 hover:scale-[1.01] ${isVisible(`feature-${i}`) ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a]/90 to-[#0c1222]/90 backdrop-blur-xl rounded-[31px]" />
                
                {/* Glow effect on hover */}
                <div className={`absolute -inset-[50%] bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-1000 blur-3xl`} />

                <div className="relative z-10 p-8 h-full flex flex-col">
                  <div className="flex justify-between items-start">
                    <div className={`w-14 h-14 rounded-2xl ${f.iconBg} flex items-center justify-center text-3xl mb-5 shadow-lg group-hover:rotate-[10deg] transition-all duration-500`}>
                      {f.icon}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                      <span className="text-white text-xs">↗</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed font-light line-clamp-2 md:line-clamp-none">{f.description}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PREMIUM CTA ═══════════ */}
      <section className="relative z-10 py-40 px-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] rounded-full bg-blue-600/5 blur-[100px]" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-20">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm font-medium mb-8 backdrop-blur-md">
            Deployment Ready
          </div>
          <h2 className="text-5xl sm:text-7xl font-bold text-white mb-6 tracking-tighter">
            Take Control.
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Unify orbital imagery and ground-level response systems within seconds. The future of emergency intelligence is here.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <a href="/satellite" className="w-full sm:w-auto px-10 py-5 bg-white text-[#0a0e1a] font-bold rounded-2xl hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] text-lg">
              Start Monitoring
            </a>
            <a href="/compare" className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 text-white font-medium rounded-2xl hover:bg-white/10 transition-all backdrop-blur-sm text-lg">
              View Comparisons
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ MINIMAL FOOTER ═══════════ */}
      <footer className="relative z-10 border-t border-white/[0.05] bg-black/20 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">T</div>
            <span className="text-sm font-bold tracking-tight text-white uppercase">Terra-Form</span>
          </div>
          <p className="text-xs text-gray-500 font-light tracking-wide uppercase">AI-Driven Disaster Intelligence &copy; {new Date().getFullYear()}</p>
          <div className="flex gap-6">
            {['Satellite', 'Flood', 'Map', 'Dashboard'].map(link => (
              <a key={link} href={`/${link.toLowerCase()}`} className="text-xs text-gray-500 hover:text-white uppercase tracking-wider font-semibold transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
      
      {/* Required style for marquee animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-\\[marquee_40s_linear_infinite\\] {
          animation: marquee 40s linear infinite;
        }
      `}} />
    </main>
  )
}
