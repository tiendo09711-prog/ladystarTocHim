import { expect, test } from '@playwright/test'

const contactData = {
  content: {
    hero_eyebrow: 'KẾT NỐI CÙNG LADYSTARS', hero_title: 'Mỗi lựa chọn đẹp bắt đầu từ một cuộc trò chuyện', hero_description: 'Mô tả hero.', hero_image_path: '/images/brand/ladystars-hero.svg', hero_image_alt: 'Hero',
    contact_eyebrow: 'THÔNG TIN LIÊN HỆ', contact_title: 'Chúng tôi luôn ở đây khi bạn cần', contact_description: 'Mô tả liên hệ.',
    commitments_eyebrow: 'TRẢI NGHIỆM AN TÂM', commitments_title: 'Sự chỉn chu trong từng điểm chạm', commitments_description: 'Mô tả cam kết.',
    guide_eyebrow: 'HƯỚNG DẪN NHẬN DIỆN', guide_title: 'Kết nối đúng kênh, nhận hỗ trợ đúng chuẩn', guide_description: 'Mô tả hướng dẫn.', guide_image_path: '/images/brand/ladystars-hero.svg', guide_image_alt: 'Hướng dẫn', guide_quote: 'Lời nhắn từ LADYSTARS.',
    branches_eyebrow: 'ĐỊA ĐIỂM TƯ VẤN', branches_title: 'Chọn không gian gần bạn', branches_description: 'Mô tả chi nhánh.',
    form_eyebrow: 'ĐẶT LỊCH TƯ VẤN', form_title: 'Để lại thông tin, chúng tôi sẽ liên hệ với bạn', form_description: 'Mô tả form.',
    settings: {
      hero_primary_label: 'Gửi yêu cầu tư vấn', hero_primary_url: '#form-lien-he', hero_secondary_label: 'Xem hệ thống cửa hàng', hero_secondary_url: '/he-thong-cua-hang',
      hotline_label: 'Hotline tư vấn', email_label: 'Email hỗ trợ', hours_label: 'Thời gian phục vụ', hours_value: '08:00 – 20:00 mỗi ngày',
      branch_call_label: 'Gọi cửa hàng', branch_directions_label: 'Chỉ đường', form_name_label: 'Họ và tên', form_phone_label: 'Số điện thoại',
      form_service_label: 'Dịch vụ bạn quan tâm', form_branch_label: 'Địa điểm thuận tiện', form_message_label: 'Chia sẻ thêm với chúng tôi', form_submit_label: 'Gửi yêu cầu tư vấn',
      form_success_message: 'Yêu cầu đã được ghi nhận.', privacy_note: 'Thông tin chỉ dùng để phản hồi tư vấn.', services: ['Tư vấn chọn sản phẩm'],
      commitments: [{ icon: 'sparkles', title: 'Tư vấn theo nhu cầu', description: 'Lắng nghe mong muốn thực tế.' }], guide_points: ['Xác minh thông tin trên website chính thức.'],
    },
  },
  store: { store_name: 'LADYSTARS', support_phone: '090 123 4567', support_email: 'hello@ladystars.test' },
  branches: [{ id: 1, name: 'LADYSTARS Quận 3', phone: '090 123 4567', full_address: '123 Đường Mẫu, Quận 3, TP.HCM', opening_hours: '09:00 - 20:00', map_url: 'https://maps.example.test' }],
  seo: { title: 'Liên hệ | LADYSTARS', description: 'Trang liên hệ.' },
}

test('trang liên hệ hiển thị responsive và gửi đủ ngữ cảnh tư vấn', async ({ page }) => {
  let body: Record<string, unknown> | undefined
  await page.route('**/api/v1/contact-page', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: contactData }) }))
  await page.route('**/api/v1/consultation-requests', async (route) => { body = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1 } }) }) })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/lien-he')
  await expect(page.getByRole('heading', { level: 1, name: contactData.content.hero_title })).toBeVisible()
  await expect(page.getByRole('heading', { name: contactData.content.commitments_title })).toBeVisible()
  await expect(page.getByRole('heading', { name: contactData.content.guide_title })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'LADYSTARS Quận 3' })).toBeVisible()
  await page.screenshot({ path: '../artifacts/contact-page-desktop.png', fullPage: true })

  await page.getByLabel('Họ và tên').fill('Nguyễn An')
  await page.getByLabel('Số điện thoại').fill('0900000000')
  await page.getByLabel('Dịch vụ bạn quan tâm').selectOption('Tư vấn chọn sản phẩm')
  await page.getByLabel('Địa điểm thuận tiện').selectOption('1')
  await page.getByLabel('Chia sẻ thêm với chúng tôi').fill('Cần tư vấn riêng.')
  await page.getByRole('button', { name: 'Gửi yêu cầu tư vấn' }).click()
  await expect.poll(() => body).toMatchObject({ name: 'Nguyễn An', phone: '0900000000', service_name: 'Tư vấn chọn sản phẩm', branch_id: 1, source_page: '/lien-he' })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: contactData.content.hero_title })).toBeVisible()
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true)
  await page.screenshot({ path: '../artifacts/contact-page-mobile.png', fullPage: true })
})

test('admin chỉnh nội dung trang liên hệ và gửi payload database', async ({ page }) => {
  let updateBody: Record<string, unknown> | undefined
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1, name: 'Admin', email: 'admin@example.test', role: 'admin', status: 'active' } }) })
    if (url.pathname.endsWith('/cart')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], subtotal: 0, count: 0 } }) })
    if (url.pathname.endsWith('/admin/contact-page') && route.request().method() === 'PUT') { updateBody = route.request().postDataJSON() as Record<string, unknown>; return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: contactData }) }) }
    if (url.pathname.endsWith('/admin/contact-page')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: contactData }) })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) })
  })

  await page.goto('/admin/contact-page')
  await expect(page.getByRole('heading', { level: 1, name: 'Trang liên hệ' })).toBeVisible()
  const heroSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Hero đầu trang' }) })
  await heroSection.getByLabel('Tiêu đề').fill('Tiêu đề liên hệ đã chỉnh')
  await page.getByRole('button', { name: 'Lưu trang liên hệ' }).click()
  await expect.poll(() => updateBody).toMatchObject({ hero_title: 'Tiêu đề liên hệ đã chỉnh' })
})
