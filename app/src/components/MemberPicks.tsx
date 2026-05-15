import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, MessageCircle, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ClientData } from '../lib/clientData'

type Primary分類 = '上身' | '下身' | '其他'
type 風格分類 = '斯文' | '硬朗'
type ProductTag = '造型師精選' | '新品上架' | '會員專屬價' | '限量選品'

type MemberProduct = {
  id: string
  title: string
  imageUrl?: string
  galleryImages: string[]
  primary分類: Primary分類
  sub分類: string
  style分類: 風格分類
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
  primary_category?: Primary分類 | null
  sub_category?: string | null
  style_category?: 風格分類 | null
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

const SUBCATEGORY_MAP: Record<Primary分類, string[]> = {
  上身: ['外搭', '內搭'],
  下身: ['長褲', '短褲'],
  其他: ['配件', '鞋履', '造型服務', '其他'],
}

const FALLBACK_PRODUCTS: MemberProduct[] = [
  {
    id: 'fallback-1',
    title: '韓系簡約休閒襯衫',
    primary分類: '上身',
    sub分類: '內搭',
    style分類: '斯文',
    colorSeasons: ['冷夏型', '柔夏型', '淺夏型'],
    tag: '造型師精選',
    stylingReason: '輕鬆提升日常約會與週末造型的精緻度。',
    memberPrice: 'HK$390',
    categoryLabel: '精緻休閒',
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
    primary分類: '上身',
    sub分類: '外搭',
    style分類: '斯文',
    colorSeasons: ['冷冬型', '深冬型', '冷夏型'],
    tag: '新品上架',
    stylingReason: '俐落結構感，令整體形象更成熟、乾淨、有修飾度。',
    memberPrice: 'HK$890',
    categoryLabel: '成熟外搭',
    galleryImages: [],
    availableColors: ['炭灰', '深藍', '黑色'],
    availableSizes: ['S', 'M', 'L', 'XL'],
    material: '挺身梭織面料',
    fitNotes: '肩線略帶結構感，適合需要修飾上身輪廓的客人。',
    productDetails: '適合工作、晚餐與初次約會的極簡西裝外套，在增加成熟感的同時保留親和力。',
  },
  {
    id: 'fallback-3',
    title: '硬朗感層次外套',
    primary分類: '上身',
    sub分類: '外搭',
    style分類: '硬朗',
    colorSeasons: ['深秋型', '暖秋型', '深冬型'],
    tag: '限量選品',
    stylingReason: '加強肩線與輪廓，營造更硬朗的男性線條。',
    memberPrice: 'HK$690',
    categoryLabel: '硬朗機能',
    galleryImages: [],
    availableColors: ['橄欖綠', '深啡', '黑色'],
    availableSizes: ['M', 'L', 'XL'],
    material: '斜紋棉布',
    fitNotes: '偏方正的版型，適合想加強男性輪廓與氣場的客人。',
    productDetails: '帶機能感的外搭單品，適合較硬朗的形象方向，可配合深色季節色盤與有質感的基本單品。',
  },
  {
    id: 'fallback-4',
    title: '週末鬆弛感長褲',
    primary分類: '下身',
    sub分類: '長褲',
    style分類: '斯文',
    colorSeasons: ['柔秋型', '暖秋型', '柔夏型'],
    tag: '會員專屬價',
    stylingReason: '舒適但不鬆散，保留造型感與日常實穿度。',
    memberPrice: 'HK$490',
    categoryLabel: '週末造型',
    galleryImages: [],
    availableColors: ['灰駝', '橄欖灰', '炭灰'],
    availableSizes: ['29', '30', '31', '32', '33', '34'],
    material: '柔軟彈性面料',
    fitNotes: '鬆弛直筒版型，容易配搭襯衫、針織與休閒外套。',
    productDetails: '比基本牛仔褲更有修飾度的安全升級，適合週末、休閒工作日與簡單約會造型。',
  },
  {
    id: 'fallback-5',
    title: '清爽夏季短褲',
    primary分類: '下身',
    sub分類: '短褲',
    style分類: '斯文',
    colorSeasons: ['淺春型', '淺夏型', '暖春型'],
    tag: '新品上架',
    stylingReason: '適合炎熱天氣的簡潔休閒選擇。',
    memberPrice: 'HK$290',
    categoryLabel: '夏季精選',
    galleryImages: [],
    availableColors: ['石米色', '淺卡其', '深藍'],
    availableSizes: ['S', 'M', 'L'],
    material: '輕薄棉質',
    fitNotes: '膝上乾淨版型，休閒但不顯隨便。',
    productDetails: '適合炎熱天氣的簡潔選擇，讓休閒日也能保持清爽俐落。',
  },
  {
    id: 'fallback-6',
    title: '皮革細節腰帶',
    primary分類: '其他',
    sub分類: '配件',
    style分類: '硬朗',
    colorSeasons: ['深秋型', '暖秋型', '深冬型'],
    tag: '造型師精選',
    stylingReason: '以低調配件提升基本穿搭的完整度。',
    memberPrice: 'HK$260',
    categoryLabel: '配件升級',
    galleryImages: [],
    availableColors: ['深啡', '黑色'],
    availableSizes: ['均碼'],
    material: '皮革',
    fitNotes: '適合配搭精緻休閒長褲、牛仔褲與週末造型。',
    productDetails: '低調但有效的配件升級，令簡單穿搭更完整、更有刻意經營的質感。',
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
    primary分類: row.primary_category || '其他',
    sub分類: row.sub_category || '其他',
    style分類: row.style_category || '斯文',
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
  const [products, set件單品] = useState<MemberProduct[]>(FALLBACK_PRODUCTS)
  const [loading件單品, setLoading件單品] = useState(false)
  const [primaryFilter, setPrimaryFilter] = useState<'all' | Primary分類>('all')
  const [subFilter, setSubFilter] = useState<'all' | string>('all')
  const [styleFilter, set風格Filter] = useState<'all' | 風格分類>('all')
  const [seasonFilter, setSeasonFilter] = useState<'all' | string>('all')
  const [selectedProduct, setSelectedProduct] = useState<MemberProduct | null>(null)
  const [項已選Image, setActiveImage] = useState(0)

  useEffect(() => {
    let mounted = true

    const load件單品 = async () => {
      if (!isSupabaseConfigured()) return
      setLoading件單品(true)

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('status', '項已選')
          .order('sort_order', { ascending: true })

        if (error) {
          console.error('products load error:', error)
          return
        }

        if (mounted && data && data.length > 0) {
          set件單品((data as ProductRow[]).map(mapProduct))
        }
      } catch (err) {
        console.error('products load exception:', err)
      } finally {
        if (mounted) setLoading件單品(false)
      }
    }

    load件單品()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    setActiveImage(0)
  }, [selectedProduct?.id])

  const availableSubcategories = useMemo(() => {
    if (primaryFilter === 'all') {
      return Array.from(new Set(products.map(p => p.sub分類)))
    }
    return SUBCATEGORY_MAP[primaryFilter]
  }, [primaryFilter, products])

  const filtered件單品 = useMemo(() => {
    return products.filter((product) => {
      const matchPrimary = primaryFilter === 'all' || product.primary分類 === primaryFilter
      const matchSub = subFilter === 'all' || product.sub分類 === subFilter
      const match風格 = styleFilter === 'all' || product.style分類 === styleFilter
      const matchSeason = seasonFilter === 'all' || product.colorSeasons.includes(seasonFilter)
      return matchPrimary && matchSub && match風格 && matchSeason
    })
  }, [products, primaryFilter, subFilter, styleFilter, seasonFilter])

  const 項已選FilterCount = [primaryFilter, subFilter, styleFilter, seasonFilter].filter(item => item !== 'all').length

  const onPrimaryChange = (next: 'all' | Primary分類) => {
    setPrimaryFilter(next)
    setSubFilter('all')
  }

  const reset篩選 = () => {
    setPrimaryFilter('all')
    setSubFilter('all')
    set風格Filter('all')
    setSeasonFilter('all')
  }

  const applyClientSeason = () => {
    if (client.seasonal_type) setSeasonFilter(client.seasonal_type)
  }

  const buildWhatsAppLink = (product: MemberProduct) => {
    const message = `你好 A2O，我想查詢這件會員選品：\n單品：${product.title}\n分類: ${product.primary分類} / ${product.sub分類}\n風格: ${product.style分類}\n適合色彩季節：${product.colorSeasons.join('、')}\n可選顏色: ${product.availableColors.join('、') || '向造型師查詢'}\n可選尺碼: ${product.availableSizes.join('、') || '向造型師查詢'}\n會員價：${product.memberPrice}\n客人：${client.name}\n電話：${clientPhone}\n\n麻煩你幫我確認庫存、尺碼，並提供配搭建議。`
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  }

  const FilterButton = ({ 項已選, children, onClick }: { 項已選: boolean; children: ReactNode; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'whitespace-nowrap border px-3 py-2 text-xs tracking-wide transition-colors',
        項已選
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
          A2O 會員衣櫥 · 單品詳情
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="mb-5 flex 件單品-center justify-between border-b border-zinc-100 pb-4">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="inline-flex 件單品-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-zinc-950"
            >
              <ArrowLeft className="size-4" /> 返回會員選品
            </button>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="inline-flex size-9 件單品-center justify-center border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-950 hover:text-zinc-950"
              aria-label="關閉單品詳情"
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
                        項已選Image === index ? 'border-zinc-950' : 'border-zinc-100 hover:border-zinc-400'
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
                      src={detailImages[項已選Image] || detailImages[0]}
                      alt={selectedProduct.title}
                      className="h-full w-full object-cover object-center grayscale-[10%]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col 件單品-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 px-6 text-center">
                      <span className="font-serif text-5xl text-zinc-300">A2O</span>
                      <span className="mt-4 text-[11px] uppercase tracking-[0.22em] text-zinc-400">圖片待上傳</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-6">
                <div className="mb-5 flex 件單品-start justify-between gap-5">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{selectedProduct.categoryLabel}</p>
                    <h3 className="font-serif text-4xl font-medium leading-tight tracking-tight text-zinc-950">{selectedProduct.title}</h3>
                    <p className="mt-2 text-sm font-light text-zinc-500">{selectedProduct.primary分類} / {selectedProduct.sub分類} · {selectedProduct.style分類}</p>
                  </div>
                  <p className="shrink-0 text-lg font-light text-zinc-950">{selectedProduct.memberPrice}</p>
                </div>

                <p className="mb-6 text-sm font-light leading-relaxed text-zinc-600">
                  {selectedProduct.productDetails || selectedProduct.stylingReason || 'A2O 造型師精選單品。歡迎透過 WhatsApp 查詢庫存、尺碼與配搭建議。'}
                </p>

                <div className="space-y-6 border-y border-zinc-100 py-6">
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">可選顏色</h4>
                    {selectedProduct.availableColors.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.availableColors.map(color => (
                          <span key={color} className="border border-zinc-200 px-3 py-2 text-xs text-zinc-600">{color}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-light text-zinc-400">請向造型師查詢現有顏色。</p>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">可選尺碼</h4>
                    {selectedProduct.availableSizes.length > 0 ? (
                      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                        {selectedProduct.availableSizes.map(size => (
                          <span key={size} className="flex h-10 件單品-center justify-center border border-zinc-200 text-xs text-zinc-700">{size}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-light text-zinc-400">請向造型師查詢現有尺碼。</p>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">適合色彩季節</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colorSeasons.length > 0 ? selectedProduct.colorSeasons.map(season => (
                        <span key={season} className="bg-zinc-50 px-3 py-2 text-xs text-zinc-600">{season}</span>
                      )) : <p className="text-sm font-light text-zinc-400">請向造型師查詢色彩配搭。</p>}
                    </div>
                  </div>

                  {(selectedProduct.material || selectedProduct.fitNotes) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {selectedProduct.material && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">材質</h4>
                          <p className="text-sm font-light leading-relaxed text-zinc-500">{selectedProduct.material}</p>
                        </div>
                      )}
                      {selectedProduct.fitNotes && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">版型建議</h4>
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
                  className="mt-6 inline-flex w-full 件單品-center justify-center gap-2 bg-zinc-950 px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-zinc-800"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp 查詢造型師
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:件單品-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">造型師嚴選單品</p>
            <h3 className="font-serif text-3xl font-medium tracking-tight text-zinc-950">會員專屬選品</h3>
            <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-zinc-500">
              由 A2O 造型師為會員搜羅的男士單品。你可以按單品類型、風格方向與 12 季色彩分析挑選合適款式。
            </p>
          </div>

          <div className="flex 件單品-center justify-between gap-3 border-t border-zinc-100 pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
            <span className="text-xs font-light text-zinc-500">{filtered件單品.length} / {products.length} 件單品</span>
            {loading件單品 && <p className="mt-1 text-[11px] text-zinc-400">正在更新最新選品...</p>}
          </div>
        </div>

        {client.seasonal_type && (
          <div className="mb-6 flex flex-wrap 件單品-center gap-2 rounded-none border border-zinc-100 bg-zinc-50 px-4 py-3">
            <span className="text-xs font-light text-zinc-500">你的色彩類型：</span>
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
            <span className="text-[11px] text-zinc-400">Tap to filter 件單品 suitable for your palette.</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[168px_1fr]">
          <aside className="lg:border-r lg:border-zinc-100 lg:pr-6">
            <div className="mb-6 flex 件單品-center justify-between lg:block">
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-950">篩選</h4>
                <p className="mt-1 text-xs font-light text-zinc-400">{項已選FilterCount} 項已選</p>
              </div>
              <button type="button" onClick={reset篩選} className="text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 lg:mt-3">
                重設
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">分類</h5>
                <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                  {(['all', '上身', '下身', '其他'] as const).map(item => (
                    <FilterButton key={item} 項已選={primaryFilter === item} onClick={() => onPrimaryChange(item)}>
                      {item === 'all' ? '全部' : item}
                    </FilterButton>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">單品類型</h5>
                <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                  <FilterButton 項已選={subFilter === 'all'} onClick={() => setSubFilter('all')}>All</FilterButton>
                  {availableSubcategories.map((sub) => (
                    <FilterButton key={sub} 項已選={subFilter === sub} onClick={() => setSubFilter(sub)}>{sub}</FilterButton>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">風格</h5>
                <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                  {(['all', '斯文', '硬朗'] as const).map(item => (
                    <FilterButton key={item} 項已選={styleFilter === item} onClick={() => set風格Filter(item)}>
                      {item === 'all' ? '全部風格' : item}
                    </FilterButton>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">色彩季節</h5>
                <select
                  aria-label="Color season"
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                  className="w-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 outline-none transition-colors focus:border-zinc-900"
                >
                  <option value="all">全部色彩季節</option>
                  {COLOR_SEASONS.map((season) => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          <div>
            <div className="mb-4 flex 件單品-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-xs font-light text-zinc-500">{filtered件單品.length} 件單品</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">點擊單品查看詳情</span>
            </div>

            {filtered件單品.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-3">
                {filtered件單品.map((product) => (
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
                        <div className="flex h-full w-full flex-col 件單品-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 px-4 text-center">
                          <span className="font-serif text-2xl text-zinc-300">A2O</span>
                          <span className="mt-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400">圖片待上傳</span>
                        </div>
                      )}
                      <span className={cn(
                        'absolute left-3 top-3 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]',
                        product.tag === '限量選品' ? 'bg-zinc-950 text-white' : 'bg-white/90 text-zinc-950 backdrop-blur'
                      )}>
                        {product.tag}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex 件單品-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-medium leading-snug text-zinc-950">{product.title}</h4>
                          <p className="mt-1 text-[11px] font-light text-zinc-500">{product.primary分類} / {product.sub分類}</p>
                        </div>
                        <p className="shrink-0 text-xs font-light text-zinc-950">{product.memberPrice}</p>
                      </div>

                      <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">{product.categoryLabel} · {product.style分類}</p>
                      <p className="line-clamp-2 text-xs font-light leading-relaxed text-zinc-500">{product.stylingReason}</p>

                      <div className="flex flex-wrap gap-1.5">
                        {product.colorSeasons.slice(0, 3).map((season) => (
                          <span key={`${product.id}-${season}`} className="border border-zinc-100 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-500">{season}</span>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="mt-3 inline-flex w-full 件單品-center justify-center bg-zinc-950 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-zinc-800"
                      >
                        查看詳情
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col 件單品-center justify-center border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
                <p className="text-sm font-light text-zinc-500">No 件單品 match this filter yet.</p>
                <button type="button" onClick={reset篩選} className="mt-4 border-b border-zinc-900 pb-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-950">
                  重設 filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
