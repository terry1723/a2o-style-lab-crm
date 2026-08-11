import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Palette,
  Ruler,
  Scissors,
  Sparkles,
} from 'lucide-react'
import { transformationCases } from '../data/cases'
import { faqs } from '../data/faq'
import { audiences, services } from '../data/services'
import { testimonials } from '../data/testimonials'
import { trackHomepageEvent } from '../services/analytics'

const methodItems = [
  {
    number: '01',
    name: '比例',
    english: 'Proportion',
    copy: '分析身形比例與服裝版型，改善整體視覺平衡。',
    Icon: Ruler,
  },
  {
    number: '02',
    name: '色彩',
    english: 'Colour',
    copy: '根據個人膚色與整體條件，建立適合自己的色彩方向。',
    Icon: Palette,
  },
  {
    number: '03',
    name: '儀容',
    english: 'Grooming',
    copy: '從髮型、整理到細節管理，建立乾淨而有精神的外在形象。',
    Icon: Scissors,
  },
  {
    number: '04',
    name: '風格',
    english: 'Style',
    copy: '根據身份、生活方式與需要，建立一致而可持續的個人風格。',
    Icon: Sparkles,
  },
]

const processSteps = [
  ['01', '了解需要', '了解目前形象、生活方式與改善目標。'],
  ['02', '形象分析', '分析比例、色彩、髮型及風格方向。'],
  ['03', '制定方向', '建立適合個人條件與需要的改善方案。'],
  ['04', '執行改善', '將分析轉化成真正可實行的形象調整。'],
  ['05', '持續優化', '建立可長期維持的個人形象系統。'],
]

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow?: string; title: string; copy?: string }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className="mb-4 text-[11px] font-semibold tracking-[0.22em] text-[#131f34]/60">{eyebrow}</p>}
      <h2 className="font-serif text-4xl leading-[1.15] text-[#131f34] sm:text-5xl">{title}</h2>
      {copy && <p className="mt-5 max-w-xl text-sm leading-7 text-[#131f34]/70 sm:text-base">{copy}</p>}
    </div>
  )
}

function ScrollEvents() {
  const sentRef = useRef(new Set<number>())

  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      const ratio = window.scrollY / scrollable
      ;([25, 50, 75] as const).forEach((mark) => {
        if (ratio >= mark / 100 && !sentRef.current.has(mark)) {
          sentRef.current.add(mark)
          trackHomepageEvent(`homepage_scroll_${mark}`)
        }
      })
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return null
}

