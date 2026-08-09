export type Role = 'user' | 'admin'

export interface User { id: number; name: string; email: string; phone?: string | null; role: Role; status: 'active' | 'blocked' }
export interface Category { id: number; name: string; slug: string; description?: string; image_path?: string; is_active: boolean; children?: Category[] }
export interface Brand { id: number; name: string; slug: string }
export interface AttributeValue { attribute_id: number; value_id: number; value: string }
export interface ProductVariant { id: number; sku: string; barcode?: string | null; price: number; sale_price?: number | null; cost_price?: number | null; weight?: number | null; current_price: number; status: string; stock: number; attributes: AttributeValue[] }
export interface ProductImage { id: number; image_path: string; alt_text?: string; is_primary: boolean; sort_order?: number }
export interface Product { id: number; name: string; slug: string; base_sku: string; short_description?: string; description: string; material?: string; base_type?: string; origin?: string; estimated_lifespan?: string; usage_instructions?: string; care_instructions?: string; warranty_information?: string; status: string; is_featured: boolean; is_new: boolean; category?: Category; brand?: Brand; images: ProductImage[]; variants: ProductVariant[]; price_min?: number; price_max?: number; available_stock?: number; best_listing_variant?: { id: number; current_price: number; stock: number } | null; rating_average: number; reviews_count: number; created_at?: string }
export interface CatalogContent { page_key: string; eyebrow: string; title: string; subtitle: string; hero_image_path?: string | null; hero_image_alt: string; editorial_title: string; editorial_intro: string; editorial_sections: Array<{ title: string; body: string }>; consultation_title: string; consultation_body: string; consultation_image_path?: string | null; consultation_image_alt: string; consultation_cta_label: string; settings: { hero_badge?: string; trust_items?: Array<{ title: string; description?: string }>; consultation_benefits?: string[]; guide_grid_title?: string; guide_grid_intro?: string; product_primary_cta_label?: string; product_secondary_cta_label?: string }; seo?: { title?: string; description?: string } | null }
export interface HairGuideProduct { product: Product; badge?: string | null; note?: string | null }
export interface HairGuideContent extends CatalogContent { products: HairGuideProduct[]; contact: { support_phone?: string | null; support_email?: string | null } }
export interface CatalogFilters { categories: Category[]; brands: Brand[]; materials: string[]; attributes: AdminAttribute[]; price: { min: number; max: number } }
export interface Pagination<T> { current_page: number; data: T[]; last_page: number; per_page: number; total: number }
export interface ApiResponse<T> { success: boolean; message: string; data: T; errors?: Record<string, string[]> }
export interface CartItem { id: number | string; product_variant_id: number; quantity: number; unit_price: number; variant: ProductVariant & { product: Product } }
export interface CartData { items: CartItem[]; subtotal: number; count: number }
export interface OrderItem { id: number; product_name: string; variant_description?: string; sku: string; unit_price: number; quantity: number; line_total: number }
export interface Order { id: number; order_number: string; total_amount: number; subtotal: number; discount_amount: number; shipping_fee: number; payment_method: string; payment_status: string; order_status: string; created_at: string; customer_name: string; customer_phone: string; shipping_address: string; items: OrderItem[] }

export interface AdminAttributeValue { id: number; attribute_id: number; value: string; display_value: string; color_code?: string | null; sort_order: number; is_active: boolean }
export interface AdminAttribute { id: number; name: string; code: string; type: 'select' | 'color' | 'text'; is_filterable: boolean; is_variant_attribute: boolean; is_active: boolean; values: AdminAttributeValue[] }
export interface Branch {
  id: number; name: string; code: string; phone?: string | null; email?: string | null; province?: string | null; district?: string | null; ward?: string | null; address_line?: string | null
  public_description?: string | null; opening_hours?: string | null; image_path?: string | null; image_alt?: string | null; latitude?: string | number | null; longitude?: string | number | null
  booking_url?: string | null; map_url?: string | null; show_on_store_page?: boolean; public_sort_order?: number; is_default: boolean; is_active: boolean
}
export interface AdminCustomer extends User { orders_count: number; created_at: string }
export interface CustomerDetail extends User { addresses: Array<{ id: number; recipient_name: string; phone: string; province: string; district: string; ward: string; address_line: string }>; orders: Order[] }
export interface AdminReview { id: number; rating: number; title?: string | null; content?: string | null; status: 'pending' | 'approved' | 'rejected'; admin_reply?: string | null; created_at: string; user: User; product: Pick<Product, 'id' | 'name' | 'slug'> }
export interface Coupon { id: number; code: string; type: 'fixed' | 'percentage'; value: number; minimum_order_amount?: number | null; maximum_discount_amount?: number | null; usage_limit?: number | null; usage_limit_per_user?: number | null; used_count: number; starts_at?: string | null; expires_at?: string | null; is_active: boolean }
export interface InventoryRow { id: number; branch_id: number; product_variant_id: number; quantity_on_hand: number; quantity_reserved: number; quantity_available: number; reorder_level: number; branch: Branch; variant: { id: number; sku: string; product: { id: number; name: string } } }
export interface InventoryTransaction { id: number; type: string; quantity: number; quantity_before: number; quantity_after: number; note?: string | null; created_at: string; branch: Branch; variant: { sku: string; product: { name: string } } }
export interface StoreSettings { id: number; store_name: string; support_phone?: string | null; support_email?: string | null; store_address?: string | null; currency: 'VND'; shipping_fee: number; free_shipping_from: number; low_stock_threshold: number; order_prefix: string }

