import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, MessageCircle, X } from 'lucide-react'
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
  galleryImages: string[]
  primaryCategory: PrimaryCategory
  subCategory: string
  styleCategory: StyleCategory
  colorSeasons: string[]
  tag: ProductTag
  stylingReason: string
  memberPrice: string
  categoryLabel: string
  availableColors: string[]
  availableSizes: string[]
  material?: string
  fitNotes?: string
  productDetails?: string
}

type ProductRow = {
  id: string
  title: string
  image_url?: string | null
  gallery_images?: string[] | null
  primary_category?: PrimaryCategory | null
  sub_category?: string | null
  style_category?: StyleCategory | null
  color_seasons?: string[] | null
  tag?: ProductTag | null
  styling_reason?: string | null
  member_price?: string | null
  category_label?: string | null
  available_colors?: string[] | null
  available_sizes?: string[] | null
  material?: string | null
  fit_notes?: string | null
  product_details?: string | null
}

const WHATSAPP_NUMBER = '85254077240'

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
    galleryImages: [],
    availableColors: ['White', 'Light Blue', 'Soft Grey'],
    availableSizes: ['S', 'M', 'L'],
    material: 'Cotton blend',
    fitNotes: 'Relaxed but clean shape. Good for daily smart casual looks.',
    productDetails: 'A versatile inner-layer shirt selected for clients who want a neat Korean smart casual upgrade without looking too formal.',
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
    galleryImages: [],
    availableColors: ['Charcoal', 'Navy', 'Black'],
    availableSizes: ['S', 'M', 'L', 'XL'],
    material: 'Structured woven fabric',
    fitNotes: 'Slightly structured shoulder. Best for clients who need a sharper upper-body line.',
    productDetails: 'A minimal blazer for work, dinner and first-date outfits. Designed to add maturity while keeping the overall styling approachable.',
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
    galleryImages: [],
    availableColors: ['Olive', 'Dark Brown', 'Black'],
    availableSizes: ['M', 'L', 'XL'],
    material: 'Cotton twill',
    fitNotes: 'Boxier fit. Works well for men who want a stronger, more masculine silhouette.',
    productDetails: 'A utility-inspired outer layer for clients who suit a more rugged direction. Works with darker seasonal palettes and textured basics.',
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
    galleryImages: [],
    availableColors: ['Taupe', 'Olive Grey', 'Charcoal'],
    availableSizes: ['29', '30', '31', '32', '33', '34'],
    material: 'Soft stretch fabric',
    fitNotes: 'Relaxed straight fit. Easy to match with shirts, knits and casual jackets.',
    productDetails: 'A safe upgrade from basic jeans. Suitable for weekend, casual workday and simple date outfits.',
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
    galleryImages: [],
    availableColors: ['Stone', 'Light Khaki', 'Navy'],
    availableSizes: ['S', 'M', 'L'],
    material: 'Lightweight cotton',
    fitNotes: 'Above-knee clean fit. Casual but not sloppy.',
    productDetails: 'A simple warm-weather option for clients who want to look cleaner during casual days.',
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
    galleryImages: [],
    availableColors: ['Dark Brown', 'Black'],
    availableSizes: ['Free size'],
    material: 'Leather',
    fitNotes: 'Best for smart casual trousers, denim and weekend outfits.',
    productDetails: 'A small accessory upgrade that helps simple outfits feel more finished and intentional.',
  },
]

