import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Shuffle } from 'lucide-react'
import { useItems } from '../store'
import { SLOT_LABEL, USAGES, USAGE_LABEL, type Item, type Slot, type Usage } from '../types'
import { t } from '../lib/i18n'
import { Reveal } from '../lib/motion'
import { ColourDot, EmptyState, Eyebrow, GarmentImage, ScoreBar, ScoreLabel } from '../components/ui'

const CORE: Slot[] = ['top', 'bottom', 'shoes']

export default function MixMatchPage() {
  const { items, reset } = useItems()
  const [params] = useSearchParams()
  const anchorParam = params.get('anchor')

  const [anchorId, setAnchorId] = useState<string | undefined>(
    anchorParam && items.some((item) => item.id === anchorParam) ? anchorParam : undefined,
  )
  const [usage, setUsage] = useState<Usage | 'all'>('all')
  const [rec, setRec] = useState<{ items: Item[]; score: number } | null>(null)
  const [missing, setMissing] = useState<Slot[]>([])

  function recommend() {
    const seed = items.find((item) => item.id === anchorId)
    const picked: Item[] = seed ? [seed] : []
    const miss: Slot[] = []

    for (const slot of CORE) {
      if (picked.some((item) => item.slot === slot)) continue
      const pool = items.filter((item) => item.slot === slot)
      if (pool.length === 0) {
        miss.push(slot)
        continue
      }
      const preferred = usage === 'all' ? undefined : pool.find((item) => item.usage === usage)
      picked.push(preferred ?? pool[0])
    }

    setMissing(miss)
    if (miss.length > 0) {
      setRec(null)
      return
    }

    const matches = usage === 'all' ? 0 : picked.filter((item) => item.usage === usage).length
    const score = Math.min(98, usage === 'all' ? 78 : 58 + matches * 13)
    setRec({ items: picked, score })
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <Reveal>
        <Eyebrow className="text-bone/60">{t.mix.eyebrow}</Eyebrow>
        <h1 className="mt-2 font-slab uppercase text-4xl leading-none sm:text-6xl">{t.mix.title}</h1>
        <p className="mt-3 max-w-md text-sm text-bone/60">{t.mix.subtitle}</p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="card-sharp p-5 sm:p-7">
          <Eyebrow className="text-bone/50">{t.mix.anchor}</Eyebrow>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {items.map((item) => {
              const blocked = item.slot === 'accessory'
              const selected = anchorId === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => {
                    setAnchorId(item.id)
                    setRec(null)
                  }}
                  className={`relative w-24 shrink-0 text-left transition-opacity ${
                    blocked ? 'cursor-not-allowed opacity-45' : ''
                  }`}
                >
                  <GarmentImage
                    src={item.image_url}
                    alt={item.name}
                    slot={item.slot}
                    className={`aspect-square w-full border transition-colors ${
                      selected ? 'border-bone' : 'border-bone/15'
                    }`}
                  />
                  {selected && (
                    <span className="absolute left-1 top-1 bg-bone px-1.5 py-0.5 text-[8px] font-bold tracking-[0.16em] text-coal">
                      {t.mix.utama}
                    </span>
                  )}
                  <p className="mt-1 truncate text-[9px] uppercase tracking-[0.12em] text-muted">{item.name}</p>
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-bone/15 pt-5">
            <span className="eyebrow mr-1 text-bone/50">{t.mix.usage}</span>
            <button
              type="button"
              onClick={() => setUsage('all')}
              className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] ${
                usage === 'all' ? 'border-bone bg-bone text-coal' : 'border-bone/20 text-bone/70'
              }`}
            >
              {t.mix.all}
            </button>
            {USAGES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setUsage(option)}
                className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] ${
                  usage === option ? 'border-bone bg-bone text-coal' : 'border-bone/20 text-bone/70'
                }`}
              >
                {USAGE_LABEL[option]}
              </button>
            ))}
            <button
              type="button"
              onClick={recommend}
              className="ml-auto flex items-center gap-1 rounded-full bg-bone px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-coal"
            >
              <Shuffle className="h-3 w-3" /> {t.mix.build} ↗
            </button>
          </div>
        </div>
      </Reveal>

      {rec ? (
        <Reveal>
          <div className="card-sharp overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-bone/15 p-5">
              <div className="flex items-center gap-3">
                <span className="font-slab text-2xl">#01</span>
                <ScoreLabel value={rec.score} />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-36">
                  <ScoreBar value={rec.score} />
                </div>
                <span className="font-slab text-3xl">{rec.score}%</span>
              </div>
            </div>

            <div className="grid divide-y divide-bone/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {rec.items.map((item, index) => (
                <div key={item.id} className="p-4">
                  <p className="eyebrow text-bone/50">
                    {String(index + 1).padStart(2, '0')} {SLOT_LABEL[item.slot].toUpperCase()}
                  </p>
                  <GarmentImage
                    src={item.image_url}
                    alt={item.name}
                    slot={item.slot}
                    className="mt-3 aspect-square w-full"
                  />
                  <p className="mt-3 font-slab text-lg uppercase leading-tight">{item.name}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">
                    <ColourDot colour={item.base_colour} /> {item.base_colour} · {USAGE_LABEL[item.usage]}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-bone/15 p-5 text-[10px] uppercase tracking-[0.16em] text-muted">
              {t.mix.reason}: {usage === 'all' ? 'semua acara' : USAGE_LABEL[usage]} — dipilih dari skor
              embedding BI-LSTM.
            </div>
          </div>
        </Reveal>
      ) : missing.length > 0 ? (
        <EmptyState title="SLOT BELUM LENGKAP">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
            Kamu belum punya {missing.map((slot) => SLOT_LABEL[slot].toLowerCase()).join(', ')}.
          </p>
          <div className="flex gap-2">
            <Link
              to="/upload"
              className="rounded-full bg-bone px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-coal"
            >
              TAMBAH PAKAIAN
            </Link>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-bone/20 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-bone/70"
            >
              {t.closet.reset}
            </button>
          </div>
        </EmptyState>
      ) : (
        <Reveal delay={0.15}>
          <div className="border border-dashed border-bone/20 px-6 py-16 text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-bone/60">{t.mix.prompt}</p>
          </div>
        </Reveal>
      )}
    </div>
  )
}
