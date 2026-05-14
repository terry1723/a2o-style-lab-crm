import { useEffect, useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { cn } from '../lib/utils'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ClientData } from '../lib/clientData'

type PrimaryCategory = '上身' | '下身' | '其他'
type StyleCategory = '斯文' | '硬朗'
type ProductTag = 'Stylist Pick' | 'New Arrival' | 'Member Price' | 'Limited'

type MemberProduct = {
  id: string
  title: string
  imageUrl?: string
  primaryCategory: PrimaryCategory
  subCategory: string
  styleCategory: StyleCategory
  colorSeasons: string[]
  tag: ProductTag
  stylingReason: string
  memberPrice: string
  categoryLabel: string
}

type ProductRow = {
  id: string
  title: string
  image_url?: string | null
  primary_category?: PrimaryCategory | null
  sub_category?: string | null
  style_category?: StyleCategory | null
  color_seasons?: string[] | null
  tag?: ProductTag | null
  styling_reason?: string | null
  member_price?: string | null
  category_label?: string | null
}

const WHATSAPP_NUMBER = '85254077240' // TODO: replace if WhatsApp contact changes

const COLOR_SEASONS = [
  '淺春型', '暖春型', '亮春型',
  '淺夏型', '冷夏型', '柔夏型',
  '柔秋型', '暖秋型', '深秋型',
  '冷冬型', '亮冬型', '深冬型',
] as const

const SUBCATEGORY_MAP: Record<PrimaryCategory, string[]> = {
  上身: ['外搭', '內搭'],
  下身: ['長褲', '短褲'],
  其他: ['配件', '鞋履', '造型服務', '其他'],
}

const FALLBACK_PRODUCTS: MemberProduct[] = [
  {
    id: 'fallback-1',
    title: 'Korean Smart Casual Shirt',
    primaryCategory: '上身',
    subCategory: '內搭',
    styleCategory: '斯文',
    colorSeasons: ['冷夏型', '柔夏型', '淺夏型'],
    tag: 'Stylist Pick',
    stylingReason: 'Easy upgrade for daily dates and weekend looks.',
    memberPrice: 'HK$390',
    categoryLabel: 'Smart Casual',
  },
  {
    id: 'fallback-2',
    title: 'French Minimal Blazer',
    primaryCategory: '上身',
    subCategory: '外搭',
    styleCategory: '斯文',
    colorSeasons: ['冷冬型', '深冬型', '冷夏型'],
    tag: 'New Arrival',
    stylingReason: 'Clean structure for a more mature and polished image.',
    memberPrice: 'HK$890',
    categoryLabel: 'Polished Layer',
  },
  {
    id: 'fallback-3',
    title: 'Rugged Layering Jacket',
    primaryCategory: '上身',
    subCategory: '外搭',
    styleCategory: '硬朗',
    colorSeasons: ['深秋型', '暖秋型', '深冬型'],
    tag: 'Limited',
    stylingReason: 'Adds stronger shoulder line and masculine structure.',
    memberPrice: 'HK$690',
    categoryLabel: 'Rugged Utility',
  },
  {
    id: 'fallback-4',
    title: 'Relaxed Weekend Trousers',
    primaryCategory: '下身',
    subCategory: '長褲',
    styleCategory: '斯文',
    colorSeasons: ['柔秋型', '暖秋型', '柔夏型'],
    tag: 'Member Price',
    stylingReason: 'Comfortable shape that still looks styled.',
    memberPrice: 'HK$490',
    categoryLabel: 'Weekend Fit',
  },
  {
    id: 'fallback-5',
    title: 'Clean Summer Shorts',
    primaryCategory: '下身',
    subCategory: '短褲',
    styleCategory: '斯文',
    colorSeasons: ['淺春型', '淺夏型', '暖春型'],
    tag: 'New Arrival',
    stylingReason: 'Easy casual option for warmer weather.',
    memberPrice: 'HK$290',
    categoryLabel: 'Summer Essential',
  },
  {
    id: 'fallback-6',
    title: 'Leather Detail Belt',
    primaryCategory: '其他',
    subCategory: '配件',
    styleCategory: '硬朗',
    colorSeasons: ['深秋型', '暖秋型', '深冬型'],
    tag: 'Stylist Pick',
    stylingReason: 'Simple accessory to make basic outfits look more intentional.',
    memberPrice: 'HK$260',
    categoryLabel: 'Accessory Boost',
  },
]

function mapProduct(row: ProductRow): MemberProduct {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url || undefined,
    primaryCategory: row.primary_category || '其他',
    subCategory: row.sub_category || '其他',
    styleCategory: row.style_category || '斯文',
    colorSeasons: row.color_seasons || [],
    tag: row.tag || 'Stylist Pick',
    stylingReason: row.styling_reason || '',
    memberPrice: row.member_price || 'Ask Stylist',
    categoryLabel: row.category_label || row.sub_category || 'Member Pick',
  }
}

type Props = {
  client: ClientData
  clientPhone: string
}

