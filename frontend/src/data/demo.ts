import type { Item } from '../types'

// shortcut: in-memory demo data (10 local catalog photos) until the FastAPI backend exists
export const DEMO_ITEMS: Item[] = [
  { id: 't1', name: 'Kaos Katun', article_type: 'tshirt', base_colour: 'abu', usage: 'kasual', slot: 'top', image_url: '/demo/top-2.jpg' },
  { id: 't2', name: 'Kemeja Ungu', article_type: 'shirt', base_colour: 'ungu', usage: 'kasual', slot: 'top', image_url: '/demo/top-1.jpg' },
  { id: 't3', name: 'Jaket Indigo', article_type: 'jacket', base_colour: 'biru', usage: 'smart_casual', slot: 'top', image_url: '/demo/top-3.jpg' },
  { id: 'b1', name: 'Jegging Hitam', article_type: 'jeans', base_colour: 'hitam', usage: 'kasual', slot: 'bottom', image_url: '/demo/bottom-1.jpg' },
  { id: 'b2', name: 'Celana Cokelat', article_type: 'trousers', base_colour: 'cokelat', usage: 'formal', slot: 'bottom', image_url: '/demo/bottom-2.jpg' },
  { id: 's1', name: 'Sneakers Putih', article_type: 'casual_shoes', base_colour: 'putih', usage: 'kasual', slot: 'shoes', image_url: '/demo/shoes-1.jpg' },
  { id: 's2', name: 'Pantofel Hitam', article_type: 'formal_shoes', base_colour: 'hitam', usage: 'formal', slot: 'shoes', image_url: '/demo/shoes-2.jpg' },
  { id: 's3', name: 'Sepatu Lari', article_type: 'sports_shoes', base_colour: 'putih', usage: 'olahraga', slot: 'shoes', image_url: '/demo/shoes-3.jpg' },
  { id: 'a1', name: 'Tas Biru', article_type: 'handbag', base_colour: 'biru', usage: 'kasual', slot: 'accessory', image_url: '/demo/accessory-1.jpg' },
  { id: 'a2', name: 'Kacamata Copper', article_type: 'sunglasses', base_colour: 'copper', usage: 'pesta', slot: 'accessory', image_url: '/demo/accessory-2.jpg' },
]
