import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Item } from './types'
import { DEMO_ITEMS } from './data/demo'

interface Store {
  items: Item[]
  add: (item: Item) => void
  remove: (id: string) => void
  reset: () => void
}

const Ctx = createContext<Store | null>(null)

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>(DEMO_ITEMS)
  const add = (item: Item) => setItems((prev) => [item, ...prev])
  const remove = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id))
  const reset = () => setItems(DEMO_ITEMS)
  return <Ctx.Provider value={{ items, add, remove, reset }}>{children}</Ctx.Provider>
}

export function useItems() {
  const store = useContext(Ctx)
  if (!store) throw new Error('useItems must be used inside ItemsProvider')
  return store
}
