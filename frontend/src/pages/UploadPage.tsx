import { useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, UploadCloud } from 'lucide-react'
import { useItems } from '../store'
import { USAGES, USAGE_LABEL, type Usage } from '../types'
import { t } from '../lib/i18n'
import { EASE, Reveal } from '../lib/motion'
import { ColourDot } from '../components/ui'

const ARTICLES = [
  { value: 'tshirt', label: 'Kaos', slot: 'top' },
  { value: 'shirt', label: 'Kemeja', slot: 'top' },
  { value: 'sweater', label: 'Sweater', slot: 'top' },
  { value: 'jacket', label: 'Jaket', slot: 'top' },
  { value: 'jeans', label: 'Jeans', slot: 'bottom' },
  { value: 'trousers', label: 'Celana', slot: 'bottom' },
  { value: 'skirt', label: 'Rok', slot: 'bottom' },
  { value: 'casual_shoes', label: 'Sepatu Kasual', slot: 'shoes' },
  { value: 'formal_shoes', label: 'Sepatu Formal', slot: 'shoes' },
  { value: 'sports_shoes', label: 'Sepatu Olahraga', slot: 'shoes' },
  { value: 'sandals', label: 'Sandal', slot: 'shoes' },
  { value: 'handbag', label: 'Tas', slot: 'accessory' },
  { value: 'watch', label: 'Jam', slot: 'accessory' },
  { value: 'sunglasses', label: 'Kacamata', slot: 'accessory' },
] as const

const COLOURS = ['putih', 'hitam', 'biru', 'navy', 'krem', 'cokelat', 'abu', 'hijau', 'merah', 'denim']

type Stage = 'idle' | 'analyzing' | 'review' | 'saved'

function ConfBar({ label, value }: { label: string; value: number }) {
  const tone = value >= 0.85 ? 'bg-green-600' : value >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-ink/60">{label}</span>
        <span className="font-medium">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <motion.div
          className={`h-full rounded-full ${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, ease: EASE }}
        />
      </div>
    </div>
  )
}

export default function UploadPage() {
  const { add } = useItems()
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [url, setUrl] = useState<string>()
  const [article, setArticle] = useState('tshirt')
  const [colour, setColour] = useState('putih')
  const [usage, setUsage] = useState<Usage>('kasual')
  const [conf] = useState({ article: 0.94, colour: 0.71, usage: 0.58 })

  function handleFile(file?: File) {
    if (!file || !file.type.startsWith('image/')) return
    if (url) URL.revokeObjectURL(url)
    setUrl(URL.createObjectURL(file))
    setStage('analyzing')
    window.setTimeout(() => setStage('review'), 1400)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    handleFile(event.dataTransfer.files?.[0])
  }

  function reset() {
    if (url) URL.revokeObjectURL(url)
    setUrl(undefined)
    setStage('idle')
  }

  function save() {
    const current = ARTICLES.find((option) => option.value === article) ?? ARTICLES[0]
    add({
      id: crypto.randomUUID(),
      name: current.label,
      article_type: article,
      base_colour: colour,
      usage,
      slot: current.slot,
      image_url: url,
      confidence: conf.article,
    })
    setStage('saved')
  }

  return (
    <div className="space-y-10">
      <Reveal>
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-ink/50">{t.upload.eyebrow}</p>
          <h1 className="font-display text-4xl font-semibold sm:text-6xl">{t.upload.title}</h1>
          <p className="mt-3 max-w-md text-ink/60">{t.upload.subtitle}</p>
        </div>
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-2">
        <Reveal>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className="surface relative grid aspect-[4/5] cursor-pointer place-items-center overflow-hidden"
          >
            {url ? (
              <img src={url} alt="Pratinjau" className="cutout h-full w-full object-contain p-8" />
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <UploadCloud className="h-12 w-12 text-ink/30" strokeWidth={1.25} />
                <p className="text-sm text-ink/60">
                  {t.upload.drop} <span className="font-medium text-ink">{t.upload.pick}</span>
                </p>
              </div>
            )}

            {stage === 'analyzing' && (
              <div className="absolute inset-0 grid place-items-center bg-cream/70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <motion.span
                    className="h-10 w-10 rounded-full border-2 border-ink/20 border-t-ink"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                  />
                  <p className="text-sm font-medium">{t.upload.analyzing}</p>
                </div>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          {stage === 'saved' ? (
            <div className="surface flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-pistachio">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-semibold">{t.upload.saved}</h2>
              <p className="text-ink/60">{t.upload.savedNote}</p>
              <div className="mt-2 flex gap-2">
                <Link to="/closet" className="pill pill-active">
                  {t.upload.toCloset}
                </Link>
                <button type="button" onClick={reset} className="pill">
                  {t.upload.again}
                </button>
              </div>
            </div>
          ) : (
            <div className="surface space-y-5 p-6 sm:p-8">
              <h2 className="font-display text-2xl font-semibold">
                {stage === 'idle' ? t.upload.pick : t.upload.review}
              </h2>

              {stage === 'idle' ? (
                <p className="text-sm text-ink/60">{t.upload.subtitle}</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="text-sm">
                      <span className="mb-1 block text-ink/60">{t.upload.article}</span>
                      <select
                        value={article}
                        onChange={(event) => setArticle(event.target.value)}
                        className="w-full rounded-xl border border-line bg-white/70 px-3 py-2"
                      >
                        {ARTICLES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-ink/60">{t.upload.colour}</span>
                      <select
                        value={colour}
                        onChange={(event) => setColour(event.target.value)}
                        className="w-full rounded-xl border border-line bg-white/70 px-3 py-2"
                      >
                        {COLOURS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-ink/60">{t.upload.usage}</span>
                      <select
                        value={usage}
                        onChange={(event) => setUsage(event.target.value as Usage)}
                        className="w-full rounded-xl border border-line bg-white/70 px-3 py-2"
                      >
                        {USAGES.map((option) => (
                          <option key={option} value={option}>
                            {USAGE_LABEL[option]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <ConfBar label={t.upload.article} value={conf.article} />
                    <ConfBar label={t.upload.colour} value={conf.colour} />
                    <ConfBar label={t.upload.usage} value={conf.usage} />
                    {conf.usage < 0.6 && (
                      <p className="text-sm text-red-600">
                        {t.upload.check}: {t.upload.usage} di bawah 60%.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-ink/60">
                    <ColourDot colour={colour} /> {colour}
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={reset} className="pill">
                      {t.upload.change}
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      className="pill pill-active flex-1 justify-center py-3"
                    >
                      {t.upload.save}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </Reveal>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  )
}
