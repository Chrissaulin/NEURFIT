import type { Item } from '../types'

// shortcut: in-memory demo data (10 local catalog photos) until the FastAPI backend exists
export const DEMO_ITEMS: Item[] = [
  { id: 't1', name: 'Kemeja Putih', article_type: 'shirt', base_colour: 'putih', usage: 'formal', slot: 'top', image_url: '/demo/top-1.jpg' },
  { id: 't2', name: 'Sweater Polkadot', article_type: 'sweater', base_colour: 'abu', usage: 'kasual', slot: 'top', image_url: '/demo/top-2.jpg' },
  { id: 't3', name: 'Bomber Hitam', article_type: 'jacket', base_colour: 'hitam', usage: 'smart_casual', slot: 'top', image_url: '/demo/top-3.jpg' },
  { id: 'b1', name: 'Jeans Biru', article_type: 'jeans', base_colour: 'biru', usage: 'kasual', slot: 'bottom', image_url: '/demo/bottom-1.jpg' },
  { id: 'b2', name: 'Jeans Hitam', article_type: 'jeans', base_colour: 'hitam', usage: 'formal', slot: 'bottom', image_url: '/demo/bottom-2.jpg' },
  { id: 's1', name: 'Sneakers Merah', article_type: 'casual_shoes', base_colour: 'merah', usage: 'kasual', slot: 'shoes', image_url: '/demo/shoes-1.jpg' },
  { id: 's2', name: 'Boot Hitam', article_type: 'formal_shoes', base_colour: 'hitam', usage: 'formal', slot: 'shoes', image_url: '/demo/shoes-2.jpg' },
  { id: 's3', name: 'Pumps Silver', article_type: 'formal_shoes', base_colour: 'silver', usage: 'pesta', slot: 'shoes', image_url: '/demo/shoes-3.jpg' },
  { id: 'a1', name: 'Tas Polkadot', article_type: 'handbag', base_colour: 'putih', usage: 'kasual', slot: 'accessory', image_url: '/demo/accessory-1.jpg' },
  { id: 'a2', name: 'Tas Rantai', article_type: 'handbag', base_colour: 'hitam', usage: 'pesta', slot: 'accessory', image_url: '/demo/accessory-2.jpg' },
]
