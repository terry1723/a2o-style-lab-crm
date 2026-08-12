import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react'
import { transformationCases } from '../data/cases'
import { faqs } from '../data/faq'
import { audiences, services } from '../data/services'
import { trackHomepageEvent } from '../services/analytics'
import { useHeroParallax } from '../hooks/useHeroParallax'
import { A2OEditorialIcon, type EditorialIconName } from './A2OEditorialIcons'
import { A2OMarquee } from './A2OMarquee'

const methods: Array<{ number: string; name: string; english: string; copy: string; icon: EditorialIconName }> = [
  { number: '01', name: '比例', english: 'PROPORTION', copy: '分析身形比例與服裝輪廓，建立更平衡、更俐落的視覺比例。', icon: 'proportion' },
  { number: '02', name: '色彩', english: 'COLOUR', copy: '根據膚色與個人氣質，找出真正適合你的色彩方向。', icon: 'colour' },
  { number: '03', name: '儀容', english: 'GROOMING', copy: '整理髮型、輪廓與細節，提升精神感及整潔度。', icon: 'grooming' },
  { number: '04', name: '風格', english: 'STYLE', copy: '建立與身份、工作及生活方式一致的個人風格。', icon: 'style' },
]

const serviceIcons: EditorialIconName[] = ['consultation', 'colour', 'proportion', 'grooming', 'wardrobe', 'shopping', 'photography', 'style']

const outcomes = [
  ['01', '方向更清晰', '更了解適合自己的髮型、色彩與穿搭方向。'],
  ['02', '專業感提升', '工作、見客及拍攝時呈現更可信的外在訊號。'],
  ['03', '減少錯誤購物', '建立實用添置次序，不再反覆購買不合適單品。'],
  ['04', '日常更容易執行', '穿搭變得有系統，能夠長期維持而不是只靠一套造型。'],
]

const rise = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }
const bookingWhatsAppUrl = `https://wa.me/85254077240?text=${encodeURIComponent('你好，我想預約一對一形象諮詢。')}`

function Heading({ eyebrow, title, copy, light = false }: { eyebrow?: string; title: string; copy?: string; light?: boolean }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className={`mb-4 text-[10px] font-black tracking-[0.25em] ${light ? 'text-white/50' : 'text-black/50'}`}>{eyebrow}</p>}
      <h2 className={`font-serif text-4xl font-black leading-[1.12] sm:text-5xl ${light ? 'text-[#f7f6f2]' : 'text-black'}`}>{title}</h2>
      {copy && <p className={`mt-5 max-w-xl text-sm font-semibold leading-7 sm:text-base ${light ? 'text-white/65' : 'text-black/65'}`}>{copy}</p>}
    </div>
  )
}

function ScrollEvents() {
  const sent = useRef(new Set<number>())
  useEffect(() => {
    const run = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      ;([25, 50, 75] as const).forEach((mark) => {
        if (window.scrollY / scrollable >= mark / 100 && !sent.current.has(mark)) {
          sent.current.add(mark)
          trackHomepageEvent(`homepage_scroll_${mark}`)
        }
      })
    }
    window.addEventListener('scroll', run, { passive: true })
    return () => window.removeEventListener('scroll', run)
  }, [])
  return null
}