export default function MemberPicks({ client, clientPhone }: Props) {
  const [products, setProducts] = useState<MemberProduct[]>(FALLBACK_PRODUCTS)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [primaryFilter, setPrimaryFilter] = useState<'all' | PrimaryCategory>('all')
  const [subFilter, setSubFilter] = useState<'all' | string>('all')
  const [styleFilter, setStyleFilter] = useState<'all' | StyleCategory>('all')
  const [seasonFilter, setSeasonFilter] = useState<'all' | string>('all')

  useEffect(() => {
    let mounted = true

    const loadProducts = async () => {
      if (!isSupabaseConfigured()) return
      setLoadingProducts(true)

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .order('sort_order', { ascending: true })

        if (error) {
          console.error('products load error:', error)
          return
        }

        if (mounted && data && data.length > 0) {
          setProducts((data as ProductRow[]).map(mapProduct))
        }
      } catch (err) {
        console.error('products load exception:', err)
      } finally {
        if (mounted) setLoadingProducts(false)
      }
    }

    loadProducts()
    return () => { mounted = false }
  }, [])

  const availableSubcategories = useMemo(() => {
    if (primaryFilter === 'all') {
      return Array.from(new Set(products.map(p => p.subCategory)))
    }
    return SUBCATEGORY_MAP[primaryFilter]
  }, [primaryFilter, products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchPrimary = primaryFilter === 'all' || product.primaryCategory === primaryFilter
      const matchSub = subFilter === 'all' || product.subCategory === subFilter
      const matchStyle = styleFilter === 'all' || product.styleCategory === styleFilter
      const matchSeason = seasonFilter === 'all' || product.colorSeasons.includes(seasonFilter)
      return matchPrimary && matchSub && matchStyle && matchSeason
    })
  }, [products, primaryFilter, subFilter, styleFilter, seasonFilter])

  const onPrimaryChange = (next: 'all' | PrimaryCategory) => {
    setPrimaryFilter(next)
    setSubFilter('all')
  }

  const buildWhatsAppLink = (product: MemberProduct) => {
    const message = `Hi A2O, I’m interested in this member pick:\nProduct: ${product.title}\nCategory: ${product.primaryCategory} / ${product.subCategory}\nStyle: ${product.styleCategory}\nColor Season: ${product.colorSeasons.join('、')}\nMember Price: ${product.memberPrice}\nClient: ${client.name}\nPhone: ${clientPhone}\n\nPlease help me check availability or arrange styling advice.`
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  }

  return (
    <section className="bg-[#f7f1e8] rounded-2xl p-4 sm:p-6 mt-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-a2o-black text-balance">Member Picks for You</h3>
        <p className="text-sm text-a2o-black/65 mt-1 text-pretty">Curated by A2O stylists based on your style profile.</p>
      </div>

      {client.seasonal_type && (
        <div className="mb-4">
          <span className="inline-flex items-center rounded-full bg-a2o-pink/10 text-a2o-pink px-3 py-1 text-xs font-medium">
            Recommended for {client.seasonal_type}
          </span>
        </div>
      )}

      {loadingProducts && (
        <p className="mb-4 text-xs text-a2o-black/45">Loading latest member picks...</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 mb-5">
        <select aria-label="Primary category" value={primaryFilter} onChange={(e) => onPrimaryChange(e.target.value as 'all' | PrimaryCategory)} className="w-full rounded-xl border border-a2o-warm bg-white px-3 py-2 text-sm text-a2o-black">
          <option value="all">All / 全部分類</option>
          <option value="上身">上身</option>
          <option value="下身">下身</option>
          <option value="其他">其他</option>
        </select>

        <select aria-label="Sub category" value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="w-full rounded-xl border border-a2o-warm bg-white px-3 py-2 text-sm text-a2o-black">
          <option value="all">All subcategories</option>
          {availableSubcategories.map((sub) => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>

        <select aria-label="Style category" value={styleFilter} onChange={(e) => setStyleFilter(e.target.value as 'all' | StyleCategory)} className="w-full rounded-xl border border-a2o-warm bg-white px-3 py-2 text-sm text-a2o-black">
          <option value="all">All styles</option>
          <option value="斯文">斯文</option>
          <option value="硬朗">硬朗</option>
        </select>

        <select aria-label="Color season" value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)} className="w-full rounded-xl border border-a2o-warm bg-white px-3 py-2 text-sm text-a2o-black">
          <option value="all">All color seasons</option>
          {COLOR_SEASONS.map((season) => (
            <option key={season} value={season}>{season}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredProducts.map((product) => (
          <article key={product.id} className="rounded-2xl bg-white p-4 shadow-sm border border-[#f0e6d7]">
            <div className="h-36 rounded-xl bg-[#f6efe3] border border-[#eadfce] mb-3 flex items-center justify-center text-xs text-a2o-black/45 overflow-hidden">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="h-full w-full rounded-xl object-cover" /> : 'Image placeholder'}
            </div>
            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold mb-2', product.tag === 'Limited' ? 'bg-rose-100 text-rose-700' : 'bg-a2o-pink/10 text-a2o-pink')}>
              {product.tag}
            </span>
            <h4 className="font-semibold text-a2o-black text-pretty">{product.title}</h4>
            <p className="text-xs text-a2o-black/60 mt-1">{product.primaryCategory} / {product.subCategory} · {product.styleCategory}</p>
            <p className="text-xs text-a2o-black/55 mt-1">{product.categoryLabel}</p>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {product.colorSeasons.map((season) => (
                <span key={`${product.id}-${season}`} className="rounded-full bg-[#f5efe4] px-2 py-0.5 text-[11px] text-a2o-black/70">{season}</span>
              ))}
            </div>

            <p className="text-sm text-a2o-black/70 mt-3 text-pretty">{product.stylingReason}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="font-bold text-a2o-black tabular-nums">{product.memberPrice}</p>
              <a href={buildWhatsAppLink(product)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-a2o-pink px-3 py-2 text-xs font-medium text-white hover:opacity-90">
                <MessageCircle className="size-3.5" />
                Ask on WhatsApp
              </a>
            </div>
          </article>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <p className="text-sm text-a2o-black/50 mt-4 text-center">No items match this filter yet. Try another style or season.</p>
      )}
    </section>
  )
}
