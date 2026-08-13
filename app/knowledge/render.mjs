import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { knowledgeArticles, knowledgeBySlug, knowledgeHub, site } from './content.mjs'

const e = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const canonicalFor = (slug) => `${site.origin}/image-guide/${slug === 'image-guide' ? '' : `${slug}/`}`
const whatsappLink = `<a class="button button-secondary" data-cta="whatsapp" href="${site.whatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp 預約一對一諮詢</a>`
const assessmentLink = `<a class="button button-primary" data-cta="assessment" href="${site.assessment}">開始免費形象檢測</a>`

export function validateKnowledgeContent(appRoot) {
  const slugs = knowledgeArticles.map(({ slug }) => slug)
  if (knowledgeArticles.length !== 5 || new Set(slugs).size !== slugs.length) throw new Error('Knowledge articles require five unique slugs')
  for (const article of knowledgeArticles) {
    if (!/^[a-z0-9-]+$/.test(article.slug)) throw new Error(`Unsafe knowledge slug: ${article.slug}`)
    for (const key of ['title', 'description', 'directAnswer']) if (!article[key]?.trim()) throw new Error(`Missing ${key}: ${article.slug}`)
    if (article.sections.length < 3) throw new Error(`Insufficient sections: ${article.slug}`)
    if (!article.hero?.src || !article.hero?.alt) throw new Error(`Missing hero metadata: ${article.slug}`)
    const images = [article.hero, ...article.sections.map(({ image }) => image).filter(Boolean)]
    for (const image of images) {
      if (!image.alt?.trim()) throw new Error(`Missing image alt: ${article.slug}`)
      if (!existsSync(resolve(appRoot, 'public', image.src.replace(/^\//, '')))) throw new Error(`Missing image asset: ${image.src}`)
    }
    for (const related of article.related) if (!slugs.includes(related)) throw new Error(`Broken related link ${related} from ${article.slug}`)
  }
}

function baseHead(page, type) {
  const canonical = canonicalFor(page.slug)
  const image = page.hero?.src ? `${site.origin}${page.hero.src}` : `${site.origin}/a2o/knowledge/wardrobe-system.webp`
  const graph = [
    { '@type': type, '@id': `${canonical}#page`, url: canonical, name: page.title, headline: page.title, description: page.description, inLanguage: 'zh-Hant-HK', image, publisher: { '@id': `${site.origin}/#business` } },
    { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: page.slug === 'image-guide' ? [
      { '@type': 'ListItem', position: 1, name: 'A2O Style Lab', item: `${site.origin}/` },
      { '@type': 'ListItem', position: 2, name: '形象知識中心', item: canonical },
    ] : [
      { '@type': 'ListItem', position: 1, name: 'A2O Style Lab', item: `${site.origin}/` },
      { '@type': 'ListItem', position: 2, name: '形象知識中心', item: canonicalFor('image-guide') },
      { '@type': 'ListItem', position: 3, name: page.navLabel, item: canonical },
    ] },
  ]
  return `<!doctype html><html lang="zh-Hant-HK"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(page.title)}｜A2O Style Lab</title><meta name="description" content="${e(page.description)}"><meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="zh-Hant-HK" href="${canonical}"><meta property="og:type" content="article"><meta property="og:locale" content="zh_HK"><meta property="og:site_name" content="A2O Style Lab"><meta property="og:title" content="${e(page.title)}"><meta property="og:description" content="${e(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${image}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(page.title)}"><meta name="twitter:description" content="${e(page.description)}"><meta name="twitter:image" content="${image}"><meta name="theme-color" content="#080808"><link rel="stylesheet" href="/image-guide/knowledge-centre.css"><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script></head><body>`
}

const header = `<header class="site-header"><a class="brand" href="/" aria-label="A2O Style Lab 首頁"><span class="brand-mark">A<sup>2</sup>O</span><span>STYLE LAB</span></a><nav aria-label="主要導覽"><a href="/image-guide/">形象知識中心</a><a href="/#/?start=assessment">免費檢測</a></nav></header>`
const footer = `<footer><div><b>A2O Style Lab</b><p>${site.address}</p><p>每日 12:00–20:00｜只接受預約</p></div><div><a href="${site.whatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp +852 5407 7240</a><a href="https://www.instagram.com/a2o.stylelab/" target="_blank" rel="noopener noreferrer">Instagram @a2o.stylelab</a></div></footer>`
const close = `${footer}</body></html>`

const table = (value) => value ? `<div class="table-wrap"><table><thead><tr>${value.headers.map((h) => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${value.rows.map((row) => `<tr>${row.map((cell) => `<td>${e(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''
const figure = (image) => image ? `<figure><img src="${image.src}" alt="${e(image.alt)}" loading="lazy" decoding="async">${image.caption ? `<figcaption>${e(image.caption)}</figcaption>` : ''}</figure>` : ''

export function renderArticle(article) {
  const sections = article.sections.map((section, index) => `<section class="article-section" id="section-${index + 1}"><div class="section-number">0${index + 1}</div><div class="section-copy"><h2>${e(section.heading)}</h2>${section.paragraphs.map((p) => `<p>${e(p)}</p>`).join('')}${table(section.table)}${section.note ? `<p class="note">${e(section.note)}</p>` : ''}</div>${figure(section.image)}</section>`).join('')
  const faqs = article.faqs.map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join('')
  const related = article.related.map((slug) => { const item = knowledgeBySlug[slug]; return `<a class="related-card" href="/image-guide/${item.slug}/"><span>${e(item.category)}</span><b>${e(item.title)}</b><i>閱讀指南 →</i></a>` }).join('')
  return `${baseHead(article, 'Article')}${header}<main><nav class="breadcrumb" aria-label="麵包屑"><a href="/">首頁</a><span>/</span><a href="/image-guide/">形象知識中心</a><span>/</span><span>${e(article.navLabel)}</span></nav><article><header class="article-hero"><div class="hero-copy"><p class="eyebrow">${e(article.category)} · A2O IMAGE GUIDE</p><h1>${e(article.title)}</h1><p class="dek">${e(article.description)}</p></div><figure class="hero-visual"><img src="${article.hero.src}" alt="${e(article.hero.alt)}" fetchpriority="high" decoding="async"></figure><aside class="direct-answer"><span>直接答案</span><p>${e(article.directAnswer)}</p></aside><nav class="contents" aria-label="文章目錄"><b>文章內容</b>${article.sections.map((s, i) => `<a href="#section-${i + 1}">0${i + 1} ${e(s.heading)}</a>`).join('')}</nav></header><div class="article-body">${sections}</div><section class="faq"><p class="eyebrow">FAQ</p><h2>常見問題</h2>${faqs}</section><section class="related"><p class="eyebrow">CONTINUE READING</p><h2>相關男士形象指南</h2><div class="related-grid">${related}</div></section><section class="conversion"><p class="eyebrow">A2O STYLE LAB</p><h2>先了解自己的形象問題，再決定改善方向。</h2><p>完成約兩分鐘的免費形象檢測，A2O 會根據你的答案整理初步方向。</p><div class="actions">${assessmentLink}${whatsappLink}</div></section></article></main>${close}`
}

export function renderHub() {
  const cards = knowledgeArticles.map((article, index) => `<article class="hub-card"><span>0${index + 1} · ${e(article.category)}</span><h2>${e(article.title)}</h2><p>${e(article.description)}</p><img src="${article.hero.src}" alt="${e(article.hero.alt)}" loading="${index ? 'lazy' : 'eager'}" decoding="async"><a href="/image-guide/${article.slug}/">閱讀完整指南 →</a></article>`).join('')
  return `${baseHead(knowledgeHub, 'CollectionPage')}${header}<main><section class="hub-hero"><p class="eyebrow">A2O STYLE LAB · MEN'S IMAGE KNOWLEDGE</p><h1>${knowledgeHub.title}</h1><p>${knowledgeHub.description}</p><aside class="direct-answer"><span>由哪裡開始？</span><p>${knowledgeHub.directAnswer}</p></aside><div class="actions">${assessmentLink}${whatsappLink}</div></section><section class="hub-grid" aria-label="男士形象指南">${cards}</section><section class="conversion"><p class="eyebrow">FREE IMAGE ASSESSMENT</p><h2>不知道自己應先改善哪一部分？</h2><p>由四條問題開始，先找出最影響你的場合與形象項目。</p><div class="actions">${assessmentLink}${whatsappLink}</div></section></main>${close}`
}

export function renderMarkdown(article) {
  const canonical = canonicalFor(article.slug)
  return `---\ntitle: "${article.title}"\ndescription: "${article.description}"\ncanonical: "${canonical}"\nlanguage: "zh-Hant-HK"\n---\n\n# ${article.title}\n\n${article.description}\n\n## 直接答案\n\n${article.directAnswer}\n\n${article.sections.map((section) => `## ${section.heading}\n\n${section.paragraphs.join('\n\n')}${section.table ? `\n\n${section.table.headers.join(' | ')}\n${section.table.headers.map(() => '---').join(' | ')}\n${section.table.rows.map((row) => row.join(' | ')).join('\n')}` : ''}${section.note ? `\n\n> ${section.note}` : ''}`).join('\n\n')}\n\n## 下一步\n\n- [開始免費形象檢測](${site.origin}/#/?start=assessment)\n- [WhatsApp 預約一對一諮詢](${site.whatsapp})\n`
}
