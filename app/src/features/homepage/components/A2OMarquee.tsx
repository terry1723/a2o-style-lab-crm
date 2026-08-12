import { useReducedMotion } from 'framer-motion'

const marqueePhrase = 'PROPORTION · COLOUR · GROOMING · STYLE · A2O STYLE LAB'

export function A2OMarquee() {
  const reducedMotion = useReducedMotion()

  return (
    <section aria-label="A2O 形象方法重點" className="overflow-hidden border-y border-black bg-[#f7f6f2] py-4 text-black sm:py-5">
      {reducedMotion ? (
        <p className="px-5 text-center text-sm font-black tracking-[.15em] sm:text-lg">{marqueePhrase}</p>
      ) : (
        <div data-testid="a2o-marquee-track" className="a2o-marquee-track flex w-max whitespace-nowrap">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} aria-hidden={index > 0} className="shrink-0 pr-8 text-xl font-black tracking-[.12em] sm:text-3xl lg:text-4xl">
              {marqueePhrase} ·
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
