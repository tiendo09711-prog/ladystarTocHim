import { expect, test } from '@playwright/test'
import type { AboutSection } from '../../src/types'

const sections: AboutSection[] = [
  {
    id: 1,
    section_key: 'hero',
    section_type: 'hero',
    title: 'Hero kiểm tra',
    image_path: '/images/brand/ladystars-hero.svg',
    image_alt: 'Hero',
    settings: {},
    sort_order: 1,
    is_active: true,
  },
  {
    id: 2,
    section_key: 'direction',
    section_type: 'showcase',
    title: 'Định hướng kiểm tra',
    image_path: '/images/brand/ladystars-hero.svg',
    image_alt: 'Định hướng',
    settings: { items: [] },
    sort_order: 2,
    is_active: true,
  },
]

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@namhair.local')
  await page.getByLabel('Mật khẩu').fill('Admin@123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 20_000 })
}

test('admin About cắt ảnh đúng tỷ lệ trước khi upload', async ({ page }) => {
  await loginAdmin(page)
  let uploadedBody: Buffer | null = null

  await page.route('**/api/v1/admin/about/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname.endsWith('/admin/about/sections') && method === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: sections }) })
    }
    if (url.pathname.endsWith('/admin/about/seos') && method === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
    }
    if (url.pathname.endsWith('/admin/about/sections/1/image') && method === 'POST') {
      uploadedBody = route.request().postDataBuffer()
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: sections[0] }) })
    }
    if (url.pathname.endsWith('/admin/about/sections/1') && method === 'PUT') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: sections[0] }) })
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: null }) })
  })

  await page.goto('/admin/about')
  const heroCard = page.locator('article', { hasText: 'Hero thương hiệu' }).first()
  await heroCard.getByRole('button', { name: 'Chỉnh sửa' }).click()
  await expect(heroCard.getByText(/Khung hiển thị: 1:1/)).toBeVisible()

  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 600
    const context = canvas.getContext('2d')!
    context.fillStyle = '#7f3f52'
    context.fillRect(0, 0, 450, 600)
    context.fillStyle = '#efc2cc'
    context.fillRect(450, 0, 450, 600)
    return canvas.toDataURL('image/png').split(',')[1]
  })

  await heroCard.getByLabel('Chọn ảnh Hero thương hiệu').setInputFiles({ name: 'about-hero-source.png', mimeType: 'image/png', buffer: Buffer.from(imageBase64, 'base64') })
  const cropDialog = page.getByRole('dialog', { name: 'Cắt ảnh Hero thương hiệu' })
  await expect(cropDialog).toBeVisible()
  await expect(cropDialog).toContainText('tỷ lệ 1:1')
  await page.screenshot({ path: '../artifacts/about-admin-crop.png', fullPage: true })
  await page.getByLabel('Căn ngang ảnh Hero thương hiệu').fill('0.35')
  await page.getByRole('button', { name: 'Dùng ảnh đã cắt' }).click()

  const preview = heroCard.locator('.about-image-admin-preview')
  await expect(preview).toBeVisible()
  const ratio = await preview.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return bounds.width / bounds.height
  })
  expect(ratio).toBeCloseTo(1, 2)
  await heroCard.getByRole('button', { name: 'Lưu section' }).click()
  await expect(page.getByText('Đã lưu section.').first()).toBeVisible()
  expect(uploadedBody).not.toBeNull()
  expect(uploadedBody!.includes(Buffer.from('about-hero-source-cropped.webp'))).toBeTruthy()
  expect(uploadedBody!.includes(Buffer.from('image/webp'))).toBeTruthy()

  const showcaseCard = page.locator('article', { hasText: 'Định hướng' }).first()
  await showcaseCard.getByRole('button', { name: 'Chỉnh sửa' }).click()
  await expect(showcaseCard.getByText(/Khung hiển thị: 8:3/)).toBeVisible()
})
