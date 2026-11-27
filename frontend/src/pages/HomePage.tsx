import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Slot } from '../types'
import { Reveal } from '../lib/motion'
import { Eyebrow, GarmentImage } from '../components/ui'

type Photo = { label: string; img: string; slot: Slot; to: string }

const ARRIVALS: Photo[] = [
  { label: 'SWEATER POLKADOT', img: '/demo/top-2.jpg', slot: 'top', to: '/mix?anchor=t2' },
  { label: 'BOMBER HITAM', img: '/demo/top-3.jpg', slot: 'top', to: '/mix?anchor=t3' },
  { label: 'KEMEJA PUTIH', img: '/demo/top-1.jpg', slot: 'top', to: '/mix?anchor=t1' },
  { label: 'JEANS BIRU', img: '/demo/bottom-1.jpg', slot: 'bottom', to: '/mix?anchor=b1' },
  { label: 'SNEAKERS MERAH', img: '/demo/shoes-1.jpg', slot: 'shoes', to: '/mix?anchor=s1' },
]

const POPULAR: Photo[] = [
  { label: 'TOPS & SHIRTS', img: '/demo/top-1.jpg', slot: 'top', to: '/closet?slot=top' },
  { label: 'TROUSERS', img: '/demo/bottom-2.jpg', slot: 'bottom', to: '/closet?slot=bottom' },
  { label: 'DENIM', img: '/demo/bottom-1.jpg', slot: 'bottom', to: '/closet?slot=bottom' },
  { label: 'HEELS', img: '/demo/shoes-3.jpg', slot: 'shoes', to: '/closet?slot=shoes' },
  { label: 'BAGS', img: '/demo/accessory-1.jpg', slot: 'accessory', to: '/closet?slot=accessory' },
]

const CATEGORIES = [
  { label: 'ATASAN', count: 3, to: '/closet?slot=top' },
  { label: 'BAWAHAN', count: 2, to: '/closet?slot=bottom' },
  { label: 'SEPATU', count: 3, to: '/closet?slot=shoes' },
  { label: 'AKSESORIS', count: 2, to: '/closet?slot=accessory' },
  { label: 'SEMUA KOLEKSI', count: 10, to: '/closet' },
]

const LOOKBOOK = [
  { label: 'LOOK 01', img: '/demo/top-1.jpg', slot: 'top' as Slot, rotate: '-rotate-6' },
  { label: 'LOOK 02', img: '/demo/top-3.jpg', slot: 'top' as Slot, rotate: '-rotate-3' },
  { label: 'LOOK 03', img: '/demo/top-2.jpg', slot: 'top' as Slot, rotate: 'rotate-0' },
  { label: 'LOOK 04', img: '/demo/bottom-2.jpg', slot: 'bottom' as Slot, rotate: 'rotate-3' },
  { label: 'LOOK 05', img: '/demo/shoes-1.jpg', slot: 'shoes' as Slot, rotate: 'rotate-6' },
]

const MODULES = [
  { title: 'AUTO-TAGGING CNN', img: '/demo/top-2.jpg', slot: 'top' as Slot, to: '/upload' },
  { title: 'MIX & MATCH BI-LSTM', img: '/demo/shoes-3.jpg', slot: 'shoes' as Slot, to: '/mix' },
  { title: 'LEMARI DIGITAL', img: '/demo/bottom-1.jpg', slot: 'bottom' as Slot, to: '/closet' },
]

const FOOTER = [
  { title: 'NAVIGASI', links: [{ label: 'BERANDA', to: '/' }, { label: 'LEMARI', to: '/closet' }, { label: 'TAMBAH +', to: '/upload' }, { label: 'MIX & MATCH', to: '/mix' }] },
  { title: 'KATEGORI', links: [{ label: 'ATASAN', to: '/closet?slot=top' }, { label: 'BAWAHAN', to: '/closet?slot=bottom' }, { label: 'SEPATU', to: '/closet?slot=shoes' }, { label: 'AKSESORIS', to: '/closet?slot=accessory' }] },
  { title: 'ARSITEKTUR', links: [{ label: 'MOBILENETV2', to: '/upload' }, { label: 'BI-LSTM', to: '/mix' }, { label: 'EMBEDDING 256', to: '/mix' }] },
  { title: 'DATASET', links: [{ label: 'FASHION PRODUCT', to: '/closet' }, { label: 'POLYVORE', to: '/mix' }, { label: 'TENTANG', to: '/' }] },
]

