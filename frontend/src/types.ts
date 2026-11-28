export type Slot = 'top' | 'bottom' | 'shoes' | 'accessory'
export type Usage = 'casual' | 'smart_casual' | 'formal' | 'sports' | 'party'

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

export interface TopKPrediction {
  label: string
  confidence: number
}

export interface HeadPrediction {
  label: string
  confidence: number
  top_k: TopKPrediction[]
}

export interface AnalyzeResponse {
  temp_id: string
  image_url: string
  slot: Slot | null
  predictions: {
    article_type: HeadPrediction
    base_colour: HeadPrediction
    usage: HeadPrediction
  }
  low_confidence_fields: string[]
  supported: boolean
  model_version: string
  inference_ms: number
  expires_in_s: number
}

export interface LabelsMeta {
  labels_version: string
  confidence_threshold: number
  max_upload_mb: number
  slots: { key: Slot; display: string }[]
  article_types: { key: string; display: string; slot: Slot | null }[]
  base_colours: { key: string; display: string; hex: string }[]
  usages: { key: Usage; display: string }[]
  usage_compat: Record<string, string[]>
}

export const SLOTS: Slot[] = ['top', 'bottom', 'shoes', 'accessory']

export const SLOT_LABEL: Record<Slot, string> = {
  top: 'Atasan',
  bottom: 'Bawahan',
  shoes: 'Sepatu',
  accessory: 'Aksesoris',
}

export const USAGES: Usage[] = ['casual', 'smart_casual', 'formal', 'sports', 'party']

export const USAGE_LABEL: Record<Usage, string> = {
  casual: 'Kasual',
  smart_casual: 'Smart Casual',
  formal: 'Formal',
  sports: 'Olahraga',
  party: 'Pesta',
}

export const COLOUR_LABEL: Record<string, string> = {
  black: 'Hitam',
  white: 'Putih',
  grey: 'Abu-abu',
  navy_blue: 'Biru Dongker',
  blue: 'Biru',
  brown: 'Cokelat',
  beige: 'Krem / Beige',
  red: 'Merah',
  green: 'Hijau',
  pink: 'Merah Muda',
  yellow: 'Kuning',
  orange: 'Oranye',
  purple: 'Ungu',
  multi: 'Multiwarna',
}

const COLOUR_HEX: Record<string, string> = {
  putih: '#E7E3D6',
  white: '#E7E3D6',
  hitam: '#1A1A19',
  black: '#1A1A19',
  biru: '#3B5C8A',
  blue: '#3B5C8A',
  navy: '#24344D',
  navy_blue: '#1E2A5A',
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
  multi: '#9A9A94',
}

export const colourHex = (label: string) => COLOUR_HEX[label.toLowerCase()] ?? '#9A9A94'
export const colourDisplay = (key: string) => COLOUR_LABEL[key] ?? key
