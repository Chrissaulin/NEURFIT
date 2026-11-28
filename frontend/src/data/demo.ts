import type { Item } from '../types'

// Fallback katalog lokal (hanya dipakai jika backend FastAPI sedang offline)
export const DEMO_ITEMS: Item[] = [
  { id: 't1', name: 'Kemeja Putih', article_type: 'shirt', base_colour: 'white', usage: 'formal', slot: 'top', image_url: '/demo/top-1.jpg' },
  { id: 't2', name: 'Sweater Abu', article_type: 'sweater', base_colour: 'grey', usage: 'casual', slot: 'top', image_url: '/demo/top-2.jpg' },
  { id: 't3', name: 'Jaket Hitam', article_type: 'jacket', base_colour: 'black', usage: 'smart_casual', slot: 'top', image_url: '/demo/top-3.jpg' },
  { id: 'b1', name: 'Jeans Biru', article_type: 'jeans', base_colour: 'blue', usage: 'casual', slot: 'bottom', image_url: '/demo/bottom-1.jpg' },
  { id: 'b2', name: 'Jeans Hitam', article_type: 'jeans', base_colour: 'black', usage: 'formal', slot: 'bottom', image_url: '/demo/bottom-2.jpg' },
  { id: 's1', name: 'Sepatu Kasual Merah', article_type: 'casual_shoes', base_colour: 'red', usage: 'casual', slot: 'shoes', image_url: '/demo/shoes-1.jpg' },
  { id: 's2', name: 'Sepatu Formal Hitam', article_type: 'formal_shoes', base_colour: 'black', usage: 'formal', slot: 'shoes', image_url: '/demo/shoes-2.jpg' },
  { id: 's3', name: 'Sepatu Hak Tinggi', article_type: 'heels', base_colour: 'grey', usage: 'party', slot: 'shoes', image_url: '/demo/shoes-3.jpg' },
  { id: 'a1', name: 'Tas Tangan Putih', article_type: 'handbag', base_colour: 'white', usage: 'casual', slot: 'accessory', image_url: '/demo/accessory-1.jpg' },
  { id: 'a2', name: 'Tas Tangan Hitam', article_type: 'handbag', base_colour: 'black', usage: 'party', slot: 'accessory', image_url: '/demo/accessory-2.jpg' },
]
