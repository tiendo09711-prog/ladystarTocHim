import { expect, test, type Page, type Route } from '@playwright/test'

const products = [
  {
    id: 1,
    name: 'Tóc mái tự nhiên',
    slug: 'toc-mai-tu-nhien',
    base_sku: 'LS-NATURAL',
    short_description: 'Mẫu tóc nhẹ, tự nhiên và dễ chăm sóc.',
    description: 'Mô tả sản phẩm thử nghiệm Phase 6.',
    material: 'Tóc thật',
    base_type: 'Lace',
    origin: 'Việt Nam',
    warranty_information: 'Bảo hành 30 ngày',
    warranty_days: 30,
    status: 'active',
    is_featured: true,
    is_new: true,
    category: { id: 1, name: 'Tóc nữ', slug: 'toc-nu' },
    brand: { id: 1, name: 'LADYSTARS', slug: 'ladystars' },
    images: [{ id: 1, image_path: '/images/product-placeholder.svg', alt_text: 'Tóc mái tự nhiên', is_primary: true }],
    variants: [{ id: 11, sku: 'LS-NATURAL-01', price: 1_500_000, sale_price: null, current_price: 1_500_000, status: 'active', stock: 8, attributes: [] }],
    variant_options: [],
    reviews: [],
    promotions: [],
    sold_count: 12,
    price_min: 1_500_000,
    price_max: 1_500_000,
    available_stock: 8,
    rating_average: 4.8,
    reviews_count: 5,
  },
  {
    id: 2,
    name: 'Tóc bob thanh lịch',
    slug: 'toc-bob-thanh-lich',
    base_sku: 'LS-BOB',
    short_description: 'Kiểu bob gọn nhẹ cho nhu cầu hàng ngày.',
    description: 'Mô tả sản phẩm thứ hai.',
    material: 'Sợi tổng hợp',
    base_type: 'Mono',
    origin: 'Hàn Quốc',
    warranty_days: 14,
    status: 'active',
    is_featured: false,
    is_new: false,
    category: { id: 1, name: 'Tóc nữ', slug: 'toc-nu' },
    brand: { id: 1, name: 'LADYSTARS', slug: 'ladystars' },
    images: [{ id: 2, image_path: '/images/product-placeholder.svg', alt_text: 'Tóc bob thanh lịch', is_primary: true }],
    variants: [{ id: 21, sku: 'LS-BOB-01', price: 1_100_000, sale_price: null, current_price: 1_100_000, status: 'active', stock: 4, attributes: [] }],
    variant_options: [],
    reviews: [],
    promotions: [],
    sold_count: 7,
    price_min: 1_100_000,
    price_max: 1_100_000,
    available_stock: 4,
    rating_average: 4.5,
    reviews_count: 2,
  },
]

function paginated(data: typeof products) {
  return { success: true, data: { data, meta: { current_page: 1, last_page: 1, per_page: 10, total: data.length }, links: {} } }
}

