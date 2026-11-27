export type Slot = 'top' | 'bottom' | 'shoes' | 'accessory'
export type Usage = 'kasual' | 'smart_casual' | 'formal' | 'olahraga' | 'pesta'

export interface Item {
  id: string
  name: string
  article_type: string
  base_colour: string
  usage: Usage
  slot: Slot
  image_url?: string
  thumb_url?: string
  cutout_url?: string
  confidence?: number
}

export interface SavedOutfit {
  id: string
  item_ids: string[]
  usage: Usage | 'all'
  score: number
  created_at: number
}

export const SLOTS: Slot[] = ['top', 'bottom', 'shoes', 'accessory']

export const SLOT_LABEL: Record<Slot, string> = {
  top: 'Atasan',
  bottom: 'Bawahan',
  shoes: 'Sepatu',
  accessory: 'Aksesoris',
}

export const USAGES: Usage[] = ['kasual', 'smart_casual', 'formal', 'olahraga', 'pesta']

export const USAGE_LABEL: Record<Usage, string> = {
  kasual: 'Kasual',
  smart_casual: 'Smart Casual',
  formal: 'Formal',
  olahraga: 'Olahraga',
  pesta: 'Pesta',
}

const COLOUR_HEX: Record<string, string> = {
  putih: '#E7E3D6',
  white: '#E7E3D6',
  hitam: '#1A1A19',
  black: '#1A1A19',
  biru: '#3B5C8A',
  blue: '#3B5C8A',
  navy: '#24344D',
  krem: '#DED3BB',
  beige: '#DED3BB',
  cokelat: '#6E4F33',
  brown: '#6E4F33',
  abu: '#9A9A94',
  grey: '#9A9A94',
  hijau: '#5C7A4E',
  green: '#5C7A4E',
  merah: '#9E3B32',
  red: '#9E3B32',
  denim: '#4A6B8A',
  ungu: '#6B4B78',
  purple: '#6B4B78',
  silver: '#C9C6BD',
  copper: '#B06A43',
  pink: '#D9A7AD',
  yellow: '#C9A227',
  orange: '#C77B3A',
}

export const colourHex = (label: string) => COLOUR_HEX[label.toLowerCase()] ?? '#9A9A94'