export function A2OHomepageContent({ assessment }: { assessment?: ReactNode }) {
  const reducedMotion = useReducedMotion()
  const heroParallax = useHeroParallax(Boolean(reducedMotion))
  const carouselRef = useRef<HTMLDivElement>(null)
  const viewedCases = useRef(new Set<string>())
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  const moveCarousel = (direction: 'next' | 'previous') => {
    const carousel = carouselRef.current
    if (!carousel) return
    carousel.scrollBy({ left: (direction === 'next' ? 1 : -1) * Math.min(carousel.clientWidth * 0.86, 430), behavior: reducedMotion ? 'auto' : 'smooth' })
    trackHomepageEvent('homepage_case_swipe', { direction })
  }

  const onCarouselScroll = () => {
    const carousel = carouselRef.current
    if (!carousel) return
    const index = Math.min(transformationCases.length - 1, Math.max(0, Math.round(carousel.scrollLeft / Math.max(1, carousel.clientWidth * 0.86))))
    const current = transformationCases[index]
    if (current && !viewedCases.current.has(current.id)) {
      viewedCases.current.add(current.id)
      trackHomepageEvent('homepage_case_view', { case_id: current.id })
    }
  }

  return (
    <main className="overflow-x-hidden bg-[#080808] font-sans text-[#f7f6f2] selection:bg-white selection:text-black">
      <ScrollEvents />

      <section onPointerMove={heroParallax.onPointerMove} onPointerLeave={heroParallax.onPointerLeave} className="relative flex min-h-[88svh] items-center overflow-hidden border-b border-white/15 px-5 py-20 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_34%,rgba(255,255,255,.16),transparent_25%),linear-gradient(90deg,#080808_0%,#080808_45%,rgba(8,8,8,.25)_100%)]" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[.86fr_1.14fr] lg:gap-16">
          <motion.div initial="hidden" animate="visible" variants={rise} transition={{ duration: 0.55 }} className="relative z-10">
            <img src="/a2o/brand/a2o-logo-crop.jpg" alt="A2O Style Lab" className="mb-9 h-12 w-auto object-contain object-left mix-blend-screen grayscale invert" />
            <h1 className="max-w-2xl font-serif text-5xl font-black leading-[1.08] sm:text-6xl lg:text-7xl">形象，是你最值得投資的長期資產</h1>
            <p className="mt-7 max-w-xl text-[15px] font-semibold leading-8 text-white/65 sm:text-base">A2O Style Lab 專注男士形象管理。我們從身形比例、個人色彩、髮型、穿搭與風格定位出發，協助你建立更自信、更得體、更符合身份與生活方式的形象。</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => { trackHomepageEvent('homepage_final_cta', { action: 'assessment' }); scrollToSection('assessment') }} className="inline-flex min-h-12 items-center justify-center bg-[#f7f6f2] px-7 text-sm font-black text-black transition hover:bg-black hover:text-white hover:ring-1 hover:ring-white">開始形象檢測</button>
              <button type="button" onClick={() => scrollToSection('a2o-method')} className="inline-flex min-h-12 items-center justify-center border border-white/50 px-7 text-sm font-black transition hover:bg-white hover:text-black">了解 A2O 形象方法</button>
            </div>
          </motion.div>
          <motion.figure initial="hidden" animate="visible" variants={rise} transition={{ duration: 0.65, delay: 0.15 }} className="relative overflow-hidden border border-white/20 bg-[#111]">
            <motion.div animate={{ x: heroParallax.offset.x, y: heroParallax.offset.y }} transition={{ type: 'spring', stiffness: 110, damping: 24, mass: 0.6 }} className="relative scale-[1.025] will-change-transform">
              <img src="/a2o/editorial/client-editorial-strip.png" alt="A2O Style Lab 客戶形象作品" className="w-full object-contain contrast-110" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/5" />
            </motion.div>
          </motion.figure>
        </div>
      </section>

      <A2OMarquee />

      {assessment}

      <section data-motion-section="transformations" aria-label="真實改變・看得見的影響力" className="border-b border-white/15 px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <motion.div initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: reducedMotion ? 0 : 0.55 }} className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <Heading light eyebrow="REAL TRANSFORMATIONS" title="真實改變・看得見的影響力" copy="不同的人，需要不同的形象方向。A2O 從髮型、比例、色彩與穿搭，設計真正適合每個人的改善方法。" />
            <div className="flex gap-3"><button type="button" aria-label="查看上一個設計案例" onClick={() => moveCarousel('previous')} className="grid h-12 w-12 place-items-center border border-white/35 hover:bg-white hover:text-black"><ArrowLeft size={19} /></button><button type="button" aria-label="查看下一個設計案例" onClick={() => moveCarousel('next')} className="grid h-12 w-12 place-items-center border border-white/35 hover:bg-white hover:text-black"><ArrowRight size={19} /></button></div>
          </motion.div>
          <div ref={carouselRef} onScroll={onCarouselScroll} onKeyDown={(event) => { if (event.key === 'ArrowRight') moveCarousel('next'); if (event.key === 'ArrowLeft') moveCarousel('previous') }} tabIndex={0} aria-label="A2O Before and After 設計案例" className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 outline-none focus-visible:ring-2 focus-visible:ring-white">
            {transformationCases.map((item, index) => <motion.article data-motion-card="transformation" initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.24 }} transition={{ duration: reducedMotion ? 0 : 0.48, delay: reducedMotion ? 0 : Math.min(index, 3) * 0.07 }} key={item.id} className="group w-[86vw] shrink-0 snap-start sm:w-80 lg:w-[calc((100%-2.5rem)/3)]"><div className="overflow-hidden border border-white/15 bg-[#151515] p-2"><img src={item.image} alt={item.alt} loading="lazy" className="aspect-[3/4] w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.025] motion-reduce:transform-none" /></div><div className="mt-4 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="border border-white/20 px-3 py-1 text-[10px] font-bold tracking-[.12em] text-white/65">{tag}</span>)}</div></motion.article>)}
          </div>
          <button type="button" onClick={() => scrollToSection('transformation-overview')} className="mt-8 inline-flex min-h-11 items-center gap-2 border-b border-white pb-1 text-sm font-black">查看更多案例 <ArrowUpRight size={16} /></button>
          <figure id="transformation-overview" className="mt-14 overflow-hidden border border-white/15 bg-[#111]"><img src="/a2o/editorial/transformation-collage.png" alt="A2O Style Lab 多個客戶的形象轉變" loading="lazy" className="w-full object-contain" /></figure>
        </div>
      </section>

      <section id="a2o-method" className="scroll-mt-6 border-b border-white/15 px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl"><Heading light eyebrow="A2O METHOD" title="A2O 形象方法" copy="不是追逐潮流，而是從比例、色彩、儀容與風格，建立真正適合你的形象系統。" />
          <div className="mt-12 grid border border-white/15 sm:grid-cols-2 lg:grid-cols-4">{methods.map((item) => <article key={item.number} className="min-h-72 border-b border-r border-white/15 bg-gradient-to-b from-[#171717] to-[#0b0b0b] p-7"><div className="flex items-start justify-between"><span className="text-xs font-black tracking-[.16em] text-white/35">{item.number}</span><span data-editorial-icon={item.icon} className="grid h-14 w-14 place-items-center rounded-xl border-2 border-white bg-[#0b0b0b] p-2"><A2OEditorialIcon name={item.icon} className="h-full w-full" /></span></div><h3 className="mt-10 font-serif text-3xl font-black">{item.name}</h3><p className="mt-1 text-[10px] font-black tracking-[.16em] text-white/40">{item.english}</p><p className="mt-5 text-sm font-semibold leading-7 text-white/65">{item.copy}</p></article>)}</div>
        </div>
      </section>

      <section data-motion-section="services" className="bg-[#f7f6f2] px-5 py-20 text-black sm:px-8 sm:py-28 lg:px-12"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-20"><motion.div initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: reducedMotion ? 0 : 0.52 }}><Heading eyebrow="A2O SERVICES" title="服務內容" copy="從初步分析到實際執行，按你的需要建立完整而可持續的形象方向。" /></motion.div><div className="border-t-2 border-black">{services.map((service, index) => <motion.article data-motion-row="service" initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.55 }} transition={{ duration: reducedMotion ? 0 : 0.38, delay: reducedMotion ? 0 : Math.min(index, 5) * 0.055 }} key={service} className="group grid min-h-16 grid-cols-[48px_1fr_20px] items-center gap-4 border-b border-black/25 py-3"><span data-editorial-icon={serviceIcons[index]} className="grid h-10 w-10 place-items-center rounded-lg border-2 border-black p-1.5 transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"><A2OEditorialIcon name={serviceIcons[index]} className="h-full w-full" /></span><h3 className="text-sm font-black sm:text-base">{service}</h3><span className="text-xl transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">›</span></motion.article>)}</div></div></section>

      <section className="border-b border-white/15 px-5 py-20 sm:px-8 sm:py-24 lg:px-12"><div className="mx-auto max-w-7xl"><Heading light title="適合這樣的你" /><div className="mt-10 flex flex-wrap gap-3">{audiences.map((audience, index) => <div key={audience} className="flex min-h-12 items-center gap-3 rounded-full border border-white/35 px-5 text-sm font-black"><A2OEditorialIcon name={index % 2 ? 'founder' : 'professional'} className="h-5 w-5" />{audience}</div>)}</div></div></section>

      <section className="border-b border-white/15 px-5 py-20 sm:px-8 sm:py-28 lg:px-12"><div className="mx-auto max-w-7xl"><Heading light eyebrow="COMMON OUTCOMES" title="客戶常見轉變" copy="把形象改善轉化成清晰、實用，而且可以長期維持的日常方法。" /><div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{outcomes.map(([number, title, copy], index) => <article key={number} className={`min-h-48 border p-6 ${index % 2 ? 'border-white bg-[#f7f6f2] text-black' : 'border-white/20 bg-[#151515]'}`}><b className="font-serif text-4xl font-black">{number}</b><h3 className="mt-8 font-serif text-xl font-black">{title}</h3><p className={`mt-3 text-xs font-semibold leading-6 ${index % 2 ? 'text-black/65' : 'text-white/65'}`}>{copy}</p></article>)}</div></div></section>

      <section className="grid border-b border-white/15 lg:grid-cols-2"><figure className="min-h-[380px] bg-[#111]"><img src="/a2o/editorial/transformation-collage.png" alt="A2O Style Lab 為不同客戶設計的形象方向" loading="lazy" className="h-full w-full object-cover brightness-75" /></figure><div className="flex items-center bg-[#f7f6f2] px-6 py-16 text-black sm:px-12 lg:px-16"><Heading eyebrow="ABOUT A2O STYLE LAB" title="建立的不是一套造型，而是一套真正適合你的形象系統。" copy="透過髮型、比例、色彩、穿搭及整體風格，建立符合身份、工作與生活方式的個人形象。" /></div></section>

      <section className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.45fr_1fr] lg:gap-20"><Heading light eyebrow="FAQ" title="常見問題" /><div className="border-t border-white/30">{faqs.map((faq, index) => { const open = openFaq === index; return <div key={faq.question} className="border-b border-white/30"><h3><button type="button" aria-expanded={open} aria-controls={`faq-${index}`} onClick={() => setOpenFaq(open ? null : index)} className="flex min-h-16 w-full items-center justify-between gap-5 py-4 text-left text-sm font-black sm:text-base">{faq.question}<ChevronDown size={19} className={open ? 'rotate-180' : ''} /></button></h3><div id={`faq-${index}`} role="region" aria-hidden={!open} className={`grid transition-[grid-template-rows] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden"><p className="max-w-2xl pb-6 text-sm font-semibold leading-7 text-white/65">{faq.answer}</p></div></div></div> })}</div></div></section>

      <section className="border-t border-white/15 px-5 py-20 text-center sm:px-8 sm:py-28"><div className="mx-auto max-w-4xl"><p className="text-[10px] font-black tracking-[.25em] text-white/45">A2O STYLE LAB</p><h2 className="mt-5 font-serif text-4xl font-black leading-tight sm:text-6xl">準備好，建立更適合你的形象了嗎？</h2><p className="mt-6 text-sm font-semibold text-white/60">從了解自己開始，找到真正適合你的方向。</p><div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => scrollToSection('assessment')} className="inline-flex min-h-12 items-center justify-center bg-[#f7f6f2] px-7 text-sm font-black text-black hover:bg-black hover:text-white hover:ring-1 hover:ring-white">開始形象檢測</button><a href={bookingWhatsAppUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackHomepageEvent('homepage_final_cta', { action: 'booking' })} className="inline-flex min-h-12 items-center justify-center border border-white/50 px-7 text-sm font-black hover:bg-white hover:text-black">預約一對一諮詢</a></div></div></section>
      <footer className="border-t border-white/15 px-5 py-8 text-xs font-bold text-white/45 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:justify-between"><span className="tracking-[.16em]">A2O STYLE LAB</span><span>© {new Date().getFullYear()} A2O Style Lab. All rights reserved.</span></div></footer>
    </main>
  )
}
