export interface KnowledgeImage {
  src: string
  alt: string
  caption?: string
}

export interface KnowledgeSection {
  heading: string
  paragraphs: string[]
  image?: KnowledgeImage
  table?: { headers: string[]; rows: string[][] }
  note?: string
}

export interface KnowledgeArticle {
  slug: string
  title: string
  navLabel: string
  category: string
  description: string
  directAnswer: string
  hero: KnowledgeImage
  sections: KnowledgeSection[]
  faqs: Array<[string, string]>
  related: string[]
}

export const knowledgeHub: KnowledgeArticle
export const knowledgeArticles: KnowledgeArticle[]
export const knowledgeBySlug: Record<string, KnowledgeArticle>
export const site: Record<string, string>
