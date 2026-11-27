import { NavLink } from 'react-router-dom'
import { Plus, Shirt, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { t } from '../lib/i18n'

const tabs = [
  { to: '/closet', label: t.nav.closet, icon: Shirt },
  { to: '/upload', label: t.nav.upload, icon: Plus },
  { to: '/mix', label: t.nav.mix, icon: Sparkles },
]

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <NavLink to="/closet" className="font-display text-2xl font-semibold tracking-tight">
            {t.brand}
          </NavLink>
          <nav className="hidden items-center gap-2 sm:flex">
            {tabs.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `pill ${isActive ? 'pill-active' : ''}`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} /> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 sm:pb-16">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/90 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-2xl px-4 py-1.5 text-xs ${
                  isActive ? 'text-ink' : 'text-ink/50'
                }`
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} /> {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
