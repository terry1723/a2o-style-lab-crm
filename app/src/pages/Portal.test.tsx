import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Portal from './Portal'

describe('Portal staff login', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('uses the server login endpoint so a rotated database PIN can sign in', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      authenticated: true,
      staff: { name: 'Admin', role: 'admin' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/portal']}>
        <Routes>
          <Route path="/portal" element={<Portal />} />
          <Route path="/portal/staff" element={<div>Portal staff destination</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByPlaceholderText('輸入員工密碼'), 'rotated-pin')
    await user.click(screen.getByRole('button', { name: '登入' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/staff-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: 'rotated-pin' }),
    }))
    expect(await screen.findByText('Portal staff destination')).toBeInTheDocument()
    expect(localStorage.getItem('a2o_staff_auth')).toBe('true')
  })
})
