import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="surface grid place-items-center gap-4 px-6 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-ink/50">404</p>
      <h1 className="font-display text-4xl font-semibold">Halaman tidak ditemukan</h1>
      <Link to="/closet" className="pill pill-active">
        Kembali ke lemari
      </Link>
    </div>
  )
}
