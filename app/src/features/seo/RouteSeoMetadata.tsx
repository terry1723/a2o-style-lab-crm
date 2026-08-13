import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const canonicalUrl = 'https://a2o-style-lab.vercel.app/'
const publicRobots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
const privateRobots = 'noindex, nofollow, noarchive'

function ensureRobotsMeta() {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]')

  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'robots'
    document.head.append(meta)
  }

  return meta
}

function ensureCanonicalLink() {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.append(link)
  }

  return link
}

export default function RouteSeoMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    const isHomepage = pathname === '/'
    ensureRobotsMeta().content = isHomepage ? publicRobots : privateRobots

    if (isHomepage) {
      ensureCanonicalLink().href = canonicalUrl
    } else {
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.remove()
    }
  }, [pathname])

  return null
}
