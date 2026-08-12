import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { A2OHomepageContent } from './A2OHomepageContent'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      const Element = tag as keyof React.JSX.IntrinsicElements
      const { initial: _initial, whileInView: _whileInView, viewport: _viewport, variants: _variants, transition: _transition, ...htmlProps } = props as Record<string, unknown>
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
  it('places the assessment immediately after the hero and before transformations', () => {
    renderHomepageWithAssessment()

    const hero = screen.getByRole('heading', { name: '形象，是你最值得投資的長期資產' }).closest('section')
    const assessment = screen.getByTestId('assessment-slot')
    const transformations = screen.getByRole('heading', { name: '真實改變・看得見的影響力' }).closest('section')

    expect(hero?.nextElementSibling).toBe(assessment)
    expect(assessment.nextElementSibling).toBe(transformations)
  })

  it('renders the approved hero and section anchor actions', () => {
    renderHomepage()

    expect(screen.getByRole('heading', { name: '形象，是你最值得投資的長期資產' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '開始形象檢測' })[0]).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '了解 A2O 形象方法' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '開始形象檢測' })).not.toBeInTheDocument()
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
})
