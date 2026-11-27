import type { Item, Slot, Usage } from '../types'
import { USAGE_LABEL } from '../types'
import { resolveImage } from '../lib/images'
import { SlotIcon } from './ui'

const LAYOUT: Record<Slot, { box: string; z: number }> = {
  top: { box: 'left-0 top-0 h-[52%] w-[60%] -rotate-6', z: 20 },
  bottom: { box: 'right-0 top-[16%] h-[56%] w-[46%] rotate-[5deg]', z: 10 },
  shoes: { box: 'bottom-0 left-0 h-[30%] w-[50%] -rotate-3', z: 30 },
  accessory: { box: 'bottom-[6%] right-0 h-[28%] w-[28%] rotate-6', z: 40 },
}

function Piece({ item }: { item: Item }) {
  const src = resolveImage(item.cutout_url ?? item.image_url)
  return (
    <div
      className={`absolute mix-blend-multiply ${LAYOUT[item.slot].box}`}
      style={{ zIndex: LAYOUT[item.slot].z }}
    >
      {src ? (
        <img src={src} alt="" loading="eager" className="h-full w-full object-contain" />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <SlotIcon slot={item.slot} className="h-1/2 w-1/2 text-coal/20" />
        </div>
      )}
    </div>
  )
}

export default function OutfitFrame({
  items,
  usage,
  score,
  index = 1,
  compact = false,
  className = '',
}: {
  items: Item[]
  usage: Usage | 'all'
  score?: number
  index?: number
  compact?: boolean
  className?: string
}) {
  const usageLabel = usage === 'all' ? 'Semua acara' : USAGE_LABEL[usage]
  const names = items.map((item) => item.name).join(', ')
  const label = `Outfit ${usageLabel.toLowerCase()}: ${names}`

  if (compact) {
    return (
      <div role="img" aria-label={label} className={`relative aspect-[4/5] w-full overflow-hidden bg-bone ${className}`}>
        <div className="absolute inset-2.5">
          {items.map((item) => (
            <Piece key={item.id} item={item} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <figure
      role="img"
      aria-label={label}
      className={`relative flex aspect-[4/5] w-full flex-col overflow-hidden bg-bone p-4 text-coal sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-coal/55">
        <span>NeurFit</span>
        <span>Look {String(index).padStart(2, '0')}</span>
      </div>

      <div className="relative mt-2 min-h-0 flex-1">
        {items.map((item) => (
          <Piece key={item.id} item={item} />
        ))}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3 border-t border-coal/10 pt-3">
        <div className="min-w-0">
          <p className="font-slab text-base uppercase leading-none sm:text-2xl">{usageLabel}</p>
          <p className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.14em] text-coal/55">{names}</p>
        </div>
        {score !== undefined && <p className="shrink-0 font-slab text-xl leading-none sm:text-3xl">{score}%</p>}
      </div>
    </figure>
  )
}
