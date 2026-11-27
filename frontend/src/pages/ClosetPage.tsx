import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, RotateCcw } from 'lucide-react'
import { useItems } from '../store'
import { SLOTS, SLOT_LABEL, USAGES, USAGE_LABEL, type Slot, type Usage } from '../types'
import { t } from '../lib/i18n'
import { Reveal } from '../lib/motion'
import { EmptyState, Eyebrow } from '../components/ui'
import ItemCard from '../components/ItemCard'

export default function ClosetPage() {
  const { items, remove, reset } = useItems()
  const [params] = useSearchParams()
  const initialSlot = params.get('slot') as Slot | null

  const [slot, setSlot] = useState<Slot | 'all'>(
    initialSlot && SLOTS.includes(initialSlot) ? initialSlot : 'all',
  )
  const [colour, setColour] = useState('all')
  const [usage, setUsage] = useState<Usage | 'all'>('all')

  useEffect(() => {
    setSlot(initialSlot && SLOTS.includes(initialSlot) ? initialSlot : 'all')
  }, [initialSlot])

  const colours = useMemo(() => Array.from(new Set(items.map((item) => item.base_colour))), [items])

  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (slot === 'all' || item.slot === slot) &&
          (colour === 'all' || item.base_colour === colour) &&
          (usage === 'all' || item.usage === usage),
      ),
    [items, slot, colour, usage],
  )

  const counts = useMemo(
    () =>
      Object.fromEntries(SLOTS.map((s) => [s, items.filter((item) => item.slot === s).length])) as Record<
        Slot,
        number
      >,
    [items],
  )

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow className="text-bone/60">KOLEKSI PRIBADI</Eyebrow>
            <h1 className="mt-2 font-slab uppercase text-4xl leading-none sm:text-6xl">{t.closet.title}</h1>
            <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-muted">
              {SLOTS.map(
                (s) => `${SLOT_LABEL[s].toUpperCase()} [${String(counts[s]).padStart(2, '0')}]`,
              ).join(' · ')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 rounded-full border border-bone/20 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-bone/70 hover:border-bone/55 hover:text-bone"
            >
              <RotateCcw className="h-3 w-3" /> {t.closet.reset}
            </button>
            <Link
              to="/upload"
              className="flex items-center gap-1 rounded-full bg-bone px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-coal"
            >
              <Plus className="h-3 w-3" /> {t.closet.add}
            </Link>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-8 flex flex-wrap items-center gap-2 border-y border-bone/15 py-4">
          {(['all', ...SLOTS] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                slot === s
                  ? 'border-bone bg-bone text-coal'
                  : 'border-bone/20 text-bone/70 hover:border-bone/55 hover:text-bone'
              }`}
            >
              {s === 'all' ? t.closet.all : SLOT_LABEL[s]}
            </button>
          ))}

          <div className="ml-auto flex gap-2">
            <select
              value={colour}
              onChange={(event) => setColour(event.target.value)}
              className="border border-bone/20 bg-transparent px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] text-bone/80"
            >
              <option value="all" className="bg-coal">
                {t.closet.allColour}
              </option>
              {colours.map((c) => (
                <option key={c} value={c} className="bg-coal">
                  {c}
                </option>
              ))}
            </select>
            <select
              value={usage}
              onChange={(event) => setUsage(event.target.value as Usage | 'all')}
              className="border border-bone/20 bg-transparent px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] text-bone/80"
            >
              <option value="all" className="bg-coal">
                {t.closet.allUsage}
              </option>
              {USAGES.map((u) => (
                <option key={u} value={u} className="bg-coal">
                  {USAGE_LABEL[u]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Reveal>

      <div className="mt-8">
        {visible.length === 0 ? (
          <EmptyState title={t.closet.noMatch}>
            <button
              type="button"
              onClick={() => {
                setSlot('all')
                setColour('all')
                setUsage('all')
              }}
              className="rounded-full bg-bone px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-coal"
            >
              {t.closet.clear}
            </button>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((item, index) => (
              <Reveal key={item.id} delay={index * 0.04}>
                <ItemCard item={item} onDelete={remove} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
