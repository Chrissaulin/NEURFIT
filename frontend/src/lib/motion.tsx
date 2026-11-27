import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function Reveal({
  children,
  delay = 0,
  x = 0,
  y = 60,
  className,
}: {
  children: ReactNode
  delay?: number
  x?: number
  y?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
