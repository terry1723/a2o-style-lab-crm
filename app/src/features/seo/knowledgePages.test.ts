import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { knowledgeArticles, knowledgeHub, site } from '../../../knowledge/content.mjs'

const appRoot = resolve(import.meta.dirname, '../../..')
const readAppFile = (path: string) => readFileSync(resolve(appRoot, path), 'utf8')

describe('A2O image knowledge content', () => {
  it('defines one hub and five substantive, uniquely linked articles', () => {
    expect(knowledgeHub.slug).toBe('image-guide')
    expect(knowledgeArticles).toHaveLength(5)

    const slugs = knowledgeArticles.map((article) => article.slug)
    expect(new Set(slugs).size).toBe(5)

    for (const article of knowledgeArticles) {
      expect(article.title.length).toBeGreaterThan(10)
      expect(article.description.length).toBeGreaterThan(40)
      expect(article.directAnswer.length).toBeGreaterThan(40)
      expect(article.sections.length).toBeGreaterThanOrEqual(3)
      expect(article.hero.src).toMatch(/^\/a2o\/knowledge\/.+\.webp$/)
      expect(article.hero.alt.length).toBeGreaterThan(8)
      expect(article.related.length).toBeGreaterThanOrEqual(2)
      expect(article.related.every((slug) => slugs.includes(slug))).toBe(true)
    }
  })

  it('publishes complete initial HTML for the hub and every article', () => {
    expect(existsSync(resolve(appRoot, 'knowledge/knowledge-centre.css'))).toBe(true)
    expect(existsSync(resolve(appRoot, 'public/image-guide/knowledge-centre.css'))).toBe(true)

    const pages = [knowledgeHub, ...knowledgeArticles]

    for (const page of pages) {
      const outputPath = page.slug === 'image-guide'
        ? 'public/image-guide/index.html'
        : `public/image-guide/${page.slug}/index.html`
      expect(existsSync(resolve(appRoot, outputPath)), outputPath).toBe(true)

      const html = readAppFile(outputPath)
      const canonical = `https://a2o-style-lab.vercel.app/image-guide/${page.slug === 'image-guide' ? '' : `${page.slug}/`}`
      expect(html).toContain(`<link rel="canonical" href="${canonical}">`)
      expect(html).toContain(`<h1>${page.title}</h1>`)
      expect(html).toContain('開始免費形象檢測')
      expect(html).toContain('WhatsApp 預約一對一諮詢')
      expect(html).toContain('BreadcrumbList')
      expect(html).toMatch(/"@type":"(CollectionPage|Article)"/)
      expect(html).not.toMatch(/href=["'][^"']+\.pdf/i)
    }
  })

  it('serves every clean URL before retaining the SPA fallback', () => {
    const vercel = JSON.parse(readAppFile('vercel.json')) as { rewrites: Array<{ source: string; destination: string }> }
    const expectedSources = [
      '/image-guide',
      '/image-guide/',
      ...knowledgeArticles.flatMap(({ slug }) => [`/image-guide/${slug}`, `/image-guide/${slug}/`]),
    ]

    expect(vercel.rewrites.slice(0, expectedSources.length).map(({ source }) => source)).toEqual(expectedSources)
    expect(vercel.rewrites[vercel.rewrites.length - 1]).toEqual({ source: '/(.*)', destination: '/index.html' })
  })

  it('keeps internal QA assets private and gives AI mirrors a working assessment route', () => {
    expect(existsSync(resolve(appRoot, 'public/a2o/knowledge/knowledge-contact-sheet.jpg'))).toBe(false)
    for (const article of knowledgeArticles) {
      const markdown = readAppFile(`public/image-guide/markdown/${article.slug}.md`)
      expect(markdown).toContain(`${site.origin}/#/?start=assessment`)
      expect(markdown).not.toContain('/#assessment')
    }
  })
})
