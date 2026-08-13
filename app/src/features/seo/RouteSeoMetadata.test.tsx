import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import RouteSeoMetadata from './RouteSeoMetadata'

const canonicalUrl = 'https://a2o-style-lab.vercel.app/'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteSeoMetadata />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  document.head.innerHTML = `
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">
  `
})

describe('RouteSeoMetadata', () => {
  it('keeps the public homepage indexable with its canonical URL', async () => {
    renderAt('/')

    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
        'content',
        'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      )
      expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', canonicalUrl)
    })
  })

  it.each([
    '/experience',
    '/products',
    '/booking',
    '/crm/login',
    '/portal',
    '/portal/ad-leads',
    '/debug/supabase',
  ])('keeps %s out of search results', async (path) => {
    renderAt(path)

    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow, noarchive',
      )
      expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument()
    })
  })
})
