import { useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, UploadCloud } from 'lucide-react'
import { useItems } from '../store'
import { USAGES, USAGE_LABEL, type Slot, type Usage } from '../types'
import { t } from '../lib/i18n'
import { Reveal } from '../lib/motion'
import { ConfidenceBadge, ColourDot, Eyebrow, GarmentImage, ScoreBar } from '../components/ui'

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

const COLOURS = ['putih', 'hitam', 'biru', 'navy', 'krem', 'cokelat', 'abu', 'hijau', 'merah', 'denim', 'ungu', 'copper']

const ALT_ARTICLES = ['tshirt', 'shirt', 'jacket']
const ALT_COLOURS = ['putih', 'hitam', 'biru']
const ALT_USAGES: Usage[] = ['kasual', 'smart_casual', 'formal']

type Stage = 'idle' | 'analyzing' | 'review' | 'saved'
type Conf = { article: number; colour: number; usage: number }

const SAMPLES = [
  {
    label: 'SWEATER ABU KASUAL',
    img: '/demo/top-2.jpg',
    article: 'sweater',
    colour: 'abu',
    usage: 'kasual' as Usage,
    conf: { article: 0.94, colour: 0.88, usage: 0.9 },
  },
  {
    label: 'KEMEJA PUTIH FORMAL',
    img: '/demo/top-1.jpg',
    article: 'shirt',
    colour: 'putih',
    usage: 'formal' as Usage,
    conf: { article: 0.9, colour: 0.85, usage: 0.58 },
  },
  {
    label: 'PUMPS SILVER PESTA',
    img: '/demo/shoes-3.jpg',
    article: 'formal_shoes',
    colour: 'silver',
    usage: 'pesta' as Usage,
    conf: { article: 0.88, colour: 0.72, usage: 0.82 },
  },
]

const articleSlot = (value: string): Slot =>
  ARTICLES.find((option) => option.value === value)?.slot ?? 'top'
const articleLabel = (value: string) =>
  ARTICLES.find((option) => option.value === value)?.label ?? value

export default function UploadPage() {
  const { add } = useItems()
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [url, setUrl] = useState<string>()
  const [article, setArticle] = useState('tshirt')
  const [colour, setColour] = useState('putih')
  const [usage, setUsage] = useState<Usage>('kasual')
  const [conf, setConf] = useState<Conf>({ article: 0.94, colour: 0.71, usage: 0.58 })

  function revoke() {
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
  }

  function handleFile(file?: File) {
    if (!file || !file.type.startsWith('image/')) return
    revoke()
    setUrl(URL.createObjectURL(file))
    setConf({ article: 0.94, colour: 0.71, usage: 0.58 })
    setStage('analyzing')
    window.setTimeout(() => setStage('review'), 1400)
  }

  function loadSample(sample: (typeof SAMPLES)[number]) {
    revoke()
    setUrl(sample.img)
    setArticle(sample.article)
    setColour(sample.colour)
    setUsage(sample.usage)
    setConf(sample.conf)
    setStage('review')
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    handleFile(event.dataTransfer.files?.[0])
  }

  function reset() {
    revoke()
    setUrl(undefined)
    setStage('idle')
  }

  function save() {
    add({
      id: crypto.randomUUID(),
      name: articleLabel(article),
      article_type: article,
      base_colour: colour,
      usage,
      slot: articleSlot(article),
      image_url: url,
      confidence: conf.article,
    })
    setStage('saved')
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
              : 'border-bone/20 text-bone/60 hover:border-bone/50 hover:text-bone'
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
                <img src={url} alt="Pratinjau" className="h-full w-full object-cover grayscale contrast-[1.1]" />
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <UploadCloud className="h-12 w-12 text-bone/30" strokeWidth={1.2} />
                  <p className="text-[11px] uppercase tracking-[0.16em] text-bone/60">
                    {t.upload.drop} <span className="text-bone">{t.upload.pick}</span>
                  </p>
                </div>
              )}
              {stage === 'analyzing' && (
                <div className="absolute inset-0 grid place-items-center bg-coal/75 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <motion.span
                      className="h-9 w-9 rounded-full border-2 border-bone/20 border-t-bone"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                    />
                    <p className="text-[10px] uppercase tracking-[0.16em]">{t.upload.analyzing}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-bone/15 p-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[10px] uppercase tracking-[0.16em] text-bone/70 hover:text-bone"
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
                <button key={sample.label} type="button" onClick={() => loadSample(sample)} className="group text-left">
                  <GarmentImage
                    src={sample.img}
                    alt={sample.label}
                    slot={articleSlot(sample.article)}
                    className="aspect-square w-full border border-bone/10 transition-colors group-hover:border-bone/40"
                  />
                  <span className="mt-1 block text-[8px] uppercase tracking-[0.12em] text-muted group-hover:text-bone">
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
                <Eyebrow className="text-bone/50">{t.upload.eyebrow}</Eyebrow>
                <h2 className="mt-2 font-slab text-2xl uppercase sm:text-3xl">{t.upload.review}</h2>

                {stage === 'idle' ? (
                  <p className="mt-4 max-w-md text-xs leading-relaxed text-bone/60">
                    Pilih foto atau pakai salah satu contoh cepat di kiri. Model akan mengisi tiga label beserta
                    tingkat keyakinannya.
                  </p>
                ) : (
                  <div className="mt-5 space-y-5">
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
                        {ARTICLES.map((option) => (
                          <option key={option.value} value={option.value} className="bg-coal">
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {chips(
                        ALT_ARTICLES.map((value) => ({ value, label: articleLabel(value) })),
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
                        {COLOURS.map((option) => (
                          <option key={option} value={option} className="bg-coal">
                            {option}
                          </option>
                        ))}
                      </select>
                      {chips(
                        ALT_COLOURS.map((value) => ({ value, label: value })),
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
                      {chips(
                        ALT_USAGES.map((value) => ({ value, label: USAGE_LABEL[value] })),
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
                      <ColourDot colour={colour} /> {colour}
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
                        onClick={save}
                        className="flex-1 rounded-full bg-bone px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-coal"
                      >
                        {t.upload.save}
                      </button>
                    </div>
                  </div>
                )}

                {stage === 'analyzing' && (
                  <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-muted">
                    Menjalankan MobileNetV2…
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
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  )
}
