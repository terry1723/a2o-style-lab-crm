import { AssessmentEngine } from './AssessmentEngine'

const panelBase = 'relative hidden min-h-[860px] overflow-hidden lg:flex lg:flex-col lg:justify-end'

export function AssessmentSection() {
  return (
    <section id="assessment" aria-label="A2O 互動形象檢測" className="scroll-mt-0 overflow-hidden bg-[#050505] text-[#f7f6f2]">
      <div className="mx-auto grid max-w-[1920px] lg:grid-cols-[minmax(0,1fr)_minmax(390px,520px)_minmax(0,1fr)]">
        <aside className={panelBase}>
          <img src="/a2o/cases/case-01.jpg" alt="" className="absolute inset-0 h-full w-full object-cover brightness-[.24] blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/70" />
          <div className="relative z-10 p-10 xl:p-14">
            <p className="text-[10px] font-black tracking-[0.28em] text-white/55">A2O STYLE LAB</p>
            <h2 className="mt-4 max-w-sm font-serif text-3xl font-black leading-tight xl:text-4xl">真實形象改造案例</h2>
            <p className="mt-5 max-w-md text-sm font-semibold leading-7 text-white/65">從髮型、比例、色彩到穿搭，讓每一項改變都服務於你的個人形象。</p>
          </div>
        </aside>
        <div className="relative z-10 mx-auto w-full max-w-[520px] border-x border-white/10 bg-black shadow-[0_0_80px_rgba(255,255,255,0.06)]">
          <AssessmentEngine />
        </div>
        <aside className={panelBase}>
          <img src="/a2o/cases/case-03.jpg" alt="" className="absolute inset-0 h-full w-full object-cover brightness-[.24] blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/70" />
          <div className="relative z-10 p-10 xl:p-14">
            <p className="text-[10px] font-black tracking-[0.28em] text-white/55">A2O STYLE LAB</p>
            <h2 className="mt-4 max-w-sm font-serif text-3xl font-black leading-tight xl:text-4xl">看得見的形象轉變</h2>
            <p className="mt-5 max-w-md text-sm font-semibold leading-7 text-white/65">不是變成另一個人，而是令你的外在訊號更符合身份、目標與生活方式。</p>
          </div>
        </aside>
      </div>
    </section>
  )
}
