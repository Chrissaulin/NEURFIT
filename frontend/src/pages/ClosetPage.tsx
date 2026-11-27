import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useItems } from '../store'
import { SLOTS, SLOT_LABEL, type Slot } from '../types'
import { t } from '../lib/i18n'
import { Reveal } from '../lib/motion'
import { EmptyState, SectionHead } from '../components/ui'
import ItemCard from '../components/ItemCard'

export default function ClosetPage() {
  const { items, remove } = useItems()
  const [filter, setFilter] = useState<Slot | 'all'>('all')

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.slot === filter)),
    [items, filter],
  )
  const rail = items.slice(0, 8)

  return (
    <div className="space-y-14">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-ink/50">{t.closet.eyebrow}</p>
            <h1 className="font-display text-4xl font-semibold sm:text-6xl">{t.closet.title}</h1>
            <p className="mt-3 max-w-md text-ink/60">{t.closet.subtitle(items.length)}</p>
          </div>
          <Link to="/upload" className="pill pill-active">
            <Plus className="h-4 w-4" /> {t.closet.add}
          </Link>
        </div>
      </Reveal>

      {rail.length > 0 && (
        <Reveal>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-ink/50">{t.closet.rail}</p>
          <div className="marquee overflow-hidden">
            <div className="marquee-track">
              {[...rail, ...rail].map((item, index) => (
                <div key={`${item.id}-${index}`} className="w-44 shrink-0">
                  <ItemCard item={item} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      <section>
        <SectionHead
          eyebrow="Koleksi"
          title={t.closet.all}
          right={<span className="text-sm text-ink/50">{visible.length} item</span>}
        />

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`pill ${filter === 'all' ? 'pill-active' : ''}`}
          >
            {t.closet.all}
          </button>
          {SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setFilter(slot)}
              className={`pill ${filter === slot ? 'pill-active' : ''}`}
            >
              {SLOT_LABEL[slot]}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState title={t.closet.noMatch}>
            <button type="button" onClick={() => setFilter('all')} className="pill">
              {t.closet.reset}
            </button>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((item, index) => (
              <Reveal key={item.id} delay={index * 0.04}>
                <ItemCard item={item} onDelete={remove} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
