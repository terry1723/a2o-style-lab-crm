import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../lib/clientData', () => ({
  getAllClients: vi.fn().mockResolvedValue([]),
  getClientServices: vi.fn().mockResolvedValue([]),
  saveClient: vi.fn(),
  saveClientServices: vi.fn(),
  saveServiceSession: vi.fn(),
  deleteServiceSession: vi.fn(),
  getServiceSessions: vi.fn().mockResolvedValue([]),
}))

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {},
}))

vi.mock('../components/ColorEditor', () => ({ default: () => <div /> }))
vi.mock('../components/ColorReport', () => ({ default: () => <div /> }))
vi.mock('../components/UpcomingAppointments', () => ({ default: () => <div /> }))

import PortalStaff from './PortalStaff'

describe('Portal staff dashboard privacy', () => {
  beforeEach(() => {
    localStorage.setItem('a2o_staff_auth', 'true')
    navigate.mockReset()
  })

  it('does not display aggregate client, sales, or payment metrics', async () => {
    render(<PortalStaff />)

    expect(await screen.findByPlaceholderText('搜索姓名或電話...')).toBeInTheDocument()
    expect(screen.queryByText('總客戶')).not.toBeInTheDocument()
    expect(screen.queryByText('進行中', { selector: 'p' })).not.toBeInTheDocument()
    expect(screen.queryByText('已完成', { selector: 'p' })).not.toBeInTheDocument()
    expect(screen.queryByText('總銷售額')).not.toBeInTheDocument()
    expect(screen.queryByText('已收款')).not.toBeInTheDocument()
  })
})
