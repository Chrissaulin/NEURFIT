import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-24 text-center sm:px-6 lg:px-10">
      <p className="eyebrow text-bone/50">404</p>
      <h1 className="mt-3 font-slab uppercase text-4xl sm:text-6xl">HALAMAN TIDAK DITEMUKAN</h1>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full bg-bone px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-coal"
      >
        KEMBALI KE BERANDA ↗
      </Link>
    </div>
  )
}