function Section({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-24 lg:px-10 ${className}`}>
      {children}
    </section>
  )
}

function PhotoCard({ img, label, slot, to }: Photo) {
  return (
    <Link to={to} className="group block">
      <GarmentImage
        src={img}
        alt={label}
        slot={slot}
        className="aspect-square w-full transition-transform duration-700 group-hover:scale-105"
      />
      <p className="mt-3 flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-bone/80 transition-colors group-hover:text-bone">
        {label} <span aria-hidden>↗</span>
      </p>
    </Link>
  )
}

export default function HomePage() {
  const [model, setModel] = useState(0)

  return (
    <div>
      <Section className="pt-10 sm:pt-14">
        <div className="relative mx-auto max-w-5xl">
          <Reveal>
            <GarmentImage src="/demo/top-3.jpg" alt="Editorial" slot="top" className="aspect-[16/10] w-full" />
          </Reveal>
          <Reveal delay={0.15} x={-80} className="absolute -left-4 top-1/2 hidden w-36 -translate-y-1/2 sm:block lg:-left-14 lg:w-48">
            <GarmentImage src="/demo/shoes-1.jpg" alt="Shoes" slot="shoes" className="aspect-square w-full border border-bone/15" />
          </Reveal>
          <Reveal delay={0.25} x={80} className="absolute -right-4 -top-6 hidden w-36 sm:block lg:-right-14 lg:w-48">
            <GarmentImage src="/demo/shoes-2.jpg" alt="Shoes" slot="shoes" className="aspect-square w-full border border-bone/15" />
          </Reveal>
          <Reveal delay={0.35} className="relative mx-auto -mt-12 w-[92%] max-w-[460px] sm:-mt-16">
            <div className="grid grid-cols-2 border border-bone/15 bg-coal/85 backdrop-blur">
              <div className="flex flex-col justify-center p-5">
                <p className="font-slab text-xl uppercase leading-none">EXPLORE YOUR TRUE STYLE</p>
                <p className="mt-3 text-[9px] uppercase tracking-[0.16em] text-muted">
                  CNN AUTO-TAGGING &amp; BI-LSTM MIX-AND-MATCH ↗
                </p>
              </div>
              <GarmentImage src="/demo/bottom-2.jpg" alt="Rail" slot="bottom" className="aspect-square w-full" />
            </div>
          </Reveal>
        </div>
      </Section>

      <div className="px-4 pb-6 sm:px-6 sm:pb-10 lg:px-10">
        <Reveal>
          <h1
            className="text-center font-slab uppercase leading-[0.88] tracking-[-0.02em] text-bone"
            style={{ fontSize: 'clamp(3.3rem, 13.8vw, 13.5rem)' }}
          >
            NEURFIT
          </h1>
        </Reveal>
      </div>

      <Section>
        <Reveal>
          <Eyebrow className="text-center">ITEM TERBARU</Eyebrow>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {ARRIVALS.map((photo, index) => (
            <Reveal key={photo.label} delay={index * 0.05}>
              <PhotoCard {...photo} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <div className="text-center">
          <Reveal>
            <Eyebrow>TEKNOLOGI INTI</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-3 font-slab uppercase text-3xl sm:text-5xl lg:text-[52px]">CNN × BI-LSTM</h2>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="mt-10">
          <div className="relative overflow-hidden rounded-[24px] border border-bone/15">
            <GarmentImage
              src={model === 0 ? '/demo/top-2.jpg' : '/demo/shoes-3.jpg'}
              alt="Teknologi inti"
              slot={model === 0 ? 'top' : 'shoes'}
              className="aspect-[16/9] w-full"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(24,24,23,0.95), rgba(24,24,23,0.2) 55%, transparent)' }}
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 sm:p-8">
              <div className="max-w-lg">
                <p className="eyebrow text-bone/60">{model === 0 ? 'MODEL 01' : 'MODEL 02'}</p>
                <h3 className="mt-2 font-slab uppercase text-2xl sm:text-4xl">
                  {model === 0 ? 'MobileNetV2 CNN' : 'Bi-LSTM Compatibility'}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-bone/70 sm:text-sm">
                  {model === 0
                    ? 'Auto-tagging jenis, warna, dan acara dari satu forward pass; embedding 256 dimensi.'
                    : 'Menilai kecocokan outfit dari embedding visual dengan pasangan positif/negatif.'}
                </p>
                <Link
                  to={model === 0 ? '/upload' : '/mix'}
                  className="mt-4 inline-flex items-center gap-1 rounded-full bg-bone px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-coal"
                >
                  {model === 0 ? 'UJI AUTO-TAGGING' : 'BUKA MIX & MATCH'} <span aria-hidden>↗</span>
                </Link>
              </div>
              <button
                type="button"
                aria-label="Ganti model"
                onClick={() => setModel((value) => (value === 0 ? 1 : 0))}
                className="glass-pill grid h-11 w-11 place-items-center text-bone"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <Eyebrow className="text-center">KATEGORI LEMARI</Eyebrow>
        </Reveal>
        <div className="mt-10 divide-y divide-bone/15 border-y border-bone/15">
          {CATEGORIES.map((category, index) => (
            <Reveal key={category.label} delay={index * 0.05}>
              <Link to={category.to} className="group flex items-center justify-center gap-4 px-4 py-5 sm:py-7">
                <span
                  className="font-slab uppercase leading-none transition-transform duration-500 group-hover:-translate-x-2"
                  style={{ fontSize: 'clamp(1.6rem, 5vw, 3.4rem)' }}
                >
                  {category.label}
                </span>
                <span className="w-16 text-right text-[11px] uppercase tracking-[0.16em] text-muted opacity-0 transition-opacity group-hover:opacity-100">
                  [{String(category.count).padStart(2, '0')}] ↗
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <Reveal>
          <Eyebrow className="text-center">LOOKBOOK OUTFIT ’26</Eyebrow>
        </Reveal>
        <div className="mt-12 overflow-x-auto pb-6">
          <div className="flex justify-center -space-x-4 sm:-space-x-8">
            {LOOKBOOK.map((look, index) => (
              <Reveal key={look.label} delay={index * 0.06}>
                <div
                  className={`relative w-32 shrink-0 transition-all duration-500 hover:z-10 hover:rotate-0 hover:scale-105 sm:w-52 ${look.rotate}`}
                >
                  <GarmentImage
                    src={look.img}
                    alt={look.label}
                    slot={look.slot}
                    colour
                    className="aspect-[3/4] w-full border border-bone/15"
                  />
                  <p className="mt-2 text-center text-[9px] uppercase tracking-[0.16em] text-muted">{look.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <Reveal>
          <Eyebrow className="text-center">MODUL SISTEM</Eyebrow>
        </Reveal>
        <div className="mt-10 space-y-8">
          {MODULES.map((module, index) => {
            const imageRight = index % 2 === 1
            return (
              <Reveal key={module.title} x={imageRight ? 80 : -80} y={0}>
                <div className={`flex flex-col items-center gap-4 sm:flex-row ${imageRight ? 'sm:flex-row-reverse' : ''}`}>
                  <GarmentImage
                    src={module.img}
                    alt={module.title}
                    slot={module.slot}
                    className="h-24 w-full border border-bone/15 sm:h-28 sm:w-80 md:w-96"
                  />
                  <Link to={module.to} className="group flex flex-1 items-center justify-center gap-2 py-2">
                    <span
                      className="font-slab uppercase leading-none transition-colors group-hover:text-bone/70"
                      style={{ fontSize: 'clamp(1.4rem, 4.4vw, 3rem)' }}
                    >
                      {module.title}
                    </span>
                    <span aria-hidden className="text-xl text-muted">
                      ↗
                    </span>
                  </Link>
                </div>
              </Reveal>
            )
          })}
        </div>
      </Section>

      <Section>
        <Reveal>
          <Eyebrow className="text-center">KOMBINASI POPULER</Eyebrow>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {POPULAR.map((photo, index) => (
            <Reveal key={photo.label} delay={index * 0.05}>
              <PhotoCard {...photo} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <Reveal className="lg:col-span-5">
            <GarmentImage
              src="/demo/bottom-1.jpg"
              alt="Tentang NeurFit"
              slot="bottom"
              className="aspect-[16/10] w-full border border-bone/15"
            />
          </Reveal>
          <Reveal delay={0.15} className="lg:col-span-7">
            <Eyebrow>ABOUT US</Eyebrow>
            <p className="mt-4 text-sm leading-[1.9] text-bone/75 sm:text-base">
              NeurFit adalah lemari digital yang memahami isi pakaianmu. Model{' '}
              <span className="text-bone">MobileNetV2 CNN</span> membaca foto dan menebak jenis, warna, serta
              acara; <span className="text-bone">Bidirectional LSTM</span> menilai kecocokan antar potongan dari
              embedding visual. Semua berjalan lokal — fotomu tidak pernah meninggalkan perangkat.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section className="pb-0">
        <Reveal>
          <h2
            className="text-center font-slab uppercase leading-[0.88] tracking-[-0.02em] text-bone"
            style={{ fontSize: 'clamp(3.3rem, 13.8vw, 13.5rem)' }}
          >
            NEURFIT
          </h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-8 border-t border-bone/15 pt-10 sm:grid-cols-4">
          {FOOTER.map((column) => (
            <div key={column.title}>
              <p className="eyebrow text-bone/50">{column.title}</p>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-[11px] uppercase tracking-[0.16em] text-bone/70 hover:text-bone"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
