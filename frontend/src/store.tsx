import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Item, SavedOutfit } from './types'
import { DEMO_ITEMS } from './data/demo'
import { savedOutfitsRepo } from './lib/savedOutfits'

interface Store {
  items: Item[]
  outfits: SavedOutfit[]
  add: (item: Item) => void
  remove: (id: string) => void
  reset: () => void
  saveOutfit: (outfit: SavedOutfit) => void
  removeOutfit: (id: string) => void
}

const Ctx = createContext<Store | null>(null)

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

function initialOutfits() {
  const valid = new Set(DEMO_ITEMS.map((item) => item.id))
  return savedOutfitsRepo
    .list()
    .map((outfit) => ({ ...outfit, item_ids: outfit.item_ids.filter((id) => valid.has(id)) }))
    .filter((outfit) => outfit.item_ids.length >= 3)
}

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>(DEMO_ITEMS)
  const [outfits, setOutfits] = useState<SavedOutfit[]>(initialOutfits)

  const add = (item: Item) => setItems((prev) => [item, ...prev])
  const remove = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id))

  const persist = (next: SavedOutfit[]) => {
    setOutfits(next)
    savedOutfitsRepo.write(next)
  }

  const saveOutfit = (outfit: SavedOutfit) => {
    if (outfits.some((saved) => sameIds(saved.item_ids, outfit.item_ids))) return
    persist([outfit, ...outfits])
  }

  const removeOutfit = (id: string) => persist(outfits.filter((outfit) => outfit.id !== id))

  const reset = () => {
    setItems(DEMO_ITEMS)
    persist([])
  }

  return (
    <Ctx.Provider value={{ items, outfits, add, remove, reset, saveOutfit, removeOutfit }}>
      {children}
    </Ctx.Provider>
  )
}

export function useItems() {
  const store = useContext(Ctx)
  if (!store) throw new Error('useItems must be used inside ItemsProvider')
  return store
}
