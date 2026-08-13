import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appRoot = resolve(import.meta.dirname, '../../..')
const readAppFile = (path: string) => readFileSync(resolve(appRoot, path), 'utf8')

describe('A2O GEO static assets', () => {
  it('allows search crawlers and advertises the production sitemap', () => {
    const robots = readAppFile('public/robots.txt')

    expect(robots).toContain('User-agent: OAI-SearchBot')
    expect(robots).toMatch(/User-agent: OAI-SearchBot[\s\S]*Allow: \//)
    expect(robots).toContain('User-agent: Googlebot')
    expect(robots).toContain('User-agent: Bingbot')
    expect(robots).toContain('Sitemap: https://a2o-style-lab.vercel.app/sitemap.xml')
  })

  it('lists only the canonical public homepage in the sitemap', () => {
    const sitemap = readAppFile('public/sitemap.xml')

    expect(sitemap).toContain('<loc>https://a2o-style-lab.vercel.app/</loc>')
    expect(sitemap.match(/<url>/g)).toHaveLength(1)
    expect(sitemap).not.toContain('#/portal')
    expect(sitemap).not.toContain('#/crm')
  })

  it('publishes canonical social metadata and a truthful structured entity graph', () => {
    const html = readAppFile('index.html')
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)

    expect(html).toContain('<link rel="canonical" href="https://a2o-style-lab.vercel.app/"')
    expect(html).toContain('property="og:locale" content="zh_HK"')
    expect(html).toContain('property="og:url" content="https://a2o-style-lab.vercel.app/"')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(jsonLdMatch).not.toBeNull()

    const graph = JSON.parse(jsonLdMatch![1])['@graph'] as Array<Record<string, unknown>>
    const business = graph.find((entry) => entry['@type'] === 'ProfessionalService')
    const services = graph.filter((entry) => entry['@type'] === 'Service')

    expect(business).toMatchObject({
      name: 'A2O Style Lab',
      telephone: '+85254077240',
      sameAs: ['https://www.instagram.com/a2o.stylelab/'],
    })
    expect(business?.address).toMatchObject({
      streetAddress: '長沙灣道883號億利工業中心204A室',
      addressLocality: '荔枝角',
      addressRegion: '九龍',
      addressCountry: 'HK',
    })
    expect(business?.openingHoursSpecification).toEqual(expect.arrayContaining([
      expect.objectContaining({ opens: '12:00', closes: '20:00' }),
    ]))
    expect(business?.additionalProperty).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '預約安排', value: '只接受預約' }),
    ]))
    expect(services.length).toBeGreaterThanOrEqual(8)
  })

  it('includes useful business information before React executes', () => {
    const html = readAppFile('index.html')

    expect(html).toContain('香港男士形象顧問')
    expect(html).toContain('身形比例、個人色彩、髮型、穿搭與風格定位')
    expect(html).toContain('香港九龍荔枝角長沙灣道883號億利工業中心204A室')
    expect(html).toContain('每日 12:00–20:00｜只接受預約')
    expect(html).toContain('https://wa.me/85254077240')
  })
})
