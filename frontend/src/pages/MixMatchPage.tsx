import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Shuffle, Trash2 } from 'lucide-react'
import { mapBackendItem, useItems } from '../store'
import { colourDisplay, SLOTS, SLOT_LABEL, USAGES, USAGE_LABEL, type Item, type Slot, type Usage } from '../types'
import { api, ApiClientError } from '../lib/api'
import { t } from '../lib/i18n'
import { Reveal } from '../lib/motion'
import { ColourDot, EmptyState, Eyebrow, GarmentImage, ScoreBar, ScoreLabel } from '../components/ui'
import OutfitFrame from '../components/OutfitFrame'

type Recommendation = {
  items: Item[]
  score: number
  usage: Usage | 'all'
  scorerBackend?: string
  inferenceMs?: number
}

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

export default function MixMatchPage() {
  const { items, labels, outfits, saveOutfit, removeOutfit, reset, loading, error } = useItems()
  const [params] = useSearchParams()
  const anchorParam = params.get('anchor')

  const [anchorId, setAnchorId] = useState<string | undefined>(undefined)
  const [usage, setUsage] = useState<Usage | 'all'>('all')
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [missing, setMissing] = useState<Slot[]>([])
  const [scoring, setScoring] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)
  const [autoRan, setAutoRan] = useState(false)

  useEffect(() => {
    if (items.length === 0) return
    if (anchorParam && items.some((item) => item.id === anchorParam && item.slot !== 'accessory')) {
      setAnchorId(anchorParam)
      return
    }
    setAnchorId((prev) => {
      if (prev && items.some((item) => item.id === prev && item.slot !== 'accessory')) return prev
      return items.find((item) => item.slot !== 'accessory')?.id
    })
  }, [items, anchorParam])

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])

  const savedCards = outfits
    .map((outfit) => ({
      outfit,
      items: outfit.item_ids
        .map((id) => byId.get(id))
        .filter((item): item is Item => Boolean(item)),
    }))
    .filter((card) => card.items.length >= 3)

  const recommend = useCallback(
    async (targetAnchorId?: string) => {
      const chosenId = targetAnchorId ?? anchorId ?? items.find((item) => item.slot !== 'accessory')?.id
      if (!chosenId) return
      const numericId = Number(chosenId)
      if (!Number.isFinite(numericId)) {
        setRecError('Item belum tersimpan di database backend.')
        return
      }
      setScoring(true)
      setRecError(null)
      setMissing([])
      try {
        const res = await api.recommendOutfits({
          anchor_item_id: numericId,
          usage: usage === 'all' ? null : usage,
          top_k: 5,
          strict_usage: false,
          include_accessory: true,
        })
        const mapped: Recommendation[] = res.recommendations.map((rec) => ({
          items: rec.items
            .map((entry) => byId.get(String(entry.item.id)) ?? mapBackendItem(entry.item, labels))
            .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)),
          score: rec.score_percent,
          usage,
          scorerBackend: res.meta.scorer_backend,
          inferenceMs: res.meta.inference_ms,
        }))
        setRecs(mapped)
      } catch (err) {
        if (err instanceof ApiClientError && err.code === 'INSUFFICIENT_ITEMS') {
          const miss = (err.details.missing_slots as Slot[] | undefined) ?? []
          setMissing(miss)
          setRecs([])
        } else {
          setRecError(err instanceof Error ? err.message : 'Gagal menghitung rekomendasi outfit.')
          setRecs([])
        }
      } finally {
        setScoring(false)
      }
    },
    [anchorId, items, usage, byId, labels],
  )

  useEffect(() => {
    if (autoRan || !anchorId || !anchorParam) return
    setAutoRan(true)
    void recommend(anchorId)
  }, [anchorId, anchorParam, autoRan, recommend])

  function save(rec: Recommendation) {
    saveOutfit({
      id: crypto.randomUUID(),
      item_ids: rec.items.map((item) => item.id),
      usage: rec.usage,
      score: rec.score,
      created_at: Date.now(),
    })
  }

  const isSaved = (rec: Recommendation) =>
    outfits.some((outfit) => sameIds(outfit.item_ids, rec.items.map((item) => item.id)))

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <Reveal>
        <Eyebrow className="text-bone/60">{t.mix.eyebrow}</Eyebrow>
        <h1 className="mt-2 font-slab uppercase text-4xl leading-none sm:text-6xl">{t.mix.title}</h1>
        <p className="mt-3 max-w-md text-sm text-bone/60">{t.mix.subtitle}</p>
      </Reveal>

      {(error || recError) && (
        <div className="border border-terracotta/50 bg-terracotta/10 px-4 py-3 text-xs text-terracotta">
          {recError ?? error}
        </div>
      )}

      <Reveal delay={0.1}>
        <div className="card-sharp p-5 sm:p-7">
          <Eyebrow className="text-bone/50">{t.mix.anchor}</Eyebrow>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {loading && items.length === 0 ? (
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Memuat lemari dari SQLite…</p>
            ) : (
              items.map((item) => {
                const blocked = item.slot === 'accessory'
                const selected = anchorId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={blocked}
                    onClick={() => {
                      setAnchorId(item.id)
                      setRecs([])
                    }}
                    className={`relative w-24 shrink-0 text-left transition-opacity ${
                      blocked ? 'cursor-not-allowed opacity-45' : ''
                    }`}
                  >
                    <GarmentImage
                      src={item.thumb_url ?? item.image_url}
                      alt={item.name}
                      slot={item.slot}
                      colour
                      className={`aspect-square w-full border transition-colors ${
                        selected ? 'border-bone' : 'border-bone/15'
                      }`}
                    />
                    {selected && (
                      <span className="absolute left-1 top-1 bg-bone px-1.5 py-0.5 text-[8px] font-bold tracking-[0.16em] text-coal">
                        {t.mix.utama}
                      </span>
                    )}
                    <p className="mt-1 truncate text-[9px] uppercase tracking-[0.12em] text-muted">{item.name}</p>
                  </button>
                )
              })
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-bone/15 pt-5">
            <span className="eyebrow mr-1 text-bone/50">{t.mix.usage}</span>
            <button
              type="button"
              onClick={() => {
                setUsage('all')
                setRecs([])
              }}
              className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] ${
                usage === 'all' ? 'border-bone bg-bone text-coal' : 'border-bone/20 text-bone/70'
              }`}
            >
              {t.mix.all}
            </button>
            {USAGES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setUsage(option)
                  setRecs([])
                }}
                className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] ${
                  usage === option ? 'border-bone bg-bone text-coal' : 'border-bone/20 text-bone/70'
                }`}
              >
                {USAGE_LABEL[option]}
              </button>
            ))}
            <button
              type="button"
              disabled={scoring || !anchorId}
              onClick={() => void recommend()}
              className="ml-auto flex items-center gap-1 rounded-full bg-bone px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-coal disabled:opacity-50"
            >
              <Shuffle className="h-3 w-3" /> {scoring ? 'MENGHITUNG…' : `${t.mix.build} ↗`}
            </button>
          </div>
        </div>
      </Reveal>

      {recs.map((rec, index) => {
        const saved = isSaved(rec)
        return (
          <Reveal key={`${index}-${rec.items.map((item) => item.id).join('-')}`}>
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <OutfitFrame
                  items={rec.items}
                  usage={rec.usage}
                  score={rec.score}
                  index={index + 1}
                  className="mx-auto w-full max-w-[480px]"
                />
              </div>

              <div className="card-sharp flex flex-col p-5 sm:p-6 lg:col-span-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-slab text-2xl">#{String(index + 1).padStart(2, '0')}</span>
                  <ScoreLabel value={rec.score} />
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1">
                    <ScoreBar value={rec.score} />
                  </div>
                  <span className="font-slab text-2xl">{rec.score}%</span>
                </div>

                <ul className="mt-5 divide-y divide-bone/15 border-y border-bone/15">
                  {rec.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 py-3">
                      <GarmentImage
                        src={item.thumb_url ?? item.image_url}
                        alt={item.name}
                        slot={item.slot}
                        colour
                        className="h-10 w-10 shrink-0 border border-bone/15"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-slab text-sm uppercase leading-tight">{item.name}</p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-muted">
                          {SLOT_LABEL[item.slot]} · {USAGE_LABEL[item.usage]}
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-muted">
                        <ColourDot colour={item.base_colour} /> {colourDisplay(item.base_colour)}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-muted">
                  {t.mix.reason}: {rec.usage === 'all' ? t.mix.all : USAGE_LABEL[rec.usage]} — skor model{' '}
                  {(rec.scorerBackend ?? 'mlp').toUpperCase()}
                  {rec.inferenceMs !== undefined ? ` (${rec.inferenceMs} ms)` : ''}.
                </p>

                <button
                  type="button"
                  disabled={saved}
                  onClick={() => save(rec)}
                  className={`mt-5 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                    saved
                      ? 'border border-sage/45 text-sage'
                      : 'bg-bone text-coal transition-opacity hover:opacity-85'
                  }`}
                >
                  {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  {saved ? t.mix.savedCta : t.mix.save}
                </button>
              </div>
            </div>
          </Reveal>
        )
      })}

      {recs.length === 0 && missing.length > 0 && (
        <EmptyState title="SLOT BELUM LENGKAP">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
            Kamu belum punya {missing.map((slot) => SLOT_LABEL[slot].toLowerCase()).join(', ')}.
          </p>
          <div className="flex gap-2">
            <Link
              to="/upload"
              className="rounded-full bg-bone px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-coal"
            >
              TAMBAH PAKAIAN
            </Link>
            <button
              type="button"
              onClick={() => void reset()}
              className="rounded-full border border-bone/20 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-bone/70"
            >
              {t.closet.reset}
            </button>
          </div>
        </EmptyState>
      )}

      {recs.length === 0 && missing.length === 0 && (
        <Reveal delay={0.15}>
          <div className="border border-dashed border-bone/20 px-6 py-16 text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-bone/60">{t.mix.prompt}</p>
          </div>
        </Reveal>
      )}

      {savedCards.length > 0 && (
        <Reveal>
          <div>
            <div className="flex items-end justify-between gap-3 border-b border-bone/15 pb-3">
              <Eyebrow className="text-bone/60">{t.mix.savedTitle}</Eyebrow>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
                [{String(savedCards.length).padStart(2, '0')}]
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {savedCards.map(({ outfit, items: savedItems }) => (
                <div key={outfit.id} className="card-sharp overflow-hidden">
                  <OutfitFrame items={savedItems} usage={outfit.usage} score={outfit.score} compact />
                  <div className="flex items-center justify-between gap-2 border-t border-bone/15 px-3 py-2">
                    <span className="truncate text-[9px] uppercase tracking-[0.14em] text-muted">
                      {outfit.usage === 'all' ? t.mix.all : USAGE_LABEL[outfit.usage]}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOutfit(outfit.id)}
                      aria-label={t.mix.deleteOutfit}
                      className="grid h-6 w-6 shrink-0 place-items-center border border-bone/15 text-bone/50 transition-colors hover:border-terracotta/55 hover:text-terracotta"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}
    </div>
  )
}
