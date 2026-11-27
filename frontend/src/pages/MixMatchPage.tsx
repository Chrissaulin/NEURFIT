import { useState } from 'react'
import { Reorder, motion } from 'framer-motion'
import { Shuffle } from 'lucide-react'
import { useItems } from '../store'
import {
  SLOT_LABEL,
  USAGES,
  USAGE_HEX,
  USAGE_LABEL,
  type Item,
  type Slot,
  type Usage,
} from '../types'
import { t } from '../lib/i18n'
import { EASE, Reveal } from '../lib/motion'
import { SectionHead, ScoreBar, SlotIcon } from '../components/ui'

const REEL_SLOTS: Slot[] = ['top', 'bottom', 'shoes']

export default function MixMatchPage() {
  const { items } = useItems()
  const [usage, setUsage] = useState<Usage>('kasual')
  const [outfit, setOutfit] = useState<Item[] | null>(null)
  const [score, setScore] = useState(0)
  const [lists, setLists] = useState<Record<Slot, Item[]>>(() => ({
    top: items.filter((item) => item.slot === 'top'),
    bottom: items.filter((item) => item.slot === 'bottom'),
    shoes: items.filter((item) => item.slot === 'shoes'),
    accessory: items.filter((item) => item.slot === 'accessory'),
  }))

  function makeOutfit() {
    const picked = REEL_SLOTS.map((slot) => lists[slot][0]).filter(Boolean) as Item[]
    setOutfit(picked)
    if (picked.length < 3) {
      setScore(0)
      return
    }
    const matches = picked.filter((item) => item.usage === usage).length
    const bonus = picked.reduce((sum, item) => sum + (item.name.length % 5), 0)
    setScore(Math.min(98, 62 + matches * 11 + bonus))
  }

  return (
    <div className="space-y-12">
      <Reveal>
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-ink/50">{t.mix.eyebrow}</p>
          <h1 className="font-display text-4xl font-semibold sm:text-6xl">{t.mix.title}</h1>
          <p className="mt-3 max-w-md text-ink/60">{t.mix.subtitle}</p>
        </div>
      </Reveal>

      <Reveal>
        <div className="mb-4 flex flex-wrap gap-2">
          {USAGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setUsage(option)}
              className={`pill ${usage === option ? 'pill-active' : ''}`}
            >
              <span className="h-3 w-3 rounded-full" style={{ background: USAGE_HEX[option] }} />
              {USAGE_LABEL[option]}
            </button>
          ))}
        </div>

        <motion.div
          animate={{ backgroundColor: USAGE_HEX[usage] }}
          transition={{ duration: 1.2, ease: EASE }}
          className="rounded-4xl border border-line p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/60">Flavour</p>
              <h2 className="font-display text-3xl font-semibold">{USAGE_LABEL[usage]}</h2>
            </div>
            <button type="button" onClick={makeOutfit} className="pill pill-active">
              <Shuffle className="h-4 w-4" /> {t.mix.shuffle}
            </button>
          </div>

          <div className="mt-6">
            {outfit && outfit.length === 3 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {outfit.map((item) => (
                    <div key={item.id} className="rounded-3xl bg-white/60 p-3 text-center">
                      <div className="grid aspect-square place-items-center rounded-2xl bg-cream">
                        <SlotIcon slot={item.slot} className="h-12 w-12 text-ink/30" />
                      </div>
                      <p className="mt-2 truncate text-xs font-medium">{item.name}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink/70">{t.mix.score}</span>
                    <span className="font-medium">{score}%</span>
                  </div>
                  <ScoreBar value={score} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink/70">{outfit ? t.mix.missing : t.mix.prompt}</p>
            )}
          </div>
        </motion.div>
      </Reveal>

      <section>
        <SectionHead eyebrow="Reels" title="Pilih potongan" />
        <div className="space-y-6">
          {REEL_SLOTS.map((slot) => (
            <div key={slot}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">{SLOT_LABEL[slot]}</p>
                <span className="text-xs text-ink/40">geser untuk ubah</span>
              </div>
              {lists[slot].length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink/50">
                  {t.mix.empty}
                </p>
              ) : (
                <Reorder.Group
                  axis="x"
                  values={lists[slot]}
                  onReorder={(next) => setLists((prev) => ({ ...prev, [slot]: next }))}
                  className="flex gap-3 overflow-x-auto pb-2"
                >
                  {lists[slot].map((item) => (
                    <Reorder.Item
                      key={item.id}
                      value={item}
                      whileDrag={{ scale: 1.05, zIndex: 10 }}
                      className="w-32 shrink-0 cursor-grab active:cursor-grabbing"
                    >
                      <div className="rounded-3xl border border-line bg-white/60 p-3">
                        <div className="grid aspect-square place-items-center rounded-2xl bg-cream">
                          <SlotIcon slot={slot} className="h-12 w-12 text-ink/30" />
                        </div>
                        <p className="mt-2 truncate text-xs font-medium">{item.name}</p>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
