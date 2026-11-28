import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { colourDisplay, type Item, type LabelsMeta, type SavedOutfit } from './types'
import { api, type BackendItemOut } from './lib/api'
import { savedOutfitsRepo } from './lib/savedOutfits'

interface Store {
  items: Item[]
  labels: LabelsMeta | null
  loading: boolean
  error: string | null
  outfits: SavedOutfit[]
  add: (item: Item) => void
  addFromBackend: (row: BackendItemOut) => Item
  remove: (id: string) => Promise<void>
  reset: () => Promise<void>
  refresh: () => Promise<void>
  saveOutfit: (outfit: SavedOutfit) => void
  removeOutfit: (id: string) => void
}

const Ctx = createContext<Store | null>(null)

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

export function mapBackendItem(row: BackendItemOut, labels: LabelsMeta | null): Item {
  const artDisplay =
    labels?.article_types.find((entry) => entry.key === row.article_type)?.display ??
    row.article_type.replace(/_/g, ' ')
  const colDisplay =
    labels?.base_colours.find((entry) => entry.key === row.base_colour)?.display ??
    colourDisplay(row.base_colour)
  return {
    id: String(row.id),
    name: `${artDisplay} ${colDisplay}`,
    article_type: row.article_type,
    base_colour: row.base_colour,
    usage: row.usage,
    slot: row.slot,
    image_url: row.image_url,
    thumb_url: row.thumb_url,
  }
}

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const [labels, setLabels] = useState<LabelsMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [outfits, setOutfits] = useState<SavedOutfit[]>(() => savedOutfitsRepo.list())

  const persistOutfits = useCallback((next: SavedOutfit[]) => {
    setOutfits(next)
    savedOutfitsRepo.write(next)
  }, [])

  const loadAll = useCallback(async (autoSeedIfEmpty = true) => {
    setLoading(true)
    setError(null)
    try {
      const [meta, list] = await Promise.all([api.getLabels(), api.listItems(200)])
      setLabels(meta)
      let rows = list.items
      if (autoSeedIfEmpty && rows.length === 0) {
        await api.seedDemo()
        const seeded = await api.listItems(200)
        rows = seeded.items
      }
      const mapped = rows.map((row) => mapBackendItem(row, meta))
      setItems(mapped)
      const validIds = new Set(mapped.map((item) => item.id))
      setOutfits((prev) =>
        prev
          .map((outfit) => ({ ...outfit, item_ids: outfit.item_ids.filter((id) => validIds.has(id)) }))
          .filter((outfit) => outfit.item_ids.length >= 3),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal terhubung ke server backend.'
      setError(`${message} Pastikan server FastAPI berjalan di http://127.0.0.1:8000.`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll(true)
  }, [loadAll])

  const add = useCallback((item: Item) => {
    setItems((prev) => [item, ...prev])
  }, [])

  const addFromBackend = useCallback(
    (row: BackendItemOut) => {
      const mapped = mapBackendItem(row, labels)
      setItems((prev) => [mapped, ...prev])
      return mapped
    },
    [labels],
  )

  const remove = useCallback(async (id: string) => {
    await api.deleteItem(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const reset = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const current = await api.listItems(200)
      for (const row of current.items) {
        await api.deleteItem(row.id)
      }
      await api.seedDemo()
      await loadAll(false)
      persistOutfits([])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mereset data demo.'
      setError(message)
      setLoading(false)
    }
  }, [loadAll, persistOutfits])

  const refresh = useCallback(async () => {
    await loadAll(false)
  }, [loadAll])

  const saveOutfit = useCallback(
    (outfit: SavedOutfit) => {
      if (outfits.some((saved) => sameIds(saved.item_ids, outfit.item_ids))) return
      persistOutfits([outfit, ...outfits])
    },
    [outfits, persistOutfits],
  )

  const removeOutfit = useCallback(
    (id: string) => persistOutfits(outfits.filter((outfit) => outfit.id !== id)),
    [outfits, persistOutfits],
  )

  return (
    <Ctx.Provider
      value={{
        items,
        labels,
        loading,
        error,
        outfits,
        add,
        addFromBackend,
        remove,
        reset,
        refresh,
        saveOutfit,
        removeOutfit,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useItems() {
  const store = useContext(Ctx)
  if (!store) throw new Error('useItems must be used inside ItemsProvider')
  return store
}
