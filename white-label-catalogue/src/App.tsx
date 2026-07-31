import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink, MessageCircle, Search, X } from 'lucide-react'
import { companyConfig } from './company.config'
import { isSupabaseConfigured, supabase } from './supabase'
import type { CatalogueProduct, CustomerContext } from './types'

const demoProducts: CatalogueProduct[] = [
  {
    id: 'demo-1',
    title: 'Premium Everyday Shirt',
    category: 'Tops',
    subcategory: 'Shirts',
    style: 'Smart Casual',
    profile_tags: ['Professional', 'Minimal'],
    badge: 'Recommended',
    recommendation: 'A clean, versatile option for work and weekend styling.',
    price: '390',
    available_colors: ['White', 'Light Blue'],
    available_sizes: ['S', 'M', 'L'],
    material: 'Cotton blend',
    product_details: 'A reusable demo product. Replace it with products from Supabase.',
    status: 'active',
    sort_order: 1,
  },
]

function getInitialProductId() {
  const match = window.location.hash.match(/^#\/products\/([^/?]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function productLink(id: string) {
  return `${window.location.origin}${window.location.pathname}#/products/${encodeURIComponent(id)}`
}

export default function App() {
  const [products, setProducts] = useState<CatalogueProduct[]>(demoProducts)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<CatalogueProduct | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [style, setStyle] = useState('all')
  const [profile, setProfile] = useState('all')
  const customer: CustomerContext = {}

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) return
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('sort_order', { ascending: true })

      if (!error && data?.length) setProducts(data as CatalogueProduct[])
      if (error) console.error('Product load error:', error)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const requestedId = getInitialProductId()
    if (!requestedId) return
    const match = products.find(product => product.id === requestedId)
    if (match) setSelected(match)
  }, [products])

  useEffect(() => setActiveImage(0), [selected?.id])

  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))] as string[], [products])
  const styles = useMemo(() => [...new Set(products.map(p => p.style).filter(Boolean))] as string[], [products])
  const profiles = useMemo(() => [...new Set(products.flatMap(p => p.profile_tags || []))], [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(product => {
      const matchesSearch = !q || `${product.title} ${product.category || ''} ${product.style || ''}`.toLowerCase().includes(q)
      const matchesCategory = category === 'all' || product.category === category
      const matchesStyle = style === 'all' || product.style === style
      const matchesProfile = profile === 'all' || (product.profile_tags || []).includes(profile)
      return matchesSearch && matchesCategory && matchesStyle && matchesProfile
    })
  }, [products, search, category, style, profile])

  const buildWhatsAppLink = (product: CatalogueProduct) => {
    const lines = [
      `Hello ${companyConfig.companyName}, I would like to enquire about:`,
      `Product: ${product.title}`,
      product.category ? `Category: ${product.category}` : '',
      product.style ? `Style: ${product.style}` : '',
      product.price ? `Price: ${companyConfig.currencyLabel}${product.price}` : '',
      `Product link: ${productLink(product.id)}`,
      companyConfig.showCustomerNameInWhatsApp && customer.name ? `Customer: ${customer.name}` : '',
    ].filter(Boolean)

    return `https://wa.me/${companyConfig.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  const images = selected
    ? [selected.image_url, ...(selected.gallery_images || [])].filter(Boolean) as string[]
    : []

  return (
    <div
      className="app-shell"
      style={{
        '--brand-primary': companyConfig.primaryColor,
        '--brand-accent': companyConfig.accentColor,
        '--brand-bg': companyConfig.backgroundColor,
      } as React.CSSProperties}
    >
      <header className="site-header">
        <div className="brand-block">
          {companyConfig.logoUrl ? <img src={companyConfig.logoUrl} alt={companyConfig.companyName} /> : null}
          <div>
            <p className="eyebrow">{companyConfig.companyName}</p>
            <h1>{companyConfig.catalogueTitle}</h1>
            <p>{companyConfig.catalogueSubtitle}</p>
          </div>
        </div>
      </header>

      <main className="catalogue-wrap">
        <section className="filter-panel">
          <div className="search-box">
            <Search size={18} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All {companyConfig.filters.categoryLabel}</option>
            {categories.map(item => <option key={item}>{item}</option>)}
          </select>
          <select value={style} onChange={e => setStyle(e.target.value)}>
            <option value="all">All {companyConfig.filters.styleLabel}</option>
            {styles.map(item => <option key={item}>{item}</option>)}
          </select>
          <select value={profile} onChange={e => setProfile(e.target.value)}>
            <option value="all">All {companyConfig.filters.profileLabel}</option>
            {profiles.map(item => <option key={item}>{item}</option>)}
          </select>
        </section>

        {loading ? <p className="status-copy">Loading products...</p> : null}

        <section className="product-grid">
          {filtered.map(product => (
            <button key={product.id} className="product-card" onClick={() => setSelected(product)}>
              <div className="product-image">
                {product.image_url ? <img src={product.image_url} alt={product.title} /> : <span>{companyConfig.companyName}</span>}
                {product.badge ? <em>{product.badge}</em> : null}
              </div>
              <div className="product-copy">
                <p>{product.category || product.subcategory || 'Product'}</p>
                <h2>{product.title}</h2>
                <span>{product.recommendation || 'View product details'}</span>
                {companyConfig.showMemberPrice && product.price ? <strong>{companyConfig.currencyLabel}{product.price}</strong> : null}
              </div>
            </button>
          ))}
        </section>
      </main>

      {selected ? (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="product-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-topbar">
              <button onClick={() => setSelected(null)}><ArrowLeft size={17} /> Back</button>
              <button onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button>
            </div>

            <div className="detail-layout">
              <div>
                <div className="detail-main-image">
                  {images.length ? <img src={images[activeImage] || images[0]} alt={selected.title} /> : <span>{companyConfig.companyName}</span>}
                </div>
                {images.length > 1 ? (
                  <div className="thumbnail-row">
                    {images.map((image, index) => (
                      <button className={index === activeImage ? 'active' : ''} key={`${image}-${index}`} onClick={() => setActiveImage(index)}>
                        <img src={image} alt="" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="detail-copy">
                <p className="eyebrow">{selected.category || 'Product'}</p>
                <h2>{selected.title}</h2>
                {selected.price ? <h3>{companyConfig.currencyLabel}{selected.price}</h3> : null}
                <p>{selected.product_details || selected.recommendation}</p>
                {selected.style ? <Info label="Style" value={selected.style} /> : null}
                {selected.material ? <Info label="Material" value={selected.material} /> : null}
                {selected.fit_notes ? <Info label="Notes" value={selected.fit_notes} /> : null}
                {selected.available_colors?.length ? <Info label="Colours" value={selected.available_colors.join(', ')} /> : null}
                {selected.available_sizes?.length ? <Info label="Sizes" value={selected.available_sizes.join(', ')} /> : null}

                <a className="primary-cta" href={buildWhatsAppLink(selected)} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} /> WhatsApp enquiry
                </a>
                <button className="secondary-cta" onClick={() => navigator.clipboard.writeText(productLink(selected.id))}>
                  <ExternalLink size={17} /> Copy product link
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info-row"><span>{label}</span><p>{value}</p></div>
}
