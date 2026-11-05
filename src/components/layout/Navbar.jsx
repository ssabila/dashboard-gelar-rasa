'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, GitCompareArrows, HeartPulse, LayoutDashboard, Lightbulb, MapPinned, Wind } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/overview',          label: 'Overview',              icon: LayoutDashboard },
  { href: '/kualitas-udara',    label: 'Kualitas Udara',        icon: Wind },
  { href: '/korelasi',          label: 'Korelasi Polutan',      icon: GitCompareArrows },
  { href: '/pm25-kesehatan',    label: 'PM2.5 & Kesehatan',     icon: HeartPulse },
  { href: '/kecukupan-stasiun', label: 'Kecukupan Stasiun',     icon: MapPinned },
  { href: '/insight',           label: 'Insight & Rekomendasi', icon: Lightbulb },
]

// Pill "Live monitoring aktif" dihapus: datanya sintetis & berhenti 14 Okt 2026, jadi bukan live.
export function Navbar() {
  const pathname = usePathname()
  return (
    <aside className="app-sidebar" role="navigation" aria-label="Navigasi utama">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true"><Activity size={16} strokeWidth={2.5} /></div>
        <div><strong>AQMS</strong><span>Gelar Rasa 2026</span></div>
      </div>
      <nav>
        <p className="sidebar-label">Menu</p>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <li key={href}>
                <Link href={href} className={`sidebar-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-footer-icon" aria-hidden="true"><Activity size={14} /></div>
        <div><span>Periode data</span><strong>Jan 2024 — Okt 2026</strong></div>
      </div>
    </aside>
  )
}
