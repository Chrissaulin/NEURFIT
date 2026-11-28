import { useMemo, useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, UploadCloud } from 'lucide-react'
import { useItems } from '../store'
import { colourDisplay, USAGES, USAGE_LABEL, type Slot, type Usage } from '../types'
import { api } from '../lib/api'
import { resolveImage } from '../lib/images'
import { t } from '../lib/i18n'
import { Reveal } from '../lib/motion'
import { ConfidenceBadge, ColourDot, Eyebrow, GarmentImage, ScoreBar } from '../components/ui'

const FALLBACK_ARTICLES: { key: string; display: string; slot: Slot }[] = [
  { key: 'tshirt', display: 'Kaos', slot: 'top' },
  { key: 'shirt', display: 'Kemeja', slot: 'top' },
  { key: 'sweater', display: 'Sweater', slot: 'top' },
  { key: 'jacket', display: 'Jaket', slot: 'top' },
  { key: 'jeans', display: 'Jeans', slot: 'bottom' },
  { key: 'trousers', display: 'Celana Panjang', slot: 'bottom' },
  { key: 'shorts', display: 'Celana Pendek', slot: 'bottom' },
  { key: 'skirt', display: 'Rok', slot: 'bottom' },
  { key: 'casual_shoes', display: 'Sepatu Kasual', slot: 'shoes' },
  { key: 'formal_shoes', display: 'Sepatu Formal', slot: 'shoes' },
  { key: 'sports_shoes', display: 'Sepatu Olahraga', slot: 'shoes' },
  { key: 'sandals', display: 'Sandal', slot: 'shoes' },
  { key: 'handbag', display: 'Tas Tangan', slot: 'accessory' },
  { key: 'watch', display: 'Jam Tangan', slot: 'accessory' },
  { key: 'sunglasses', display: 'Kacamata Hitam', slot: 'accessory' },
]

const FALLBACK_COLOURS = [
  'black',
  'white',
  'grey',
  'navy_blue',
  'blue',
  'brown',
  'beige',
  'red',
  'green',
  'pink',
  'yellow',
  'orange',
  'purple',
  'multi',
]

type Stage = 'idle' | 'analyzing' | 'review' | 'saving' | 'saved'
type Conf = { article: number; colour: number; usage: number }

const SAMPLES = [
  { label: 'SWEATER ABU', img: '/demo/top-2.jpg', slot: 'top' as Slot },
  { label: 'KEMEJA PUTIH', img: '/demo/top-1.jpg', slot: 'top' as Slot },
  { label: 'SEPATU HAK', img: '/demo/shoes-3.jpg', slot: 'shoes' as Slot },
]