async function mockStore(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ status: 401, json: { message: 'Unauthenticated.' } })
    if (url.pathname.endsWith('/home-page')) return route.fulfill({ json: { success: true, data: {} } })
    if (url.pathname.endsWith('/products/toc-mai-tu-nhien')) return route.fulfill({ json: { success: true, data: products[0] } })
    if (url.pathname.endsWith('/products/toc-bob-thanh-lich')) return route.fulfill({ json: { success: true, data: products[1] } })
    if (url.pathname.endsWith('/products')) {
      const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean).map(Number)
      return route.fulfill({ json: paginated(ids.length ? products.filter((product) => ids.includes(product.id)) : products) })
    }
    if (url.pathname.endsWith('/hair-finder/options')) return route.fulfill({ json: { success: true, data: {
      content: { eyebrow: 'LADYSTARS Hair Finder', title: 'Tìm mẫu tóc phù hợp với bạn', description: 'Gợi ý từ cấu hình đang áp dụng.', result_title: 'Gợi ý dành cho bạn', empty_result: 'Chưa có gợi ý.', score_template: ':score% phù hợp' },
      actions: { back: 'Quay lại', next: 'Tiếp tục', submit: 'Xem gợi ý', loading: 'Đang phân tích...', restart: 'Làm lại' },
      format: { locale: 'vi-VN', currency: 'VND' },
      questions: [
        { key: 'usage', type: 'single', title: 'Bạn muốn sử dụng tóc cho nhu cầu nào?', default_value: 'daily', choices: [{ value: 'daily', label: 'Sử dụng hàng ngày' }, { value: 'event', label: 'Đi sự kiện' }] },
        { key: 'length', type: 'single', title: 'Độ dài bạn mong muốn?', default_value: '', choices: [{ value: 'short', label: 'Ngắn' }, { value: '', label: 'Chưa xác định' }] },
        { key: 'preferences', type: 'multiple', title: 'Điều gì quan trọng với bạn?', default_value: [], choices: [{ value: 'natural', label: 'Tự nhiên' }, { value: 'easy_care', label: 'Dễ chăm sóc' }] },
        { key: 'budget', type: 'budget', title: 'Khoảng giá phù hợp?', empty_label: 'Chưa xác định', choices: [{ value: '0', label: 'Phổ thông', min: 500_000, max: 2_000_000 }] },
        { key: 'product_fields', type: 'select_group', title: 'Chất liệu và kiểu đế', fields: [{ key: 'material', label: 'Chất liệu', placeholder: 'Hãy đề xuất', choices: [{ value: 'Tóc thật', label: 'Tóc thật' }] }, { key: 'base_type', label: 'Kiểu đế', placeholder: 'Hãy đề xuất', choices: [{ value: 'Lace', label: 'Lace' }] }] },
      ],
    } } })
    if (url.pathname.endsWith('/hair-finder/recommendations')) return route.fulfill({ json: { success: true, data: [{ product: products[0], score: 92, reasons: ['Phù hợp nhu cầu sử dụng hàng ngày', 'Trong khoảng ngân sách'] }] } })
    return route.fulfill({ status: 404, json: { message: `Unmocked ${request.method()} ${url.pathname}` } })
  })
}

async function mockAdmin(page: Page) {
  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, data: { id: 1, name: 'Admin Phase 6', email: 'admin@example.test', role: 'admin', status: 'active', is_super_admin: true, permissions: ['dashboard.view'] } } })
    if (path.endsWith('/cart')) return route.fulfill({ json: { success: true, data: { items: [], subtotal: 0, count: 0 } } })
    if (path.endsWith('/admin/dashboard/attention')) return route.fulfill({ json: { success: true, data: { counters: { pending_orders: 3, returns_requested: 2, warranties_requested: 1 }, items: [{ key: 'pending_orders', label: 'Đơn hàng chờ xử lý', count: 3, url: '/admin/orders?status=pending' }, { key: 'returns_requested', label: 'Yêu cầu đổi trả mới', count: 2, url: '/admin/returns?status=requested' }] } } })
    if (path.endsWith('/admin/dashboard/summary')) return route.fulfill({ json: { success: true, data: { revenue: 8_000_000, orders: 6, customers: 4, products: 9, average_order_value: 1_333_333 } } })
    if (path.endsWith('/admin/dashboard/revenue')) return route.fulfill({ json: { success: true, data: [] } })
    if (path.endsWith('/admin/dashboard/order-statuses')) return route.fulfill({ json: { success: true, data: [] } })
    if (path.endsWith('/admin/dashboard/top-products')) return route.fulfill({ json: { success: true, data: [] } })
    if (path.endsWith('/admin/dashboard/low-stock')) return route.fulfill({ json: { success: true, data: [] } })
    if (path.endsWith('/admin/global-search')) return route.fulfill({ json: { success: true, data: { orders: [{ id: 7, title: 'LS2608300007', subtitle: 'Khách Phase 6 · 0900000007', url: '/admin/orders/7' }], customers: [], products: [], variants: [], appointments: [] } } })
    if (path.endsWith('/admin/orders/7')) return route.fulfill({ json: { success: true, data: { id: 7, order_number: 'LS2608300007', total_amount: 1_500_000, subtotal: 1_500_000, discount_amount: 0, shipping_fee: 0, payment_method: 'cod', payment_status: 'unpaid', order_status: 'pending', created_at: '2026-08-30T08:00:00Z', customer_name: 'Khách Phase 6', customer_phone: '0900000007', shipping_address: 'Hà Nội', admin_note: null, items: [{ id: 1, product_name: products[0].name, sku: 'LS-NATURAL-01', unit_price: 1_500_000, quantity: 1, line_total: 1_500_000 }], status_histories: [], payment: null, shipment: null } } })
    return route.fulfill({ status: 404, json: { message: `Unmocked ${route.request().method()} ${path}` } })
  })
}

