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
  confidence?: number
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

export const USAGE_HEX: Record<Usage, string> = {
  kasual: '#D5E5BE',
  smart_casual: '#F6D3B4',
  formal: '#C9D4EC',
  olahraga: '#F4E6A8',
  pesta: '#F3C6C8',
}

const COLOUR_HEX: Record<string, string> = {
  putih: '#F3EFE6',
  hitam: '#1C1A17',
  biru: '#3B5C8A',
  navy: '#24344D',
  krem: '#E6D8BE',
  cokelat: '#7A5636',
  abu: '#9A9A94',
  hijau: '#5C7A4E',
  merah: '#9E3B32',
  denim: '#4A6B8A',
}

export const colourHex = (label: string) => COLOUR_HEX[label.toLowerCase()] ?? '#CFC7B8'
