# White-label Product Catalogue

A standalone React + Vite product catalogue extracted from the A2O Member Picks concept.

## Included

- Product grid
- Search and configurable filters
- Product detail view
- Multiple product images
- WhatsApp enquiry builder
- Shareable product links using `#/products/:id`
- Company branding config
- Supabase products table schema
- Demo fallback product when Supabase is not configured

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

## Recommended deployment model

For simple projects, create one Supabase project and one Vercel project per company.

For a future SaaS version, add `company_id` to products and create `companies`, `company_users`, and `enquiries` tables.

## Product roadmap

1. Product CMS for add/edit/archive/upload/sort
2. Staff login and permissions
3. Customer profiles and personalised recommendations
4. Enquiry tracking
5. Multi-tenant company management
6. Template presets for fashion, beauty, eyewear, education and professional services
