# White-label Product Catalogue

A standalone React + Vite product catalogue extracted from the A2O Member Picks concept.

## Included

- Product grid
- Search and configurable filters
- Product detail view
- Multiple product images
- Colour and size selection
- Persistent shopping cart using localStorage
- Quantity controls and cart subtotal
- WhatsApp cart checkout
- Individual WhatsApp product enquiry
- Shareable product links using `#/products/:id`
- Company branding and cart config
- Supabase products table schema
- Demo fallback product when Supabase is not configured

## Cart behaviour

The cart is designed for reuse across different companies without requiring a payment gateway.

- Customers select product variants before adding an item.
- Cart contents remain after refreshing or reopening the browser.
- Quantity, variants and subtotal are included in one WhatsApp order message.
- Stock, delivery and payment are confirmed manually by the company.
- Cart settings are controlled in `src/company.config.ts`.

A future version can replace the WhatsApp checkout with Stripe, Shopify, WooCommerce or another payment provider.

## Setup

1. Copy `.env.example` to `.env`.
2. Add a Supabase URL and anon key.
3. Run `supabase/schema.sql` in the target company's Supabase project.
4. Edit `src/company.config.ts`.
5. Run:

```bash
npm install
npm run dev
```

## New company checklist

Edit only these items for a basic deployment:

- `src/company.config.ts`
- `.env`
- Supabase `products` records
- logo URL
- WhatsApp number
- brand colours
- product categories and tags
- cart checkout wording

## Recommended deployment model

For simple projects, create one Supabase project and one Vercel project per company.

For a future SaaS version, add `company_id` to products and create `companies`, `company_users`, `orders`, `order_items`, and `enquiries` tables.

## Product roadmap

1. Product CMS for add/edit/archive/upload/sort
2. Staff login and permissions
3. Online payment integration
4. Order and enquiry tracking
5. Customer profiles and personalised recommendations
6. Multi-tenant company management
7. Template presets for fashion, beauty, eyewear, education and professional services
