'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  GitCompareArrows,
  HeartPulse,
  LayoutDashboard,
  Lightbulb,
  MapPinned,
  Wind,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/kualitas-udara', label: 'Kualitas Udara', icon: Wind },
  { href: '/korelasi', label: 'Korelasi Polutan', icon: GitCompareArrows },
  { href: '/pm25-kesehatan', label: 'PM2.5 & Kesehatan', icon: HeartPulse },
  { href: '/kecukupan-stasiun', label: 'Kecukupan Stasiun', icon: MapPinned },
  { href: '/insight', label: 'Insight & Rekomendasi', icon: Lightbulb },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true"><Activity size={18} /></div>
        <div>
          <strong>AQMS</strong>
          <span>GELAR RASA 2026</span>
        </div>
      </div>

      <div className="sidebar-context">
        <span className="status-dot" aria-hidden="true" />
        <span>Live monitoring</span>
      </div>

      <nav aria-label="Navigasi dashboard">
        <p className="sidebar-label">Workspace</p>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`sidebar-link${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={17} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-icon"><Activity size={15} /></div>
        <div>
          <span>Dataset</span>
          <strong>Jan 2024 - Okt 2026</strong>
        </div>
      </div>
    </aside>
  )
}