export function A2OHomepageContent() {
  const reducedMotion = useReducedMotion()
  const carouselRef = useRef<HTMLDivElement>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const viewedCasesRef = useRef(new Set<string>())

  const moveCarousel = (direction: 'next' | 'previous') => {
    const carousel = carouselRef.current
    if (!carousel) return
    const amount = Math.min(carousel.clientWidth * 0.86, 430)
    carousel.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: reducedMotion ? 'auto' : 'smooth' })
    trackHomepageEvent('homepage_case_swipe', { direction })
  }

  const onCarouselScroll = () => {
    const carousel = carouselRef.current
    if (!carousel) return
    const index = Math.min(
      transformationCases.length - 1,
      Math.max(0, Math.round(carousel.scrollLeft / Math.max(1, carousel.clientWidth * 0.86))),
    )
    const current = transformationCases[index]
    if (current && !viewedCasesRef.current.has(current.id)) {
      viewedCasesRef.current.add(current.id)
      trackHomepageEvent('homepage_case_view', { case_id: current.id })
    }
  }

  const returnToAssessment = () => {
    trackHomepageEvent('homepage_assessment_return')
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <main className="overflow-x-hidden bg-[#f4f4f3] text-[#131f34]">
      <ScrollEvents />

      <section aria-labelledby="a2o-intro-heading" className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-20">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={rise} transition={{ duration: 0.55 }}>
            <img src="/a2o/brand/a2o-logo-crop.jpg" alt="A2O Style Lab" loading="lazy" className="mb-8 h-12 w-auto object-contain object-left" />
            <p className="mb-4 text-[11px] font-semibold tracking-[0.22em] text-[#131f34]/60">A2O STYLE LAB</p>
            <h2 id="a2o-intro-heading" className="font-serif text-4xl leading-[1.17] text-[#131f34] sm:text-5xl lg:text-6xl">形象，是你最值得投資的長期資產</h2>
            <p className="mt-7 max-w-xl text-[15px] leading-8 text-[#131f34]/75 sm:text-base">
              A2O Style Lab 專注男士形象管理。我們透過專業分析與系統化方法，從身形比例、個人色彩、髮型、穿搭與風格定位出發，協助每位男士建立更自信、更得體、更符合個人身份與生活方式的形象。
            </p>
          </motion.div>
          <motion.figure initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={rise} transition={{ duration: 0.65, delay: 0.08 }} className="overflow-hidden border border-[#131f34]/10 bg-white">
            <img src="/a2o/editorial/client-editorial-strip.png" alt="A2O Style Lab 客戶形象作品" loading="lazy" className="h-auto w-full object-contain" />
          </motion.figure>
        </div>
      </section>

      <section id="all-cases" aria-labelledby="transformations-heading" className="border-y border-[#131f34]/10 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <SectionHeading eyebrow="REAL TRANSFORMATIONS" title="真實改變・看得見的影響力" copy="不同的人，需要不同的形象方向。我們根據每個人的外形條件、個人風格、生活需要，以及希望呈現的感覺，從髮型、服裝比例、色彩到整體形象，設計真正適合他的方向。" />
            <div className="flex gap-3">
              <button type="button" aria-label="查看上一個設計案例" onClick={() => moveCarousel('previous')} className="grid h-11 w-11 place-items-center border border-[#131f34]/20 transition-colors hover:bg-[#131f34] hover:text-white"><ArrowLeft size={18} /></button>
              <button type="button" aria-label="查看下一個設計案例" onClick={() => moveCarousel('next')} className="grid h-11 w-11 place-items-center border border-[#131f34]/20 transition-colors hover:bg-[#131f34] hover:text-white"><ArrowRight size={18} /></button>
            </div>
          </div>

          <div
            ref={carouselRef}
            onScroll={onCarouselScroll}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') moveCarousel('next')
              if (event.key === 'ArrowLeft') moveCarousel('previous')
            }}
            tabIndex={0}
            aria-label="A2O Before and After 設計案例"
            className="mt-11 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pr-5 outline-none focus-visible:ring-2 focus-visible:ring-[#d4849a] sm:gap-6"
          >
            {transformationCases.map((item) => (
              <article key={item.id} className="w-[86vw] shrink-0 snap-start sm:w-[20rem] lg:w-[calc((100%-3rem)/3)]">
                <div className="border border-[#131f34]/10 bg-[#f4f4f3] p-2 sm:p-3">
                  <img src={item.image} alt={item.alt} loading="lazy" className="aspect-[3/4] w-full object-contain" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2" aria-label="案例重點">
                  {item.tags.map((tag) => <span key={tag} className="border border-[#131f34]/15 px-2.5 py-1 text-[10px] tracking-[0.12em] text-[#131f34]/70">{tag}</span>)}
                </div>
              </article>
            ))}
          </div>

          <a href="#transformation-overview" className="mt-8 inline-flex min-h-11 items-center gap-2 border-b border-[#131f34] pb-1 text-sm font-medium text-[#131f34] transition-opacity hover:opacity-60">查看更多案例 <ArrowUpRight size={16} /></a>
          <figure id="transformation-overview" className="mt-14 overflow-hidden border border-[#131f34]/10 bg-[#f4f4f3]">
            <img src="/a2o/editorial/transformation-collage.png" alt="A2O Style Lab 多個客戶的形象轉變" loading="lazy" className="h-auto w-full object-contain" />
          </figure>
        </div>
      </section>

      <section aria-labelledby="method-heading" className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="A2O METHOD" title="A2O 形象方法" copy="不是追逐潮流，而是找出真正適合你的方法。" />
          <div className="mt-12 grid gap-px overflow-hidden border border-[#131f34]/10 bg-[#131f34]/10 sm:grid-cols-2 lg:grid-cols-4">
            {methodItems.map(({ number, name, english, copy, Icon }) => (
              <motion.article key={number} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={rise} transition={{ duration: 0.45 }} className="min-h-64 bg-[#f4f4f3] p-6 sm:p-7">
                <div className="flex items-start justify-between"><span className="text-xs tracking-[0.16em] text-[#131f34]/50">{number}</span><Icon strokeWidth={1.25} size={25} /></div>
                <h3 className="mt-12 font-serif text-3xl">{name}</h3>
                <p className="mt-1 text-xs tracking-[0.12em] text-[#131f34]/60">{english}</p>
                <p className="mt-5 text-sm leading-7 text-[#131f34]/70">{copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="services-heading" className="bg-[#e9e9e6] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading title="服務內容" />
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => (
              <article key={service} className="flex min-h-36 flex-col justify-between border border-[#131f34]/[0.12] bg-[#f4f4f3] p-5 transition-colors hover:bg-white">
                <span className="text-[11px] tracking-[0.14em] text-[#131f34]/45">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-7 text-base font-medium leading-6">{service}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="audience-heading" className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading title="適合這樣的你" />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((audience) => <div key={audience} className="flex min-h-20 items-center gap-3 border border-[#131f34]/10 bg-white px-5 text-sm sm:text-base"><Check size={17} strokeWidth={1.5} aria-hidden="true" />{audience}</div>)}
          </div>
        </div>
      </section>

      <section aria-labelledby="testimonials-heading" className="border-y border-[#131f34]/10 bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading title="客戶回饋" />
          {testimonials.length > 0 ? (
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {testimonials.map((testimonial) => <blockquote key={testimonial.id} className="border border-[#131f34]/10 p-7 text-sm leading-7">「{testimonial.quote}」{testimonial.attribution && <footer className="mt-6 text-[#131f34]/60">— {testimonial.attribution}</footer>}</blockquote>)}
            </div>
          ) : (
            <p className="mt-8 max-w-xl border-l-2 border-[#d4849a] pl-4 text-sm leading-7 text-[#131f34]/70">客戶回饋將於獲得客戶授權後更新。</p>
          )}
        </div>
      </section>

      <section aria-labelledby="about-heading" className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <motion.figure initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={rise} transition={{ duration: 0.6 }} className="order-2 overflow-hidden border border-[#131f34]/10 bg-white lg:order-1">
            <img src="/a2o/editorial/transformation-collage.png" alt="A2O Style Lab 為不同客戶設計的形象方向" loading="lazy" className="h-auto w-full object-contain" />
          </motion.figure>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={rise} transition={{ duration: 0.55 }} className="order-1 lg:order-2">
            <SectionHeading eyebrow="ABOUT A2O STYLE LAB" title="建立的不是一套造型，而是一套真正適合你的形象系統。" copy="A2O Style Lab 專注男士形象管理，透過髮型、比例、色彩、穿搭及整體風格，協助男士建立真正適合自己身份、工作與生活方式的個人形象。" />
          </motion.div>
        </div>
      </section>

      <section aria-labelledby="process-heading" className="bg-[#e9e9e6] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading title="服務流程" />
          <ol className="mt-12 grid gap-px border border-[#131f34]/10 bg-[#131f34]/10 lg:grid-cols-5">
            {processSteps.map(([number, title, copy]) => (
              <li key={number} className="min-h-56 bg-[#e9e9e6] p-6">
                <span className="text-xs tracking-[0.16em] text-[#131f34]/45">{number}</span>
                <h3 className="mt-10 font-serif text-2xl">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#131f34]/70">{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading title="常見問題" />
          <div className="border-t border-[#131f34]/15">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index
              const contentId = `a2o-faq-${index}`
              return (
                <div key={faq.question} className="border-b border-[#131f34]/15">
                  <h3>
                    <button type="button" aria-expanded={isOpen} aria-controls={contentId} onClick={() => setOpenFaq(isOpen ? null : index)} className="flex min-h-16 w-full items-center justify-between gap-6 py-4 text-left text-[15px] font-medium sm:text-base">
                      {faq.question}<ChevronDown size={19} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={contentId} role="region" aria-hidden={!isOpen} className={`grid transition-[grid-template-rows] duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden"><p className="max-w-2xl pb-6 text-sm leading-7 text-[#131f34]/70">{faq.answer}</p></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="final-cta-heading" className="bg-[#131f34] px-5 py-20 text-[#f4f4f3] sm:px-8 sm:py-28 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#f4f4f3]/60">A2O STYLE LAB</p>
          <h2 id="final-cta-heading" className="mt-5 font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">準備好，建立更適合你的形象了嗎？</h2>
          <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-[#f4f4f3]/70 sm:text-base">從了解自己開始，找到真正適合你的方向。</p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => { trackHomepageEvent('homepage_final_cta', { action: 'assessment' }); returnToAssessment() }} className="inline-flex min-h-12 items-center justify-center bg-[#d4849a] px-6 text-sm font-medium text-[#131f34] transition-colors hover:bg-[#edb8c5]">開始形象檢測</button>
            <Link to="/booking" onClick={() => trackHomepageEvent('homepage_final_cta', { action: 'booking' })} className="inline-flex min-h-12 items-center justify-center border border-[#f4f4f3]/45 px-6 text-sm font-medium transition-colors hover:bg-[#f4f4f3] hover:text-[#131f34]">預約一對一諮詢</Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#0e1727] px-5 py-8 text-[#f4f4f3]/70 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="tracking-[0.14em]">A2O STYLE LAB</span>
          <span>© {new Date().getFullYear()} A2O Style Lab. All rights reserved.</span>
        </div>
      </footer>
    </main>
  )
}
