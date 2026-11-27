import type { SavedOutfit } from '../types'

const KEY = 'neurfit.outfits.v1'

function read(): SavedOutfit[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedOutfit[]) : []
  } catch {
    return []
  }
}

function write(outfits: SavedOutfit[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(outfits))
  } catch {
    // storage full / private mode: keep the in-memory list working
  }
}

// localStorage now; swap for API calls when the backend saved-outfits table exists
export interface SavedOutfitsRepository {
  list: () => SavedOutfit[]
  write: (outfits: SavedOutfit[]) => void
}

export const savedOutfitsRepo: SavedOutfitsRepository = {
  list: read,
  write,
}
