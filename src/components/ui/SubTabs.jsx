'use client'

import './SubTabs.css'

/**
 * SubTabs: navigasi sub-halaman bergaya tab Overview.
 * tabs: [{ id, label, icon? }]
 */
export function SubTabs({ tabs, value, onChange, label }) {
  return (
    <div className="subtabs" role="tablist" aria-label={label}>
      {tabs.map(({ id, label: text, icon: Icon }) => {
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`subtab${active ? ' is-active' : ''}`}
            onClick={() => onChange(id)}
          >
            {Icon && (
              <span className="subtab-ico" aria-hidden="true">
                <Icon size={12} />
              </span>
            )}
            {text}
          </button>
        )
      })}
    </div>
  )
}