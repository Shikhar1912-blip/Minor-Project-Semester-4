import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], weight: ['300','400','500','600','700','800'] })

export const metadata: Metadata = {
  title: 'Terra-Form | AI Disaster Response',
  description: 'Real-time satellite imagery analysis for disaster management and evacuation planning',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-bold shadow-lg">T</div>
              <span className="font-semibold text-white tracking-tight">Terra-Form</span>
              <span className="text-xs text-gray-500 font-normal hidden sm:block">AI Disaster Response</span>
            </a>
            <div className="flex items-center gap-1">
              <a href="/satellite" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Satellite</a>
              <a href="/preprocess" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Preprocess</a>
              <a href="/flood" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Flood</a>
              <a href="/model" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">AI Model</a>
              <a href="/alerts" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Alerts</a>
              <a href="/map" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Map</a>
            </div>
          </div>
        </nav>
        {/* Page content pushed below navbar */}
        <div className="pt-14">
          {children}
        </div>
      </body>
    </html>
  )
}

