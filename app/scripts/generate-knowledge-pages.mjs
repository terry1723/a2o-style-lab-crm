import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { knowledgeArticles } from '../knowledge/content.mjs'
import { renderArticle, renderHub, renderMarkdown, validateKnowledgeContent } from '../knowledge/render.mjs'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicRoot = resolve(appRoot, 'public')
const guideRoot = resolve(publicRoot, 'image-guide')
const markdownRoot = resolve(guideRoot, 'markdown')
const stylesheetSource = resolve(appRoot, 'knowledge', 'knowledge-centre.css')

validateKnowledgeContent(appRoot)
await rm(guideRoot, { recursive: true, force: true })
await mkdir(markdownRoot, { recursive: true })
await copyFile(stylesheetSource, resolve(guideRoot, 'knowledge-centre.css'))

await writeFile(resolve(guideRoot, 'index.html'), renderHub())
for (const article of knowledgeArticles) {
  const output = resolve(guideRoot, article.slug)
  await mkdir(output, { recursive: true })
  await writeFile(resolve(output, 'index.html'), renderArticle(article))
  await writeFile(resolve(markdownRoot, `${article.slug}.md`), renderMarkdown(article))
}

console.log(`Generated ${knowledgeArticles.length + 1} A2O knowledge pages`)
