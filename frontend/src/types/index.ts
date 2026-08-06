export type Role = 'user' | 'admin'

export interface User { id: number; name: string; email: string; phone?: string | null; role: Role; status: 'active' | 'blocked' }
export interface Category { id: number; name: string; slug: string; description?: string; image_path?: string; is_active: boolean; children?: Category[] }
export interface Brand { id: number; name: string; slug: string }
export interface AttributeValue { attribute_id: number; value_id: number; value: string }
export interface ProductVariant { id: number; sku: string; barcode?: string | null; price: number; sale_price?: number | null; cost_price?: number | null; weight?: number | null; current_price: number; status: string; stock: number; attributes: AttributeValue[] }
export interface ProductImage { id: number; image_path: string; alt_text?: string; is_primary: boolean; sort_order?: number }
export interface Product { id: number; name: string; slug: string; base_sku: string; short_description?: string; description: string; material?: string; base_type?: string; origin?: string; estimated_lifespan?: string; usage_instructions?: string; care_instructions?: string; warranty_information?: string; status: string; is_featured: boolean; is_new: boolean; category?: Category; brand?: Brand; images: ProductImage[]; variants: ProductVariant[]; rating_average: number; reviews_count: number; created_at?: string }
export interface Pagination<T> { current_page: number; data: T[]; last_page: number; per_page: number; total: number }
export interface ApiResponse<T> { success: boolean; message: string; data: T; errors?: Record<string, string[]> }
export interface CartItem { id: number | string; product_variant_id: number; quantity: number; unit_price: number; variant: ProductVariant & { product: Product } }
export interface CartData { items: CartItem[]; subtotal: number; count: number }
export interface OrderItem { id: number; product_name: string; variant_description?: string; sku: string; unit_price: number; quantity: number; line_total: number }
export interface Order { id: number; order_number: string; total_amount: number; subtotal: number; discount_amount: number; shipping_fee: number; payment_method: string; payment_status: string; order_status: string; created_at: string; customer_name: string; customer_phone: string; shipping_address: string; items: OrderItem[] }

export interface AdminAttributeValue { id: number; attribute_id: number; value: string; display_value: string; color_code?: string | null; sort_order: number; is_active: boolean }
export interface AdminAttribute { id: number; name: string; code: string; type: 'select' | 'color' | 'text'; is_filterable: boolean; is_variant_attribute: boolean; is_active: boolean; values: AdminAttributeValue[] }
export interface Branch { id: number; name: string; code: string; phone?: string | null; email?: string | null; province?: string | null; district?: string | null; ward?: string | null; address_line?: string | null; is_default: boolean; is_active: boolean }
export interface AdminCustomer extends User { orders_count: number; created_at: string }
export interface CustomerDetail extends User { addresses: Array<{ id: number; recipient_name: string; phone: string; province: string; district: string; ward: string; address_line: string }>; orders: Order[] }
export interface AdminReview { id: number; rating: number; title?: string | null; content?: string | null; status: 'pending' | 'approved' | 'rejected'; admin_reply?: string | null; created_at: string; user: User; product: Pick<Product, 'id' | 'name' | 'slug'> }
export interface Coupon { id: number; code: string; type: 'fixed' | 'percentage'; value: number; minimum_order_amount?: number | null; maximum_discount_amount?: number | null; usage_limit?: number | null; usage_limit_per_user?: number | null; used_count: number; starts_at?: string | null; expires_at?: string | null; is_active: boolean }
export interface InventoryRow { id: number; branch_id: number; product_variant_id: number; quantity_on_hand: number; quantity_reserved: number; quantity_available: number; reorder_level: number; branch: Branch; variant: { id: number; sku: string; product: { id: number; name: string } } }
export interface InventoryTransaction { id: number; type: string; quantity: number; quantity_before: number; quantity_after: number; note?: string | null; created_at: string; branch: Branch; variant: { sku: string; product: { name: string } } }
export interface StoreSettings { id: number; store_name: string; support_phone?: string | null; support_email?: string | null; store_address?: string | null; currency: 'VND'; shipping_fee: number; free_shipping_from: number; low_stock_threshold: number; order_prefix: string }