export interface AboutSectionItem { icon?: string; title?: string; description?: string; quote?: string; name?: string; role?: string; rating?: number; label?: string }
export interface AboutSectionSettings {
  secondary_cta_label?: string; secondary_cta_url?: string; image_badge?: string; quote?: string; layout?: 'image-left' | 'image-right'
  caption_title?: string; caption_subtitle?: string; trust_items?: string[]; pills?: string[]
  floating_card?: { title?: string; subtitle?: string }; items?: AboutSectionItem[]; steps?: AboutSectionItem[]
}
export type AboutSectionType = 'hero' | 'rich_text_image' | 'timeline' | 'showcase' | 'cards' | 'goals' | 'testimonials' | 'cta'
export interface AboutSection {
  id?: number; section_key: string; section_type: AboutSectionType; eyebrow?: string | null; title?: string | null; subtitle?: string | null; body?: string | null
  image_path?: string | null; image_alt?: string | null; secondary_image_path?: string | null; secondary_image_alt?: string | null
  cta_label?: string | null; cta_url?: string | null; settings?: AboutSectionSettings; sort_order: number; is_active?: boolean
}
export interface PageSeo { page_key?: string; title: string; description?: string | null; og_image_path?: string | null }
export interface AboutPageData { sections: AboutSection[]; seo: PageSeo }
export type NewsStatus = 'draft' | 'published' | 'archived'
export interface NewsArticleSummary { id: number; title: string; slug: string; excerpt?: string | null; cover_image_path?: string | null; cover_image_alt?: string | null; category?: string | null; published_at?: string | null }
export interface NewsArticle extends NewsArticleSummary { content?: string | null; status: NewsStatus; seo_title?: string | null; seo_description?: string | null; sort_order: number; created_at?: string; author?: { id: number; name: string } | null }
export interface NewsPageContent { id?: number; page_key?: string; eyebrow?: string | null; title?: string | null; description?: string | null; hero_image_path?: string | null; hero_image_alt?: string | null; featured_article_id?: number | null; featured_badge_label?: string | null; list_eyebrow?: string | null; list_title?: string | null; list_description?: string | null; show_cta?: boolean; cta_eyebrow?: string | null; cta_title?: string | null; cta_description?: string | null; cta_primary_label?: string | null; cta_primary_url?: string | null; cta_secondary_label?: string | null; cta_secondary_url?: string | null; cta_image_path?: string | null; cta_image_alt?: string | null }
export interface NewsPageSeo { title?: string | null; description?: string | null; og_image_path?: string | null }
export interface NewsPageArticleSummary { id: number; title: string; slug: string; cover_image_path?: string | null; cover_image_alt?: string | null; category?: string | null; published_at?: string | null; status?: NewsStatus; has_cover?: boolean }
export interface NewsPageData { content: NewsPageContent; seo: NewsPageSeo; featured: (NewsArticleSummary & { has_cover?: boolean }) | null; articles: Pagination<NewsArticleSummary> }
export interface NewsPageAdminData { content: NewsPageContent; seo: NewsPageSeo; articles: NewsPageArticleSummary[] }
export interface StorePageSettings {
  services?: string[]; region_all_label?: string; details_label?: string; directions_label?: string; call_label?: string; booking_label?: string
  support_cta_label?: string; support_cta_url?: string; form_name_label?: string; form_phone_label?: string; form_service_label?: string
  form_branch_label?: string; form_message_label?: string; form_submit_label?: string; form_success_message?: string
}
export interface StorePageContent {
  id?: number; page_key?: string; eyebrow?: string | null; title?: string | null; description?: string | null; hero_image_path?: string | null; hero_image_alt?: string | null
  locations_eyebrow?: string | null; locations_title?: string | null; locations_description?: string | null; empty_title?: string | null; empty_description?: string | null
  support_title?: string | null; support_description?: string | null; process_eyebrow?: string | null; process_title?: string | null; process_description?: string | null
  policies_eyebrow?: string | null; policies_title?: string | null; policies_description?: string | null; contact_eyebrow?: string | null; contact_title?: string | null
  contact_description?: string | null; contact_image_path?: string | null; contact_image_alt?: string | null; settings?: StorePageSettings
}
export type StorePageItemType = 'process' | 'policy'
export interface StorePageItem {
  id: number; item_type: StorePageItemType; title: string; description?: string | null; image_path?: string | null; image_alt?: string | null
  icon?: string | null; sort_order: number; is_active?: boolean
}
export interface StoreLocation extends Branch { full_address?: string | null }
export interface StorePageData { content: StorePageContent | null; steps: StorePageItem[]; policies: StorePageItem[]; branches: StoreLocation[]; seo?: NewsPageSeo | null }
export interface StorePageAdminData { content: StorePageContent; items: StorePageItem[]; seo?: NewsPageSeo | null }