export default function UploadPage() {
  const { labels, addFromBackend } = useItems()
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [url, setUrl] = useState<string>()
  const [tempId, setTempId] = useState<string | null>(null)
  const [article, setArticle] = useState('tshirt')
  const [colour, setColour] = useState('white')
  const [usage, setUsage] = useState<Usage>('casual')
  const [conf, setConf] = useState<Conf>({ article: 0, colour: 0, usage: 0 })
  const [altArticles, setAltArticles] = useState<string[]>([])
  const [altColours, setAltColours] = useState<string[]>([])
  const [altUsages, setAltUsages] = useState<Usage[]>([])
  const [supported, setSupported] = useState(true)
  const [inferenceMs, setInferenceMs] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const articleOptions = useMemo(() => {
    if (!labels) return FALLBACK_ARTICLES
    return labels.article_types
      .filter((entry) => entry.slot !== null && entry.key !== 'other')
      .map((entry) => ({ key: entry.key, display: entry.display, slot: entry.slot as Slot }))
  }, [labels])

  const colourOptions = useMemo(() => {
    if (!labels) return FALLBACK_COLOURS.map((key) => ({ key, display: colourDisplay(key) }))
    return labels.base_colours.map((entry) => ({ key: entry.key, display: entry.display }))
  }, [labels])

  const articleLabel = (key: string) =>
    articleOptions.find((option) => option.key === key)?.display ?? key

  const colourLabel = (key: string) =>
    colourOptions.find((option) => option.key === key)?.display ?? colourDisplay(key)

  function revoke() {
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
  }

  async function handleFile(file?: File) {
    if (!file || !file.type.startsWith('image/')) {
      setErrorMsg('Pilih file gambar berformat JPG, PNG, atau WEBP.')
      return
    }
    revoke()
    const previewUrl = URL.createObjectURL(file)
    setUrl(previewUrl)
    setErrorMsg(null)
    setTempId(null)
    setStage('analyzing')

    try {
      const res = await api.analyzeImage(file)
      setTempId(res.temp_id)
      const serverPreview = resolveImage(res.image_url)
      if (serverPreview) {
        URL.revokeObjectURL(previewUrl)
        setUrl(serverPreview)
      }
      const predArticle = res.predictions.article_type
      const predColour = res.predictions.base_colour
      const predUsage = res.predictions.usage

      const validArticle =
        predArticle.label !== 'other'
          ? predArticle.label
          : (predArticle.top_k.find((k) => k.label !== 'other')?.label ?? 'tshirt')

      setArticle(validArticle)
      setColour(predColour.label)
      setUsage(predUsage.label as Usage)
      setConf({
        article: predArticle.confidence,
        colour: predColour.confidence,
        usage: predUsage.confidence,
      })
      setAltArticles(
        predArticle.top_k.map((k) => k.label).filter((label) => label !== 'other'),
      )
      setAltColours(predColour.top_k.map((k) => k.label))
      setAltUsages(predUsage.top_k.map((k) => k.label as Usage))
      setSupported(res.supported)
      setInferenceMs(res.inference_ms)
      setStage('review')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menganalisis gambar di server.')
      setStage('idle')
    }
  }

  async function loadSample(sample: (typeof SAMPLES)[number]) {
    setErrorMsg(null)
    setStage('analyzing')
    try {
      const response = await fetch(sample.img)
      const blob = await response.blob()
      const file = new File([blob], sample.img.split('/').pop() ?? 'sample.jpg', {
        type: blob.type || 'image/jpeg',
      })
      await handleFile(file)
    } catch {
      setErrorMsg('Gagal memuat gambar contoh.')
      setStage('idle')
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    void handleFile(event.dataTransfer.files?.[0])
  }

  function reset() {
    revoke()
    setUrl(undefined)
    setTempId(null)
    setErrorMsg(null)
    setInferenceMs(null)
    setStage('idle')
  }

  async function save() {
    if (!tempId) {
      setErrorMsg('Sesi analisis tidak ditemukan. Unggah ulang gambar.')
      return
    }
    setStage('saving')
    setErrorMsg(null)
    try {
      const saved = await api.saveItem({
        temp_id: tempId,
        article_type: article,
        base_colour: colour,
        usage,
      })
      addFromBackend(saved)
      setStage('saved')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan item ke database.')
      setStage('review')
    }
  }

  const chips = (
    items: { value: string; label: string }[],
    current: string,
    onPick: (value: string) => void,
  ) => (
    <div className="mt-2 flex flex-wrap gap-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onPick(item.value)}
          className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] transition-colors ${
            current === item.value
              ? 'border-bone bg-bone text-coal'
              : 'border-bone/20 text-bone/60 hover:border-bone/50 hover:text-[#C9A24B]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <Reveal>
        <Eyebrow className="text-bone/60">{t.upload.eyebrow}</Eyebrow>
        <h1 className="mt-2 font-slab uppercase text-4xl leading-none sm:text-6xl">{t.upload.title}</h1>
        <p className="mt-3 max-w-md text-sm text-bone/60">{t.upload.subtitle}</p>
      </Reveal>

      {errorMsg && (
        <div className="mt-6 border border-terracotta/50 bg-terracotta/10 px-4 py-3 text-xs text-terracotta">
          {errorMsg}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <Reveal className="space-y-6 lg:col-span-5">
          <div className="card-sharp">
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden"
            >
              {url ? (
                <img src={url} alt="Pratinjau" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <UploadCloud className="h-12 w-12 text-bone/30" strokeWidth={1.2} />
                  <p className="text-[11px] uppercase tracking-[0.16em] text-bone/60">
                    {t.upload.drop} <span className="text-bone">{t.upload.pick}</span>
                  </p>
                </div>
              )}
              {(stage === 'analyzing' || stage === 'saving') && (
                <div className="absolute inset-0 grid place-items-center bg-coal/75 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <motion.span
                      className="h-9 w-9 rounded-full border-2 border-bone/20 border-t-bone"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                    />
                    <p className="text-[10px] uppercase tracking-[0.16em]">
                      {stage === 'saving' ? 'MENYIMPAN KE SQLITE…' : t.upload.analyzing}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-bone/15 p-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[10px] uppercase tracking-[0.16em] text-bone/70 hover:text-[#C9A24B]"
              >
                {t.upload.change}
              </button>
              <span className="text-[9px] uppercase tracking-[0.14em] text-muted">JPG/PNG · MAKS 8MB</span>
            </div>
          </div>

          <div className="card-sharp p-4">
            <p className="eyebrow text-bone/50">{t.upload.samples}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => void loadSample(sample)}
                  className="group text-left"
                >
                  <GarmentImage
                    src={sample.img}
                    alt={sample.label}
                    slot={sample.slot}
                    className="aspect-square w-full border border-bone/10 transition-colors group-hover:border-bone/40"
                  />
                  <span className="mt-1 block text-[8px] uppercase tracking-[0.12em] text-muted group-hover:text-[#C9A24B]">
                    {sample.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="card-sharp flex h-full flex-col p-5 sm:p-7">
            {stage === 'saved' ? (
              <div className="grid flex-1 place-items-center text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-sage/20 text-sage">
                    <Check className="h-7 w-7" />
                  </div>
                  <h2 className="font-slab text-2xl uppercase">{t.upload.saved}</h2>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">{t.upload.savedNote}</p>
                  <div className="mt-2 flex gap-2">
                    <Link to="/closet" className="rounded-full bg-bone px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-coal">
                      {t.upload.toCloset}
                    </Link>
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-full border border-bone/20 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-bone/70"
                    >
                      {t.upload.again}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <Eyebrow className="text-bone/50">{t.upload.eyebrow}</Eyebrow>
                  {inferenceMs !== null && (
                    <span className="text-[9px] uppercase tracking-[0.14em] text-muted">
                      EFFICIENTNETB0 · {inferenceMs} MS
                    </span>
                  )}
                </div>
                <h2 className="mt-2 font-slab text-2xl uppercase sm:text-3xl">{t.upload.review}</h2>

                {stage === 'idle' ? (
                  <p className="mt-4 max-w-md text-xs leading-relaxed text-bone/60">
                    Pilih foto atau pakai salah satu contoh cepat di kiri. Model EfficientNetB0 di backend akan
                    memprediksi tipe pakaian, warna dasar, acara, dan embedding 256-d.
                  </p>
                ) : (
                  <div className="mt-5 space-y-5">
                    {!supported && (
                      <p className="border border-terracotta/40 bg-terracotta/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-terracotta">
                        Prediksi awal masuk kategori &quot;other&quot; — silakan pilih kategori terdekat di bawah.
                      </p>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="eyebrow text-bone/50">{t.upload.article}</span>
                        <ConfidenceBadge value={conf.article} />
                      </div>
                      <select
                        value={article}
                        onChange={(event) => setArticle(event.target.value)}
                        className="mt-2 w-full border border-bone/20 bg-coal px-3 py-2 text-xs uppercase tracking-[0.14em] text-bone"
                      >
                        {articleOptions.map((option) => (
                          <option key={option.key} value={option.key} className="bg-coal">
                            {option.display}
                          </option>
                        ))}
                      </select>
                      {altArticles.length > 0 &&
                        chips(
                          altArticles.map((value) => ({ value, label: articleLabel(value) })),
                          article,
                          setArticle,
                        )}
                      <div className="mt-2">
                        <ScoreBar value={conf.article * 100} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="eyebrow text-bone/50">{t.upload.colour}</span>
                        <ConfidenceBadge value={conf.colour} />
                      </div>
                      <select
                        value={colour}
                        onChange={(event) => setColour(event.target.value)}
                        className="mt-2 w-full border border-bone/20 bg-coal px-3 py-2 text-xs uppercase tracking-[0.14em] text-bone"
                      >
                        {colourOptions.map((option) => (
                          <option key={option.key} value={option.key} className="bg-coal">
                            {option.display}
                          </option>
                        ))}
                      </select>
                      {altColours.length > 0 &&
                        chips(
                          altColours.map((value) => ({ value, label: colourLabel(value) })),
                          colour,
                          setColour,
                        )}
                      <div className="mt-2">
                        <ScoreBar value={conf.colour * 100} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="eyebrow text-bone/50">{t.upload.usage}</span>
                        <ConfidenceBadge value={conf.usage} />
                      </div>
                      <select
                        value={usage}
                        onChange={(event) => setUsage(event.target.value as Usage)}
                        className="mt-2 w-full border border-bone/20 bg-coal px-3 py-2 text-xs uppercase tracking-[0.14em] text-bone"
                      >
                        {USAGES.map((option) => (
                          <option key={option} value={option} className="bg-coal">
                            {USAGE_LABEL[option]}
                          </option>
                        ))}
                      </select>
                      {altUsages.length > 0 &&
                        chips(
                          altUsages.map((value) => ({ value, label: USAGE_LABEL[value] })),
                          usage,
                          (value) => setUsage(value as Usage),
                        )}
                      <div className="mt-2">
                        <ScoreBar value={conf.usage * 100} />
                      </div>
                      {conf.usage < 0.6 && (
                        <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-terracotta">
                          {t.upload.check}: acara di bawah 60%.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted">
                      <ColourDot colour={colour} /> {colourLabel(colour)}
                    </div>

                    <div className="flex gap-2 border-t border-bone/15 pt-4">
                      <button
                        type="button"
                        onClick={reset}
                        className="rounded-full border border-bone/20 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-bone/70"
                      >
                        {t.upload.change}
                      </button>
                      <button
                        type="button"
                        disabled={stage === 'analyzing' || stage === 'saving'}
                        onClick={() => void save()}
                        className="flex-1 rounded-full bg-bone px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-coal disabled:opacity-50"
                      >
                        {t.upload.save}
                      </button>
                    </div>
                  </div>
                )}

                {stage === 'analyzing' && (
                  <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-muted">
                    Menjalankan EfficientNetB0…
                  </p>
                )}
              </>
            )}
          </div>
        </Reveal>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  )
}
