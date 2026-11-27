import { motion } from 'framer-motion'
import { Footprints, Layers, Shirt, ShoppingBag } from 'lucide-react'
import type { ReactNode } from 'react'
import { colourHex, USAGE_HEX, USAGE_LABEL, type Slot, type Usage } from '../types'
import { EASE } from '../lib/motion'

const SLOT_ICON = {
  top: Shirt,
  bottom: Layers,
  shoes: Footprints,
  accessory: ShoppingBag,
} as const

export function SlotIcon({ slot, className }: { slot: Slot; className?: string }) {
  const Icon = SLOT_ICON[slot]
  return <Icon className={className} strokeWidth={1} />
}

export function SectionHead({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string
  title: string
  right?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-ink/50">{eyebrow}</p>
        )}
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
      </div>
      {right}
    </div>
  )
}

export function ScoreBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
      <motion.div
        className="h-full rounded-full bg-ink"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: EASE }}
      />
    </div>
  )
}

export function ColourDot({ colour }: { colour: string }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full border border-ink/20"
      style={{ background: colourHex(colour) }}
      title={colour}
    />
  )
}

export function UsageTag({ usage }: { usage: Usage }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: USAGE_HEX[usage] }}
    >
      {USAGE_LABEL[usage]}
    </span>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="surface grid place-items-center gap-3 px-6 py-16 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      {children}
    </div>
  )
}
