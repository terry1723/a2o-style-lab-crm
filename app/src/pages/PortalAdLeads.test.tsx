import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()
const fetchMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

import PortalAdLeads from './PortalAdLeads'

describe('PortalAdLeads', () => {
  beforeEach(() => {
    localStorage.setItem('a2o_staff_auth_v2', 'true')
    navigate.mockReset()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('loads leads and renders the specified tracking columns', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        leads: [{
          source: 'Meta Lead Ad', id: 'lead-42', submittedAt: '2026-07-20T09:30:00+08:00',
          name: '陳大文', phone: '91234567', tag: '夏季形象', sourceKey: 'Meta Lead Ad:lead-42',
          status: '未聯絡', owner: 'Ryan',
        }],
        unavailableSources: [],
      }),
    })

    render(<PortalAdLeads />)

    expect(await screen.findByText('陳大文')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      '姓名', '電話號碼', '填表日期', '來源 Form', 'Tag', '客人狀況', '跟進同事',
    ])
    expect(fetchMock).toHaveBeenCalledWith('/api/ad-leads', expect.objectContaining({ method: 'GET' }))
  })

  it('saves a changed status through the tracking PATCH endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          leads: [{
            source: 'Meta', id: 'lead-42', submittedAt: '2026-07-20T09:30:00+08:00',
            name: '陳大文', phone: '91234567', tag: '', sourceKey: 'Meta:lead-42',
            status: '未聯絡', owner: 'Ryan',
          }],
          unavailableSources: [],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(<PortalAdLeads />)
    await screen.findByText('陳大文')
    fireEvent.change(screen.getByLabelText('陳大文 的客人狀況'), { target: { value: '已預約' } })

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/ad-lead-tracking', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceKey: 'Meta:lead-42', status: '已預約', owner: 'Ryan' }),
    }))
  })

  it('shows a save failure when tracking cannot be updated', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          leads: [{
            source: 'Meta', id: 'lead-42', submittedAt: '2026-07-20T09:30:00+08:00',
            name: '陳大文', phone: '91234567', tag: '', sourceKey: 'Meta:lead-42',
            status: '未聯絡', owner: 'Ryan',
          }],
          unavailableSources: [],
        }),
      })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'tracking_unavailable' }) })

    render(<PortalAdLeads />)
    await screen.findByText('陳大文')
    fireEvent.change(screen.getByLabelText('陳大文 的跟進同事'), { target: { value: 'Terry' } })

    expect(await screen.findByText('儲存跟進資料失敗，請稍後再試。')).toBeInTheDocument()
  })

  it('lets staff retry loading after a lead inbox request fails', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'lead_inbox_unavailable' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ leads: [], unavailableSources: [] }),
      })

    render(<PortalAdLeads />)

    expect(await screen.findByText('載入廣告新客失敗，請稍後再試。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新載入' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('shows 20 newest leads per page and lets staff move to the next page', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        leads: Array.from({ length: 21 }, (_, index) => ({
          source: 'Meta', id: `lead-${index + 1}`, submittedAt: `2026-07-${String(21 - index).padStart(2, '0')}T09:00:00+08:00`,
          name: `客人 ${index + 1}`, phone: `900000${String(index + 1).padStart(2, '0')}`, tag: 'Meta',
          sourceKey: `Meta:lead-${index + 1}`, status: '未聯絡', owner: 'Ryan',
        })),
        unavailableSources: [],
      }),
    })

    render(<PortalAdLeads />)

    expect(await screen.findByText('客人 20')).toBeInTheDocument()
    expect(screen.queryByText('客人 21')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '下一頁' }))
    expect(await screen.findByText('客人 21')).toBeInTheDocument()
  })
})
