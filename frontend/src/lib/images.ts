const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

export function resolveImage(url?: string) {
  if (!url) return undefined
  if (/^(?:https?:|blob:|data:)/i.test(url)) return url
  return `${BASE}${url}`
}
