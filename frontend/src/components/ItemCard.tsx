import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import type { Item } from '../types'
import { SLOT_LABEL } from '../types'
import { ColourDot, SlotIcon, UsageTag } from './ui'

export default function ItemCard({ item, onDelete }: { item: Item; onDelete?: (id: string) => void }) {
  return (
    <motion.article
      whileHover={{ y: -6, rotate: -1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group relative"
    >
      <div className="surface relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-white/40 to-cream">
        <div className="absolute left-3 top-3 z-10">
          <UsageTag usage={item.usage} />
        </div>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="cutout h-full w-full object-contain p-6"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <SlotIcon slot={item.slot} className="h-24 w-24 text-ink/25" />
          </div>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label={`Hapus ${item.name}`}
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-cream/80 text-ink/60 opacity-0 transition group-hover:opacity-100 hover:text-ink"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2 px-1">
        <div>
          <p className="font-medium leading-tight">{item.name}</p>
          <p className="mt-0.5 text-sm text-ink/50">
            {SLOT_LABEL[item.slot]} · {item.article_type}
          </p>
        </div>
        <ColourDot colour={item.base_colour} />
      </div>
    </motion.article>
  )
}
