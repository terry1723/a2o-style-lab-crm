import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, MessageCircle, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ClientData } from '../lib/clientData'

type PrimaryCategory = '上身' | '下身' | '其他'
type StyleCategory = '斯文' | '硬朗'
type ProductTag = '造型師精選' | '新品上架' | '會員專屬價' | '限量選品' | 'Stylist Pick' | 'New Arrival' | 'Member Price' | 'Limited'

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

const TAG_LABELS: Record<string, string> = {
  'Stylist Pick': '造型師精選',
  'New Arrival': '新品上架',
  'Member Price': '會員專屬價',
  Limited: '限量選品',
}

function displayTag(tag: ProductTag) {
  return TAG_LABELS[tag] || tag
}

function normalizeImageUrl(url?: string | null) {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined

  if (trimmed.includes('drive.google.com')) {
    const fileMatch = trimmed.match(/\/file\/d\/([^/]+)/)
    const idMatch = trimmed.match(/[?&]id=([^&]+)/)
    const id = fileMatch?.[1] || idMatch?.[1]
    if (id) return `https://drive.google.com/uc?export=view&id=${id}`
  }

  return trimmed
}

const FALLBACK_PRODUCTS: MemberProduct[] = [
  {
    id: 'fallback-1',
    title: '韓系簡約休閒襯衫',
    primaryCategory: '上身',
    subCategory: '內搭',
    styleCategory: '斯文',
    colorSeasons: ['冷夏型', '柔夏型', '淺夏型'],
    tag: '造型師精選',
    stylingReason: '輕鬆提升日常約會與週末造型的精緻度。',
    memberPrice: 'HK$390',
    categoryLabel: '精緻休閒',
    imageUrl: undefined,
    galleryImages: [],
    availableColors: ['白色', '淺藍', '柔灰'],
    availableSizes: ['S', 'M', 'L'],
    material: '混棉面料',
    fitNotes: '版型舒適但保持乾淨線條，適合日常精緻休閒造型。',
    productDetails: '一款實穿度高的內搭襯衫，適合希望提升韓系精緻休閒感、但不想過份正式的客人。',
  },
  {
    id: 'fallback-2',
    title: '法式極簡西裝外套',
    primaryCategory: '上身',
    subCategory: '外搭',
    styleCategory: '斯文',
    colorSeasons: ['冷冬型', '深冬型', '冷夏型'],
    tag: '新品上架',
    stylingReason: '俐落結構感，令整體形象更成熟、乾淨、有修飾度。',
    memberPrice: 'HK$890',
    categoryLabel: '成熟外搭',
    imageUrl: undefined,
    galleryImages: [],
    availableColors: ['炭灰', '深藍', '黑色'],
    availableSizes: ['S', 'M', 'L', 'XL'],
    material: '挺身梭織面料',
    fitNotes: '肩線略帶結構感，適合需要修飾上身輪廓的客人。',
    productDetails: '適合工作、晚餐與初次約會的極簡西裝外套，在增加成熟感的同時保留親和力。',
  },
]

