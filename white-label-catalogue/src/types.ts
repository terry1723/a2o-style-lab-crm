export type CatalogueProduct = {
  id: string
  title: string
  image_url?: string | null
  gallery_images?: string[] | null
  category?: string | null
  subcategory?: string | null
  style?: string | null
  profile_tags?: string[] | null
  badge?: string | null
  recommendation?: string | null
  price?: string | null
  available_colors?: string[] | null
  available_sizes?: string[] | null
  material?: string | null
  fit_notes?: string | null
  product_details?: string | null
  status?: string | null
  sort_order?: number | null
}

export type CustomerContext = {
  name?: string
  phone?: string
  tags?: string[]
}