function mapProduct(row: ProductRow): MemberProduct {
  const mainImage = row.image_url || undefined
  const galleryImages = row.gallery_images?.filter(Boolean) || []
  const fullGallery = mainImage ? [mainImage, ...galleryImages.filter(img => img !== mainImage)] : galleryImages

  return {
    id: row.id,
    title: row.title,
    imageUrl: mainImage,
    galleryImages: fullGallery,
    primaryCategory: row.primary_category || '其他',
    subCategory: row.sub_category || '其他',
    styleCategory: row.style_category || '斯文',
    colorSeasons: row.color_seasons || [],
    tag: row.tag || 'Stylist Pick',
    stylingReason: row.styling_reason || '',
    memberPrice: row.member_price || 'Ask Stylist',
    categoryLabel: row.category_label || row.sub_category || 'Member Pick',
    availableColors: row.available_colors || [],
    availableSizes: row.available_sizes || [],
    material: row.material || undefined,
    fitNotes: row.fit_notes || undefined,
    productDetails: row.product_details || undefined,
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
  const [selectedProduct, setSelectedProduct] = useState<MemberProduct | null>(null)
  const [activeImage, setActiveImage] = useState(0)

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

  useEffect(() => {
    setActiveImage(0)
  }, [selectedProduct?.id])

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

  const activeFilterCount = [primaryFilter, subFilter, styleFilter, seasonFilter].filter(item => item !== 'all').length

  const onPrimaryChange = (next: 'all' | PrimaryCategory) => {
    setPrimaryFilter(next)
    setSubFilter('all')
  }

  const resetFilters = () => {
    setPrimaryFilter('all')
    setSubFilter('all')
    setStyleFilter('all')
    setSeasonFilter('all')
  }

  const applyClientSeason = () => {
    if (client.seasonal_type) setSeasonFilter(client.seasonal_type)
  }

  const buildWhatsAppLink = (product: MemberProduct) => {
    const message = `Hi A2O, I’m interested in this member pick:\nProduct: ${product.title}\nCategory: ${product.primaryCategory} / ${product.subCategory}\nStyle: ${product.styleCategory}\nColor Season: ${product.colorSeasons.join('、')}\nAvailable Colors: ${product.availableColors.join('、') || 'Ask Stylist'}\nAvailable Sizes: ${product.availableSizes.join('、') || 'Ask Stylist'}\nMember Price: ${product.memberPrice}\nClient: ${client.name}\nPhone: ${clientPhone}\n\nPlease help me check availability or arrange styling advice.`
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  }

  const FilterButton = ({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'whitespace-nowrap border px-3 py-2 text-xs tracking-wide transition-colors',
        active
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-900 hover:text-zinc-900'
      )}
    >
      {children}
    </button>
  )

  const detailImages = selectedProduct ? (selectedProduct.galleryImages.length > 0 ? selectedProduct.galleryImages : selectedProduct.imageUrl ? [selectedProduct.imageUrl] : []) : []

  if (selectedProduct) {
    return (
      <section className="mt-5 overflow-hidden bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="border-b border-zinc-100 bg-zinc-950 px-5 py-3 text-center text-[10px] font-medium uppercase tracking-[0.28em] text-white sm:px-6">
          A2O Member Closet · Product Detail
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="mb-5 flex items-center justify-between border-b border-zinc-100 pb-4">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-zinc-950"
            >
              <ArrowLeft className="size-4" /> Back to picks
            </button>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="inline-flex size-9 items-center justify-center border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-950 hover:text-zinc-950"
              aria-label="Close product detail"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="grid gap-3 md:grid-cols-[88px_1fr]">
                <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
                  {detailImages.length > 0 ? detailImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={cn(
                        'h-20 w-16 shrink-0 overflow-hidden border bg-zinc-100 md:h-24 md:w-full',
                        activeImage === index ? 'border-zinc-950' : 'border-zinc-100 hover:border-zinc-400'
                      )}
                    >
                      <img src={image} alt={`${selectedProduct.title} ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  )) : (
                    <div className="hidden md:block" />
                  )}
                </div>

                <div className="order-1 aspect-[3/4] overflow-hidden bg-zinc-100 md:order-2">
                  {detailImages.length > 0 ? (
                    <img
                      src={detailImages[activeImage] || detailImages[0]}
                      alt={selectedProduct.title}
                      className="h-full w-full object-cover object-center grayscale-[10%]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 px-6 text-center">
                      <span className="font-serif text-5xl text-zinc-300">A2O</span>
                      <span className="mt-4 text-[11px] uppercase tracking-[0.22em] text-zinc-400">Image Pending</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-6">
                <div className="mb-5 flex items-start justify-between gap-5">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{selectedProduct.categoryLabel}</p>
                    <h3 className="font-serif text-4xl font-medium leading-tight tracking-tight text-zinc-950">{selectedProduct.title}</h3>
                    <p className="mt-2 text-sm font-light text-zinc-500">{selectedProduct.primaryCategory} / {selectedProduct.subCategory} · {selectedProduct.styleCategory}</p>
                  </div>
                  <p className="shrink-0 text-lg font-light text-zinc-950">{selectedProduct.memberPrice}</p>
                </div>

                <p className="mb-6 text-sm font-light leading-relaxed text-zinc-600">
                  {selectedProduct.productDetails || selectedProduct.stylingReason || 'A2O stylist-selected item. Message us on WhatsApp for availability, sizing and styling advice.'}
                </p>

                <div className="space-y-6 border-y border-zinc-100 py-6">
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">Available Colors</h4>
                    {selectedProduct.availableColors.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.availableColors.map(color => (
                          <span key={color} className="border border-zinc-200 px-3 py-2 text-xs text-zinc-600">{color}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-light text-zinc-400">Ask stylist for current colours.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">Available Sizes</h4>
                    {selectedProduct.availableSizes.length > 0 ? (
                      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                        {selectedProduct.availableSizes.map(size => (
                          <span key={size} className="flex h-10 items-center justify-center border border-zinc-200 text-xs text-zinc-700">{size}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-light text-zinc-400">Ask stylist for current sizes.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">Suitable Palettes</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colorSeasons.length > 0 ? selectedProduct.colorSeasons.map(season => (
                        <span key={season} className="bg-zinc-50 px-3 py-2 text-xs text-zinc-600">{season}</span>
                      )) : <p className="text-sm font-light text-zinc-400">Ask stylist for colour matching.</p>}
                    </div>
                  </div>

                  {(selectedProduct.material || selectedProduct.fitNotes) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {selectedProduct.material && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">Material</h4>
                          <p className="text-sm font-light leading-relaxed text-zinc-500">{selectedProduct.material}</p>
                        </div>
                      )}
                      {selectedProduct.fitNotes && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">Fit Notes</h4>
                          <p className="text-sm font-light leading-relaxed text-zinc-500">{selectedProduct.fitNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <a
                  href={buildWhatsAppLink(selectedProduct)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-zinc-950 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-zinc-800"
                >
                  <MessageCircle className="size-4" />
                  Ask Stylist on WhatsApp
                </a>

                <p className="mt-3 text-center text-xs font-light text-zinc-400">No checkout. A2O stylist will confirm stock, sizing and styling advice.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100">
      <div className="border-b border-zinc-100 bg-zinc-950 px-5 py-3 text-center text-[10px] font-medium uppercase tracking-[0.28em] text-white sm:px-6">
        A2O Member Closet · Early Access
      </div>

      <div className="px-5 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Curated styling pieces</p>
            <h3 className="font-serif text-3xl font-medium tracking-tight text-zinc-950">Member Picks for You</h3>
            <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-zinc-500">
              Private menswear selections sourced by A2O stylists. Browse by item type, style direction and your 12-season colour profile.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
            <span className="text-xs font-light text-zinc-500">{filteredProducts.length} / {products.length} items</span>
            {loadingProducts && <p className="mt-1 text-[11px] text-zinc-400">Updating latest picks...</p>}
          </div>
        </div>

        {client.seasonal_type && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-none border border-zinc-100 bg-zinc-50 px-4 py-3">
            <span className="text-xs font-light text-zinc-500">Your colour profile:</span>
            <button
              type="button"
              onClick={applyClientSeason}
              className={cn(
                'border px-3 py-1.5 text-xs font-medium transition-colors',
                seasonFilter === client.seasonal_type
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-900'
              )}
            >
              {client.seasonal_type}
            </button>
            <span className="text-[11px] text-zinc-400">Tap to filter items suitable for your palette.</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[168px_1fr]">
          <aside className="lg:border-r lg:border-zinc-100 lg:pr-6">
            <div className="mb-6 flex items-center justify-between lg:block">
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-950">Filters</h4>
                <p className="mt-1 text-xs font-light text-zinc-400">{activeFilterCount} active</p>
              </div>
              <button type="button" onClick={resetFilters} className="text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 lg:mt-3">
                Reset
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Category</h5>
                <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                  {(['all', '上身', '下身', '其他'] as const).map(item => (
                    <FilterButton key={item} active={primaryFilter === item} onClick={() => onPrimaryChange(item)}>
                      {item === 'all' ? 'View All' : item}
                    </FilterButton>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Item Type</h5>
                <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                  <FilterButton active={subFilter === 'all'} onClick={() => setSubFilter('all')}>All</FilterButton>
                  {availableSubcategories.map((sub) => (
                    <FilterButton key={sub} active={subFilter === sub} onClick={() => setSubFilter(sub)}>{sub}</FilterButton>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Style</h5>
                <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                  {(['all', '斯文', '硬朗'] as const).map(item => (
                    <FilterButton key={item} active={styleFilter === item} onClick={() => setStyleFilter(item)}>
                      {item === 'all' ? 'All Styles' : item}
                    </FilterButton>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Palette</h5>
                <select
                  aria-label="Color season"
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                  className="w-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 outline-none transition-colors focus:border-zinc-900"
                >
                  <option value="all">All color seasons</option>
                  {COLOR_SEASONS.map((season) => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          <div>
            <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-xs font-light text-zinc-500">{filteredProducts.length} Products</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Click item for details</span>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <article key={product.id} className="group cursor-pointer" onClick={() => setSelectedProduct(product)}>
                    <div className="relative mb-3 aspect-[3/4] overflow-hidden bg-zinc-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          loading="lazy"
                          className="h-full w-full object-cover object-center grayscale-[15%] transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 px-4 text-center">
                          <span className="font-serif text-2xl text-zinc-300">A2O</span>
                          <span className="mt-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400">Image Pending</span>
                        </div>
                      )}
                      <span className={cn(
                        'absolute left-3 top-3 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]',
                        product.tag === 'Limited' ? 'bg-zinc-950 text-white' : 'bg-white/90 text-zinc-950 backdrop-blur'
                      )}>
                        {product.tag}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-medium leading-snug text-zinc-950">{product.title}</h4>
                          <p className="mt-1 text-[11px] font-light text-zinc-500">{product.primaryCategory} / {product.subCategory}</p>
                        </div>
                        <p className="shrink-0 text-xs font-light text-zinc-950">{product.memberPrice}</p>
                      </div>

                      <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">{product.categoryLabel} · {product.styleCategory}</p>
                      <p className="line-clamp-2 text-xs font-light leading-relaxed text-zinc-500">{product.stylingReason}</p>

                      <div className="flex flex-wrap gap-1.5">
                        {product.colorSeasons.slice(0, 3).map((season) => (
                          <span key={`${product.id}-${season}`} className="border border-zinc-100 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-500">{season}</span>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="mt-3 inline-flex w-full items-center justify-center bg-zinc-950 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-zinc-800"
                      >
                        View Details
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
                <p className="text-sm font-light text-zinc-500">No items match this filter yet.</p>
                <button type="button" onClick={resetFilters} className="mt-4 border-b border-zinc-900 pb-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
