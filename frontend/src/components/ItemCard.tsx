import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Trash2 } from 'lucide-react'
import { SLOT_LABEL, type Item } from '../types'
import { t } from '../lib/i18n'
import { ColourDot, GarmentImage, UsageTag } from './ui'

export default function ItemCard({
  item,
  onDelete,
}: {
  item: Item
  onDelete?: (id: string) => void
}) {
  const [confirm, setConfirm] = useState(false)

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="card-sharp group flex flex-col"
    >
      <div className="relative">
        <span className="absolute left-3 top-3 z-10 bg-coal/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-bone/80 backdrop-blur">
          {SLOT_LABEL[item.slot]}
        </span>
        <GarmentImage
          src={item.image_url}
          alt={item.name}
          slot={item.slot}
          className="aspect-square w-full transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 border-t border-bone/15 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-slab text-lg uppercase leading-tight">{item.name}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted">{item.article_type}</p>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">
            <ColourDot colour={item.base_colour} /> {item.base_colour}
          </span>
        </div>

        <UsageTag usage={item.usage} />

        <div className="mt-auto flex items-center gap-2">
          <Link
            to={`/mix?anchor=${item.id}`}
            className="link-arrow flex flex-1 items-center justify-center gap-1 border border-bone/15 px-3 py-2 text-[10px] text-bone/80 transition-colors hover:border-bone/55 hover:text-[#C9A24B]"
          >
            {t.closet.style} <ArrowUpRight className="h-3 w-3" />
          </Link>

          {onDelete &&
            (confirm ? (
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em]">
                <span className="text-terracotta">{t.closet.remove}</span>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="border border-terracotta/55 px-2 py-1.5 text-terracotta"
                >
                  {t.closet.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm(false)}
                  className="border border-bone/15 px-2 py-1.5 text-bone/70"
                >
                  {t.closet.no}
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={`Hapus ${item.name}`}
                onClick={() => setConfirm(true)}
                className="grid h-9 w-9 place-items-center border border-bone/15 text-bone/50 transition-colors hover:border-terracotta/55 hover:text-terracotta"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ))}
        </div>
      </div>
    </motion.article>
  )
}
