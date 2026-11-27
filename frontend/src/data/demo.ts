import type { Item } from '../types'

// shortcut: in-memory demo data until the FastAPI backend exists, swap for /api queries then
export const DEMO_ITEMS: Item[] = [
  { id: 't1', name: 'Kaos Katun', article_type: 'tshirt', base_colour: 'putih', usage: 'kasual', slot: 'top' },
  { id: 't2', name: 'Kemeja Oxford', article_type: 'shirt', base_colour: 'biru', usage: 'smart_casual', slot: 'top' },
  { id: 't3', name: 'Sweater Rajut', article_type: 'sweater', base_colour: 'krem', usage: 'kasual', slot: 'top' },
  { id: 't4', name: 'Blazer Navy', article_type: 'jacket', base_colour: 'navy', usage: 'formal', slot: 'top' },
  { id: 'b1', name: 'Jeans Slim', article_type: 'jeans', base_colour: 'denim', usage: 'kasual', slot: 'bottom' },
  { id: 'b2', name: 'Celana Kargo', article_type: 'trousers', base_colour: 'krem', usage: 'kasual', slot: 'bottom' },
  { id: 'b3', name: 'Rok Plisket', article_type: 'skirt', base_colour: 'cokelat', usage: 'pesta', slot: 'bottom' },
  { id: 'b4', name: 'Celana Formal', article_type: 'trousers', base_colour: 'hitam', usage: 'formal', slot: 'bottom' },
  { id: 's1', name: 'Sneakers Putih', article_type: 'casual_shoes', base_colour: 'putih', usage: 'kasual', slot: 'shoes' },
  { id: 's2', name: 'Loafers Kulit', article_type: 'formal_shoes', base_colour: 'hitam', usage: 'formal', slot: 'shoes' },
  { id: 's3', name: 'Sandal Kulit', article_type: 'sandals', base_colour: 'cokelat', usage: 'kasual', slot: 'shoes' },
  { id: 's4', name: 'Sepatu Lari', article_type: 'sports_shoes', base_colour: 'abu', usage: 'olahraga', slot: 'shoes' },
  { id: 'a1', name: 'Jam Kulit', article_type: 'watch', base_colour: 'cokelat', usage: 'smart_casual', slot: 'accessory' },
  { id: 'a2', name: 'Tas Kanvas', article_type: 'handbag', base_colour: 'krem', usage: 'kasual', slot: 'accessory' },
  { id: 'a3', name: 'Kacamata Hitam', article_type: 'sunglasses', base_colour: 'hitam', usage: 'pesta', slot: 'accessory' },
]
