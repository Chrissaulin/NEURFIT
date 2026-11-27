import { Link, NavLink } from 'react-router-dom'
import { Camera, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { t } from '../lib/i18n'

const tabs = [
  { to: '/', label: t.nav.home, end: true },
  { to: '/closet', label: t.nav.closet },
  { to: '/upload', label: t.nav.upload },
  { to: '/mix', label: t.nav.mix },
]

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative whitespace-nowrap px-1.5 py-1 text-[10px] uppercase tracking-[0.08em] transition-colors md:px-3 md:text-[11px] md:tracking-[0.16em] ${
          isActive ? 'font-bold text-bone' : 'text-bone/70 hover:text-bone'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {isActive && (
            <span className="absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-bone" />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bone">
      <div className="mojave-distressed-surface relative overflow-clip rounded-b-[32px] pb-10 text-bone">
        <div className="mojave-grain absolute inset-0 z-0" />

        <header className="sticky top-0 z-50">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
            <Link to="/" className="font-slab text-xl uppercase tracking-tight text-bone sm:text-2xl">
              {t.brand}
            </Link>

            <nav className="glass-pill hidden items-center gap-1 px-3 py-2 md:flex">
              {tabs.map((tab) => (
                <NavItem key={tab.to} {...tab} />
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                to="/upload"
                aria-label="Tambah"
                className="glass-pill grid h-10 w-10 place-items-center text-bone/80 transition-colors hover:text-bone"
              >
                <Camera className="h-4 w-4" strokeWidth={1.5} />
              </Link>
              <Link
                to="/mix"
                aria-label="Mix & Match"
                className="glass-pill grid h-10 w-10 place-items-center text-bone/80 transition-colors hover:text-bone"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          <div className="mx-auto max-w-[1440px] px-4 pb-3 md:hidden">
            <nav className="glass-pill flex items-center justify-between px-2 py-2">
              {tabs.map((tab) => (
                <NavItem key={tab.to} {...tab} />
              ))}
            </nav>
          </div>
        </header>

        <div className="pointer-events-none absolute right-6 top-1/3 z-20 hidden text-ochre sm:block">
          <div className="spin-slow relative grid h-5 w-5 place-items-center rounded-full border border-ochre/70">
            <span className="h-1 w-1 rounded-full bg-ochre" />
          </div>
        </div>

        <main className="relative z-10">{children}</main>
      </div>

      <div className="flex items-center justify-between bg-bone px-6 py-5 text-[10px] uppercase tracking-[0.16em] text-coal sm:px-12">
        <span>© 2026 NEURFIT</span>
        <span className="hidden sm:inline">SURABAYA, INDONESIA</span>
      </div>
    </div>
  )
}
