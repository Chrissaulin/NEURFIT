import type { AnalyzeResponse, LabelsMeta, Slot, Usage } from '../types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

export class ApiClientError extends Error {
  status: number
  code: string
  details: Record<string, unknown>

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface BackendItemOut {
  id: number
  image_url: string
  thumb_url: string
  slot: Slot
  article_type: string
  base_colour: string
  usage: Usage
  is_label_corrected: boolean
  created_at: string
}

export interface ItemListResponse {
  items: BackendItemOut[]
  total: number
  limit: number
  offset: number
  counts_by_slot: Record<string, number>
}

export interface BackendRecommendationOut {
  rank: number
  score: number
  score_percent: number
  score_band: string
  items: {
    slot: Slot
    is_anchor: boolean
    item: BackendItemOut
  }[]
}

export interface RecommendResponse {
  anchor: BackendItemOut
  usage_filter: Usage | null
  recommendations: BackendRecommendationOut[]
  meta: {
    n_candidates: number
    scorer_backend: string
    scorer_version: string
    inference_ms: number
    warnings: string[]
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init)
  if (response.status === 204) {
    return undefined as T
  }
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    const err = payload?.error
    throw new ApiClientError(
      response.status,
      err?.code ?? 'HTTP_ERROR',
      err?.message ?? `Permintaan gagal (${response.status}).`,
      err?.details ?? {},
    )
  }
  return payload as T
}

export const api = {
  getLabels: () => request<LabelsMeta>('/api/v1/meta/labels'),

  listItems: (limit = 200) => request<ItemListResponse>(`/api/v1/items?limit=${limit}`),

  analyzeImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<AnalyzeResponse>('/api/v1/items/analyze', {
      method: 'POST',
      body: form,
    })
  },

  saveItem: (payload: {
    temp_id: string
    article_type: string
    base_colour: string
    usage: Usage
  }) =>
    request<BackendItemOut>('/api/v1/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  deleteItem: (id: string | number) =>
    request<void>(`/api/v1/items/${id}`, {
      method: 'DELETE',
    }),

  seedDemo: () =>
    request<{ inserted_count: number; counts_by_slot: Record<string, number> }>('/api/v1/items/seed-demo', {
      method: 'POST',
    }),

  recommendOutfits: (payload: {
    anchor_item_id: number
    usage: Usage | null
    top_k?: number
    strict_usage?: boolean
    include_accessory?: boolean
  }) =>
    request<RecommendResponse>('/api/v1/outfits/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
}