function mapProduct(row: ProductRow): MemberProduct {
  const galleryImages = (row.gallery_images || [])
    .map(normalizeImageUrl)
    .filter(Boolean) as string[]
  const mainImage = normalizeImageUrl(row.image_url) || galleryImages[0]
  const fullGallery = mainImage
    ? [mainImage, ...galleryImages.filter(img => img !== mainImage)]
    : galleryImages

  return {
    id: row.id,
    title: row.title,
    imageUrl: mainImage,
    galleryImages: fullGallery,
    primaryCategory: row.primary_category || '其他',
    subCategory: row.sub_category || '其他',
    styleCategory: row.style_category || '斯文',
    colorSeasons: row.color_seasons || [],
    tag: row.tag || '造型師精選',
    stylingReason: row.styling_reason || '',
    memberPrice: row.member_price || '向造型師查詢',
    categoryLabel: row.category_label || row.sub_category || '會員選品',
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
    if (primaryFilter === 'all') return Array.from(new Set(products.map(p => p.subCategory)))
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
    const message = `你好 A2O，我想查詢這件會員選品：\n單品：${product.title}\n分類：${product.primaryCategory} / ${product.subCategory}\n風格：${product.styleCategory}\n適合色彩季節：${product.colorSeasons.join('、')}\n可選顏色：${product.availableColors.join('、') || '向造型師查詢'}\n可選尺碼：${product.availableSizes.join('、') || '向造型師查詢'}\n會員價：${product.memberPrice}\n客人：${client.name}\n電話：${clientPhone}\n\n麻煩你幫我確認庫存、尺碼，並提供配搭建議。`
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

  const detailImages = selectedProduct
    ? selectedProduct.galleryImages.length > 0
      ? selectedProduct.galleryImages
      : selectedProduct.imageUrl
        ? [selectedProduct.imageUrl]
        : []
    : []

  if (selectedProduct) {
    return (
      <section className="mt-5 overflow-hidden bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="border-b border-zinc-100 bg-zinc-950 px-5 py-3 text-center text-[10px] font-medium uppercase tracking-[0.28em] text-white sm:px-6">
          A2O 會員衣櫥 · 單品詳情
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="mb-5 flex items-center justify-between border-b border-zinc-100 pb-4">
            <button type="button" onClick={() => setSelectedProduct(null)} className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-zinc-950">
              <ArrowLeft className="size-4" /> 返回會員選品
            </button>
            <button type="button" onClick={() => setSelectedProduct(null)} className="inline-flex size-9 items-center justify-center border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-950 hover:text-zinc-950" aria-label="關閉單品詳情">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="grid gap-3 md:grid-cols-[88px_1fr]">
                <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
                  {detailImages.map((image, index) => (
                    <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} className={cn('h-20 w-16 shrink-0 overflow-hidden border bg-zinc-100 md:h-24 md:w-full', activeImage === index ? 'border-zinc-950' : 'border-zinc-100 hover:border-zinc-400')}>
                      <img src={image} alt={`${selectedProduct.title} ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="order-1 aspect-[3/4] overflow-hidden bg-zinc-100 md:order-2">
                  {detailImages.length > 0 ? (
                    <img src={detailImages[activeImage] || detailImages[0]} alt={selectedProduct.title} className="h-full w-full object-cover object-center grayscale-[10%]" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 px-6 text-center">
                      <span className="font-serif text-5xl text-zinc-300">A2O</span>
                      <span className="mt-4 text-[11px] uppercase tracking-[0.22em] text-zinc-400">圖片待上傳</span>
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
                  {selectedProduct.productDetails || selectedProduct.stylingReason || 'A2O 造型師精選單品。歡迎透過 WhatsApp 查詢庫存、尺碼與配搭建議。'}
                </p>

                <div className="space-y-6 border-y border-zinc-100 py-6">
                  <DetailBlock title="可選顏色" empty="請向造型師查詢現有顏色。" values={selectedProduct.availableColors} />
                  <DetailBlock title="可選尺碼" empty="請向造型師查詢現有尺碼。" values={selectedProduct.availableSizes} grid />
                  <DetailBlock title="適合色彩季節" empty="請向造型師查詢色彩配搭。" values={selectedProduct.colorSeasons} />

                  {(selectedProduct.material || selectedProduct.fitNotes) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {selectedProduct.material && <TextDetail title="材質" value={selectedProduct.material} />}
                      {selectedProduct.fitNotes && <TextDetail title="版型建議" value={selectedProduct.fitNotes} />}
                    </div>
                  )}
                </div>

                <a href={buildWhatsAppLink(selectedProduct)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-zinc-950 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-zinc-800">
                  <MessageCircle className="size-4" /> WhatsApp 查詢造型師
                </a>

                <p className="mt-3 text-center text-xs font-light text-zinc-400">此頁不設付款功能。A2O 造型師會為你確認庫存、尺碼與配搭建議。</p>
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
        A2O 會員衣櫥 · 優先選購
      </div>

      <div className="px-5 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">造型師嚴選單品</p>
            <h3 className="font-serif text-3xl font-medium tracking-tight text-zinc-950">會員專屬選品</h3>
            <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-zinc-500">由 A2O 造型師為會員搜羅的男士單品。你可以按單品類型、風格方向與 12 季色彩分析挑選合適款式。</p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
            <span className="text-xs font-light text-zinc-500">{filteredProducts.length} / {products.length} 件單品</span>
            {loadingProducts && <p className="mt-1 text-[11px] text-zinc-400">正在更新最新選品...</p>}
          </div>
        </div>

        {client.seasonal_type && (
          <div className="mb-6 flex flex-wrap items-center gap-2 border border-zinc-100 bg-zinc-50 px-4 py-3">
            <span className="text-xs font-light text-zinc-500">你的色彩類型：</span>
            <button type="button" onClick={applyClientSeason} className={cn('border px-3 py-1.5 text-xs font-medium transition-colors', seasonFilter === client.seasonal_type ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-900')}>
              {client.seasonal_type}
            </button>
            <span className="text-[11px] text-zinc-400">點擊可篩選適合你色彩類型的單品。</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[168px_1fr]">
          <aside className="lg:border-r lg:border-zinc-100 lg:pr-6">
            <div className="mb-6 flex items-center justify-between lg:block">
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-950">篩選</h4>
                <p className="mt-1 text-xs font-light text-zinc-400">{activeFilterCount} 項已選</p>
              </div>
              <button type="button" onClick={resetFilters} className="text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 lg:mt-3">重設</button>
            </div>

            <div className="space-y-6">
              <FilterGroup title="分類">
                {(['all', '上身', '下身', '其他'] as const).map(item => (
                  <FilterButton key={item} active={primaryFilter === item} onClick={() => onPrimaryChange(item)}>{item === 'all' ? '全部' : item}</FilterButton>
                ))}
              </FilterGroup>
              <FilterGroup title="單品類型">
                <FilterButton active={subFilter === 'all'} onClick={() => setSubFilter('all')}>全部</FilterButton>
                {availableSubcategories.map((sub) => <FilterButton key={sub} active={subFilter === sub} onClick={() => setSubFilter(sub)}>{sub}</FilterButton>)}
              </FilterGroup>
              <FilterGroup title="風格">
                {(['all', '斯文', '硬朗'] as const).map(item => <FilterButton key={item} active={styleFilter === item} onClick={() => setStyleFilter(item)}>{item === 'all' ? '全部風格' : item}</FilterButton>)}
              </FilterGroup>
              <div>
                <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">色彩季節</h5>
                <select aria-label="色彩季節" value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 outline-none transition-colors focus:border-zinc-900">
                  <option value="all">全部色彩季節</option>
                  {COLOR_SEASONS.map((season) => <option key={season} value={season}>{season}</option>)}
                </select>
              </div>
            </div>
          </aside>

          <div>
            <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-xs font-light text-zinc-500">{filteredProducts.length} 件單品</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">點擊單品查看詳情</span>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <article key={product.id} className="group cursor-pointer" onClick={() => setSelectedProduct(product)}>
                    <div className="relative mb-3 aspect-[3/4] overflow-hidden bg-zinc-100">
                      {product.imageUrl ? <img src={product.imageUrl} alt={product.title} loading="lazy" className="h-full w-full object-cover object-center grayscale-[15%] transition-transform duration-700 group-hover:scale-105" /> : <ImagePlaceholder small />}
                      <span className={cn('absolute left-3 top-3 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]', displayTag(product.tag) === '限量選品' ? 'bg-zinc-950 text-white' : 'bg-white/90 text-zinc-950 backdrop-blur')}>{displayTag(product.tag)}</span>
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
                      <div className="flex flex-wrap gap-1.5">{product.colorSeasons.slice(0, 3).map((season) => <span key={`${product.id}-${season}`} className="border border-zinc-100 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-500">{season}</span>)}</div>
                      <button type="button" className="mt-3 inline-flex w-full items-center justify-center bg-zinc-950 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-zinc-800">查看詳情</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
                <p className="text-sm font-light text-zinc-500">暫時沒有符合篩選條件的單品。</p>
                <button type="button" onClick={resetFilters} className="mt-4 border-b border-zinc-900 pb-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">重設篩選</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{title}</h5>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">{children}</div>
    </div>
  )
}

function DetailBlock({ title, values, empty, grid = false }: { title: string; values: string[]; empty: string; grid?: boolean }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">{title}</h4>
      {values.length > 0 ? (
        <div className={grid ? 'grid grid-cols-5 gap-2 sm:grid-cols-6' : 'flex flex-wrap gap-2'}>
          {values.map(value => <span key={value} className={grid ? 'flex h-10 items-center justify-center border border-zinc-200 text-xs text-zinc-700' : 'border border-zinc-200 px-3 py-2 text-xs text-zinc-600'}>{value}</span>)}
        </div>
      ) : <p className="text-sm font-light text-zinc-400">{empty}</p>}
    </div>
  )
}

function TextDetail({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">{title}</h4>
      <p className="text-sm font-light leading-relaxed text-zinc-500">{value}</p>
    </div>
  )
}

function ImagePlaceholder({ small = false }: { small?: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 px-4 text-center">
      <span className={small ? 'font-serif text-2xl text-zinc-300' : 'font-serif text-5xl text-zinc-300'}>A2O</span>
      <span className="mt-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400">圖片待上傳</span>
    </div>
  )
}
