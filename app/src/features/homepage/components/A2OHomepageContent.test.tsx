import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { A2OHomepageContent } from './A2OHomepageContent'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      const Element = tag as keyof React.JSX.IntrinsicElements
      const { initial: _initial, animate: _animate, whileInView: _whileInView, viewport: _viewport, variants: _variants, transition: _transition, ...htmlProps } = props as Record<string, unknown>
      return <Element {...htmlProps}>{children}</Element>
    },
  }),
  useReducedMotion: () => true,
}))

function renderHomepage() {
  return render(
    <MemoryRouter>
      <A2OHomepageContent />
    </MemoryRouter>,
  )
}

function renderHomepageWithAssessment() {
  return render(
    <MemoryRouter>
      <A2OHomepageContent assessment={<section data-testid="assessment-slot">Assessment</section>} />
    </MemoryRouter>,
  )
}

describe('A2O monochrome homepage content', () => {
  it('keeps the assessment before transformations', () => {
    renderHomepageWithAssessment()

    const assessment = screen.getByTestId('assessment-slot')
    const transformations = screen.getByRole('heading', { name: '真實改變・看得見的影響力' }).closest('section')

    expect(assessment.nextElementSibling).toBe(transformations)
  })

  it('places the motion marquee between the hero and assessment', () => {
    renderHomepageWithAssessment()

    const hero = screen.getByRole('heading', { name: '形象，是你最值得投資的長期資產' }).closest('section')
    const marquee = screen.getByRole('region', { name: 'A2O 形象方法重點' })
    const assessment = screen.getByTestId('assessment-slot')

    expect(hero?.nextElementSibling).toBe(marquee)
    expect(marquee.nextElementSibling).toBe(assessment)
  })

  it('renders the approved hero and section anchor actions', () => {
    renderHomepage()

    expect(screen.getByRole('heading', { name: '形象，是你最值得投資的長期資產' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '開始形象檢測' })[0]).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '了解 A2O 形象方法' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '開始形象檢測' })).not.toBeInTheDocument()
  })

  it('opens the one-to-one consultation CTA in WhatsApp with the short booking message', () => {
    renderHomepage()

    const bookingLink = screen.getByRole('link', { name: '預約一對一諮詢' })
    expect(bookingLink).toHaveAttribute(
      'href',
      `https://wa.me/85254077240?text=${encodeURIComponent('你好，我想預約一對一形象諮詢。')}`,
    )
    expect(bookingLink).toHaveAttribute('target', '_blank')
    expect(bookingLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows outcome themes without fabricated customer attribution', () => {
    renderHomepage()

    expect(screen.getByRole('heading', { name: '客戶常見轉變' })).toBeInTheDocument()
    for (const heading of ['方向更清晰', '專業感提升', '減少錯誤購物', '日常更容易執行']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.queryByText('客戶回饋將於獲得客戶授權後更新。')).not.toBeInTheDocument()
    expect(screen.queryByText(/— .*先生/)).not.toBeInTheDocument()
  })

  it('removes the repeated service process and keeps the remaining content system', () => {
    renderHomepage()

    expect(screen.queryByRole('heading', { name: '服務流程' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'A2O 形象方法' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '服務內容' })).toBeInTheDocument()
    expect(screen.getByText('從初步分析到實際執行，按你的需要建立完整而可持續的形象方向。')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '常見問題' })).toBeInTheDocument()
  })

  it('links the homepage to the public image knowledge centre without moving the assessment', () => {
    renderHomepageWithAssessment()

    expect(screen.getByRole('heading', { name: '形象知識中心' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '瀏覽全部指南' })).toHaveAttribute('href', '/image-guide/')
    expect(screen.getByRole('link', { name: /工作場合 Smart Casual/ })).toHaveAttribute('href', '/image-guide/work-smart-casual/')
    expect(screen.getByRole('link', { name: /約會穿搭與第一印象/ })).toHaveAttribute('href', '/image-guide/dating-style/')
    expect(screen.getByRole('link', { name: /身形比例與服裝版型/ })).toHaveAttribute('href', '/image-guide/fit-proportion/')

    const marquee = screen.getByRole('region', { name: 'A2O 形象方法重點' })
    expect(marquee.nextElementSibling).toBe(screen.getByTestId('assessment-slot'))
  })

  it('scrolls static article visitors to the assessment when the start query is present', () => {
    const scrollIntoView = vi.fn()
    window.location.hash = '#/?start=assessment'
    Element.prototype.scrollIntoView = scrollIntoView

    render(
      <MemoryRouter>
        <A2OHomepageContent assessment={<section id="assessment">Assessment</section>} />
      </MemoryRouter>,
    )

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    window.location.hash = ''
  })

  it('keeps client and transformation photography in its original colour', () => {
    renderHomepage()

    const clientPhotography = [
      screen.getByAltText('A2O Style Lab 客戶形象作品'),
      ...screen.getAllByAltText(/A2O Style Lab 男士形象 Before and After 設計案例/),
      screen.getByAltText('A2O Style Lab 多個客戶的形象轉變'),
      screen.getByAltText('A2O Style Lab 為不同客戶設計的形象方向'),
    ]

    for (const image of clientPhotography) {
      expect(image).not.toHaveClass('grayscale')
    }
  })

  it('marks transformation cards and service rows for one-time staged motion', () => {
    const { container } = renderHomepage()

    expect(container.querySelector('[data-motion-section="transformations"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-motion-card="transformation"]')).toHaveLength(6)
    expect(container.querySelector('[data-motion-section="services"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-motion-row="service"]')).toHaveLength(8)
  })

  it('shows the verified public business details in the footer', () => {
    renderHomepage()

    expect(screen.getByText('香港九龍荔枝角長沙灣道883號億利工業中心204A室')).toBeInTheDocument()
    expect(screen.getByText('每日 12:00–20:00｜只接受預約')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+852 5407 7240' })).toHaveAttribute('href', 'https://wa.me/85254077240')
    expect(screen.getByRole('link', { name: 'Instagram @a2o.stylelab' })).toHaveAttribute('href', 'https://www.instagram.com/a2o.stylelab/')
  })
})
