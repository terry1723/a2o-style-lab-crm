import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'
import { companyConfig } from './company.config'
import { isSupabaseConfigured, supabase } from './supabase'
import type { CartItem, CatalogueProduct, CustomerContext } from './types'

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

function priceNumber(value?: string | null) {
  const parsed = Number(String(value || '0').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: number) {
  return `${companyConfig.currencyLabel}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(companyConfig.cart.storageKey)
    return saved ? JSON.parse(saved) as CartItem[] : []
  } catch {
    return []
  }
}

export default function App() {
  const [products, setProducts] = useState<CatalogueProduct[]>(demoProducts)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<CatalogueProduct | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [style, setStyle] = useState('all')
  const [profile, setProfile] = useState('all')
  const [cart, setCart] = useState<CartItem[]>(loadCart)
  const [cartOpen, setCartOpen] = useState(false)
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

  useEffect(() => {
    setActiveImage(0)
    setSelectedColor(selected?.available_colors?.length === 1 ? selected.available_colors[0] : '')
    setSelectedSize(selected?.available_sizes?.length === 1 ? selected.available_sizes[0] : '')
  }, [selected?.id])

  useEffect(() => {
    localStorage.setItem(companyConfig.cart.storageKey, JSON.stringify(cart))
  }, [cart])

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

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + priceNumber(item.price) * item.quantity, 0),
    [cart],
  )

  const buildProductWhatsAppLink = (product: CatalogueProduct) => {
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

  const buildCartWhatsAppLink = () => {
    const itemLines = cart.flatMap((item, index) => {
      const unitPrice = priceNumber(item.price)
      const variants = [item.color ? `Colour: ${item.color}` : '', item.size ? `Size: ${item.size}` : '']
        .filter(Boolean)
        .join(' · ')

      return [
        `${index + 1}. ${item.title}`,
        variants,
        `Qty: ${item.quantity} · Unit: ${money(unitPrice)} · Total: ${money(unitPrice * item.quantity)}`,
        `Link: ${productLink(item.productId)}`,
        '',
      ]
    })

    const lines = [
      companyConfig.cart.orderIntro,
      '',
      ...itemLines,
      `Order subtotal: ${money(cartSubtotal)}`,
      companyConfig.showCustomerNameInWhatsApp && customer.name ? `Customer: ${customer.name}` : '',
    ].filter(line => line !== undefined)

    return `https://wa.me/${companyConfig.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  const addSelectedToCart = () => {
    if (!selected) return

    if ((selected.available_colors?.length || 0) > 0 && !selectedColor) {
      alert('Please select a colour.')
      return
    }
    if ((selected.available_sizes?.length || 0) > 0 && !selectedSize) {
      alert('Please select a size.')
      return
    }

    const key = [selected.id, selectedColor, selectedSize].join('::')
    const nextItem: CartItem = {
      key,
      productId: selected.id,
      title: selected.title,
      imageUrl: selected.image_url,
      price: selected.price || '0',
      color: selectedColor || undefined,
      size: selectedSize || undefined,
      quantity: 1,
    }

    setCart(current => {
      const existing = current.find(item => item.key === key)
      if (!existing) return [...current, nextItem]
      return current.map(item => item.key === key ? { ...item, quantity: item.quantity + 1 } : item)
    })
    setSelected(null)
    setCartOpen(true)
  }

  const updateQuantity = (key: string, change: number) => {
    setCart(current => current
      .map(item => item.key === key ? { ...item, quantity: item.quantity + change } : item)
      .filter(item => item.quantity > 0))
  }

  const removeItem = (key: string) => {
    setCart(current => current.filter(item => item.key !== key))
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
        <div className="header-inner">
          <div className="brand-block">
            {companyConfig.logoUrl ? <img src={companyConfig.logoUrl} alt={companyConfig.companyName} /> : null}
            <div>
              <p className="eyebrow">{companyConfig.companyName}</p>
              <h1>{companyConfig.catalogueTitle}</h1>
              <p>{companyConfig.catalogueSubtitle}</p>
            </div>
          </div>

          {companyConfig.cart.enabled ? (
            <button className="cart-trigger" type="button" onClick={() => setCartOpen(true)}>
              <ShoppingBag size={20} />
              <span>Cart</span>
              {cartCount > 0 ? <em>{cartCount}</em> : null}
            </button>
          ) : null}
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

                {selected.available_colors?.length ? (
                  <div className="variant-field">
                    <label htmlFor="product-colour">Colour</label>
                    <select id="product-colour" value={selectedColor} onChange={event => setSelectedColor(event.target.value)}>
                      <option value="">Select colour</option>
                      {selected.available_colors.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                ) : null}

                {selected.available_sizes?.length ? (
                  <div className="variant-field">
                    <label htmlFor="product-size">Size</label>
                    <select id="product-size" value={selectedSize} onChange={event => setSelectedSize(event.target.value)}>
                      <option value="">Select size</option>
                      {selected.available_sizes.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                ) : null}

                {companyConfig.cart.enabled ? (
                  <button className="primary-cta" type="button" onClick={addSelectedToCart}>
                    <ShoppingBag size={18} /> Add to cart
                  </button>
                ) : null}
                <a className="secondary-cta" href={buildProductWhatsAppLink(selected)} target="_blank" rel="noreferrer">
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

      {cartOpen ? (
        <div className="cart-backdrop" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" onClick={event => event.stopPropagation()}>
            <div className="cart-header">
              <div>
                <p className="eyebrow">{companyConfig.companyName}</p>
                <h2>Your cart</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={20} /></button>
            </div>

            <div className="cart-body">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <ShoppingBag size={34} />
                  <p>Your cart is empty.</p>
                  <button type="button" onClick={() => setCartOpen(false)}>Continue shopping</button>
                </div>
              ) : (
                cart.map(item => (
                  <article className="cart-item" key={item.key}>
                    <div className="cart-item-image">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <span>{companyConfig.companyName}</span>}
                    </div>
                    <div className="cart-item-copy">
                      <div className="cart-item-title-row">
                        <div>
                          <h3>{item.title}</h3>
                          {(item.color || item.size) ? <p>{[item.color, item.size].filter(Boolean).join(' · ')}</p> : null}
                        </div>
                        <button type="button" onClick={() => removeItem(item.key)} aria-label="Remove item"><Trash2 size={16} /></button>
                      </div>
                      <div className="cart-item-bottom">
                        <div className="quantity-control">
                          <button type="button" onClick={() => updateQuantity(item.key, -1)}><Minus size={14} /></button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.key, 1)}><Plus size={14} /></button>
                        </div>
                        <strong>{money(priceNumber(item.price) * item.quantity)}</strong>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            {cart.length > 0 ? (
              <div className="cart-footer">
                <div className="cart-subtotal"><span>Subtotal</span><strong>{money(cartSubtotal)}</strong></div>
                <p>Final stock, delivery and payment details will be confirmed by the company.</p>
                <a className="cart-checkout" href={buildCartWhatsAppLink()} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} /> {companyConfig.cart.checkoutLabel}
                </a>
                <button className="clear-cart" type="button" onClick={() => setCart([])}>Clear cart</button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info-row"><span>{label}</span><p>{value}</p></div>
}
