import { useState } from 'react'
import { motion } from 'framer-motion'
import { Footprints, Layers, Shirt, ShoppingBag } from 'lucide-react'
import type { ReactNode } from 'react'
import { colourHex, USAGE_LABEL, type Slot, type Usage } from '../types'
import { EASE } from '../lib/motion'
import { resolveImage } from '../lib/images'

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

export function GarmentImage({
  src,
  alt,
  slot,
  className = '',
  colour = false,
}: {
  src?: string
  alt: string
  slot: Slot
  className?: string
  colour?: boolean
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`relative overflow-hidden bg-studio ${className}`}>
      {src && !failed ? (
        <img
          src={resolveImage(src)}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${colour ? '' : 'grayscale contrast-[1.1]'}`}
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <SlotIcon slot={slot} className="h-1/2 w-1/2 text-bone/25" />
        </div>
      )}
    </div>
  )
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>
}

export function ConfidenceBadge({ value }: { value: number }) {
  const tone =
    value >= 0.8
      ? 'border-sage/45 bg-sage/15 text-sage'
      : value >= 0.6
        ? 'border-ochre/45 bg-ochre/15 text-ochre'
        : 'border-terracotta/55 bg-terracotta/15 text-terracotta'
  const label = value >= 0.8 ? 'TINGGI' : value >= 0.6 ? 'SEDANG' : 'MOHON PERIKSA'
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.16em] ${tone}`}>
      {Math.round(value * 100)}% · {label}
    </span>
  )
}

export function ScoreBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bone/15">
      <motion.div
        className="h-full rounded-full bg-bone"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: EASE }}
      />
    </div>
  )
}

export function ScoreLabel({ value }: { value: number }) {
  const tone =
    value >= 80
      ? 'border-sage/45 bg-sage/15 text-sage'
      : value >= 60
        ? 'border-ochre/45 bg-ochre/15 text-ochre'
        : 'border-terracotta/55 bg-terracotta/15 text-terracotta'
  const label = value >= 80 ? 'SANGAT COCOK' : value >= 60 ? 'COCOK' : 'KURANG COCOK'
  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-[0.16em] ${tone}`}>
      {label}
    </span>
  )
}

export function ColourDot({ colour }: { colour: string }) {
  return (
    <span
      className="inline-block h-3 w-3 border border-bone/25"
      style={{ background: colourHex(colour) }}
      title={colour}
    />
  )
}

export function UsageTag({ usage }: { usage: Usage }) {
  return (
    <span className="self-start rounded-full border border-bone/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-bone/70">
      {USAGE_LABEL[usage]}
    </span>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-4 border border-dashed border-bone/20 px-6 py-20 text-center">
      <h3 className="font-slab text-2xl uppercase">{title}</h3>
      {children}
    </div>
  )
}