test('compare and recently viewed stay usable on mobile', async ({ page }) => {
  await mockStore(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => localStorage.setItem('ladystars_recently_viewed_v1', JSON.stringify([{ productId: 2, viewedAt: '2026-08-30T08:00:00Z' }])))
  await page.goto('/san-pham/toc-mai-tu-nhien')

  await expect(page.getByRole('heading', { name: 'Tóc mái tự nhiên' })).toBeVisible()
  const recentlyViewed = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Sản phẩm bạn vừa xem' }) })
  await expect(recentlyViewed.getByRole('heading', { name: 'Sản phẩm bạn vừa xem' })).toBeVisible()
  await expect(recentlyViewed.getByRole('link', { name: 'Tóc bob thanh lịch' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Thêm vào so sánh' }).click()
  await expect(page.getByRole('link', { name: 'So sánh 1 sản phẩm' })).toBeVisible()

  await page.goto('/so-sanh')
  await expect(page.getByRole('heading', { name: 'So sánh sản phẩm' })).toBeVisible()
  await expect(page.getByText('Tóc mái tự nhiên', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Xóa' }).click()
  await expect(page.getByRole('heading', { name: 'Chưa có sản phẩm để so sánh' })).toBeVisible()
})

test('hair finder completes deterministic recommendation flow on desktop', async ({ page }) => {
  await mockStore(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/tim-mau-toc')

  await page.getByRole('button', { name: 'Sử dụng hàng ngày' }).click()
  await page.getByRole('button', { name: 'Tiếp tục' }).click()
  await page.getByRole('button', { name: 'Ngắn' }).click()
  await page.getByRole('button', { name: 'Tiếp tục' }).click()
  await page.getByText('Tự nhiên', { exact: true }).click()
  await page.getByRole('button', { name: 'Tiếp tục' }).click()
  await page.getByRole('button', { name: /Phổ thông/ }).click()
  await page.getByRole('button', { name: 'Tiếp tục' }).click()
  await page.getByLabel('Chất liệu').selectOption('Tóc thật')
  await page.getByLabel('Kiểu đế').selectOption('Lace')
  await page.getByRole('button', { name: 'Xem gợi ý' }).click()

  await expect(page.getByRole('heading', { name: 'Gợi ý dành cho bạn' })).toBeVisible()
  await expect(page.getByText('92% phù hợp')).toBeVisible()
  await expect(page.getByText('Tóc mái tự nhiên', { exact: true })).toBeVisible()
})

test('admin attention center and keyboard global search work', async ({ page }) => {
  await mockAdmin(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin/dashboard')

  await expect(page.getByRole('heading', { name: 'Cần xử lý' })).toBeVisible()
  await expect(page.getByText('Đơn hàng chờ xử lý')).toBeVisible()
  await expect(page.getByText('Đơn chờ: 3')).toBeVisible()

  await page.keyboard.press('Control+K')
  const search = page.getByPlaceholder('Nhập ít nhất 2 ký tự...')
  await expect(search).toBeFocused()
  await search.fill('LS260830')
  await expect(page.getByText('LS2608300007')).toBeVisible()
  await search.press('Enter')
  await expect(page).toHaveURL(/\/admin\/orders\/7$/)
})
