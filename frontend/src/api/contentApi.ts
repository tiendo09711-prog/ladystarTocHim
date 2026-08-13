import { apiClient, csrfCookie } from './apiClient'
import type { AboutPageData, ApiResponse, CatalogContent, ContactPageAdminData, ContactPageData, HomePageContent, NewsArticle, NewsArticleSummary, NewsPageAdminData, NewsPageData, Pagination, StorePageAdminData, StorePageData } from '../types'

export async function getAboutPage() {
  return (await apiClient.get<ApiResponse<AboutPageData>>('/about')).data.data
}

export async function getHomePageContent() {
  return (await apiClient.get<ApiResponse<HomePageContent>>('/home-page')).data.data
}

export async function getAdminHomePageContent() {
  return (await apiClient.get<ApiResponse<HomePageContent>>('/admin/home-page')).data.data
}

export async function updateHomePageContent(payload: Pick<HomePageContent, 'announcement_messages' | 'announcement_interval_seconds' | 'announcement_enabled' | 'hero_image_alt' | 'sections'>) {
  return (await apiClient.put<ApiResponse<HomePageContent>>('/admin/home-page', payload)).data.data
}

export async function uploadHomeHeroImage(image: File, alt?: string | null) {
  const data = new FormData()
  data.append('image', image)
  if (alt) data.append('hero_image_alt', alt)
  return (await apiClient.post<ApiResponse<HomePageContent>>('/admin/home-page/hero-image', data)).data.data
}

export async function deleteHomeHeroImage() {
  return (await apiClient.delete<ApiResponse<HomePageContent>>('/admin/home-page/hero-image')).data.data
}

export async function uploadHomeBrandStoryImage(image: File) {
  const data = new FormData()
  data.append('image', image)
  return (await apiClient.post<ApiResponse<HomePageContent>>('/admin/home-page/brand-story-image', data)).data.data
}

export async function deleteHomeBrandStoryImage() {
  return (await apiClient.delete<ApiResponse<HomePageContent>>('/admin/home-page/brand-story-image')).data.data
}

export type HomeSectionImageSlot = 'solutions' | 'styles' | 'process' | 'testimonials'

export async function uploadHomeSectionImage(slot: HomeSectionImageSlot, image: File, index?: number) {
  const data = new FormData()
  data.append('image', image)
  const suffix = index === undefined ? '' : `/${index}`
  return (await apiClient.post<ApiResponse<HomePageContent>>(`/admin/home-page/section-images/${slot}${suffix}`, data)).data.data
}

export async function deleteHomeSectionImage(slot: HomeSectionImageSlot, index?: number) {
  const suffix = index === undefined ? '' : `/${index}`
  return (await apiClient.delete<ApiResponse<HomePageContent>>(`/admin/home-page/section-images/${slot}${suffix}`)).data.data
}

export async function getNewsArticles(params?: Record<string, string | number | undefined>) {
  return (await apiClient.get<ApiResponse<Pagination<NewsArticleSummary>>>('/news', { params })).data.data
}

export async function getNewsArticle(slug: string) {
  return (await apiClient.get<ApiResponse<NewsArticle>>(`/news/${slug}`)).data.data
}

export async function getNewsPage(params?: { page?: number }) {
  return (await apiClient.get<ApiResponse<NewsPageData>>('/news-page', { params })).data.data
}

export async function getPromotionsPage(params?: { page?: number }) {
  return (await apiClient.get<ApiResponse<NewsPageData>>('/promotions-page', { params })).data.data
}

export async function getPromotionArticle(slug: string) {
  return (await apiClient.get<ApiResponse<NewsArticle>>(`/promotions/${slug}`)).data.data
}

export async function getGuidesPage(params?: { page?: number }) {
  return (await apiClient.get<ApiResponse<NewsPageData>>('/guides-page', { params })).data.data
}

export async function getGuideArticle(slug: string) {
  return (await apiClient.get<ApiResponse<NewsArticle>>(`/guides/${slug}`)).data.data
}

export async function getAdminNewsPage() {
  return (await apiClient.get<ApiResponse<NewsPageAdminData>>('/admin/news-page')).data.data
}

export async function getAdminPromotionsPage() {
  return (await apiClient.get<ApiResponse<NewsPageAdminData>>('/admin/promotions-page')).data.data
}

export async function getAdminGuidesPage() {
  return (await apiClient.get<ApiResponse<NewsPageAdminData>>('/admin/guides-page')).data.data
}

export async function updateNewsPageContent(payload: Record<string, unknown>) {
  return (await apiClient.put<ApiResponse<NewsPageAdminData>>('/admin/news-page', payload)).data.data
}

export async function updatePromotionsPageContent(payload: Record<string, unknown>) {
  return (await apiClient.put<ApiResponse<NewsPageAdminData>>('/admin/promotions-page', payload)).data.data
}

export async function updateGuidesPageContent(payload: Record<string, unknown>) {
  return (await apiClient.put<ApiResponse<NewsPageAdminData>>('/admin/guides-page', payload)).data.data
}

export async function uploadGuidesHeroImage(image: File, alt?: string) {
  const data = new FormData()
  data.append('image', image)
  if (alt) data.append('hero_image_alt', alt)
  return (await apiClient.post<ApiResponse<NewsPageAdminData>>('/admin/guides-page/hero-image', data)).data.data
}

export async function deleteGuidesHeroImage() {
  return (await apiClient.delete<ApiResponse<NewsPageAdminData>>('/admin/guides-page/hero-image')).data.data
}

export async function uploadGuidesCtaImage(image: File, alt?: string) {
  const data = new FormData()
  data.append('image', image)
  if (alt) data.append('cta_image_alt', alt)
  return (await apiClient.post<ApiResponse<NewsPageAdminData>>('/admin/guides-page/cta-image', data)).data.data
}

export async function deleteGuidesCtaImage() {
  return (await apiClient.delete<ApiResponse<NewsPageAdminData>>('/admin/guides-page/cta-image')).data.data
}

export async function uploadGuideContentImage(articleId: number, image: File, alt?: string) {
  const data = new FormData()
  data.append('image', image)
  if (alt) data.append('content_image_alt', alt)
  return (await apiClient.post<ApiResponse<NewsArticle>>(`/admin/guides/${articleId}/content-image`, data)).data.data
}

export async function uploadGuideVideo(articleId: number, video: File) {
  const data = new FormData()
  data.append('video', video)
  return (await apiClient.post<ApiResponse<NewsArticle>>(`/admin/guides/${articleId}/video`, data)).data.data
}

export async function uploadNewsCtaImage(image: File, alt?: string) {
  const data = new FormData()
  data.append('image', image)
  if (alt) data.append('cta_image_alt', alt)
  return (await apiClient.post<ApiResponse<{ cta_image_path: string; cta_image_alt: string }>>('/admin/news-page/cta-image', data)).data.data
}

export async function uploadPromotionsCtaImage(image: File, alt?: string) {
  const data = new FormData()
  data.append('image', image)
  if (alt) data.append('cta_image_alt', alt)
  return (await apiClient.post<ApiResponse<{ cta_image_path: string; cta_image_alt: string }>>('/admin/promotions-page/cta-image', data)).data.data
}

export async function deleteNewsCtaImage() {
  return (await apiClient.delete<ApiResponse<unknown>>('/admin/news-page/cta-image')).data
}

export async function deletePromotionsCtaImage() {
  return (await apiClient.delete<ApiResponse<unknown>>('/admin/promotions-page/cta-image')).data
}

export async function getCatalogContent() {
  return (await apiClient.get<ApiResponse<CatalogContent>>('/catalog/content')).data.data
}

export async function getCategoryCatalogContent(slug: string) {
  return (await apiClient.get<ApiResponse<CatalogContent>>(`/catalog/content/category/${slug}`)).data.data
}

export async function submitConsultation(payload: { name: string; phone: string; source_page: string; message?: string; category_id?: number; product_id?: number; service_name?: string; branch_id?: number }) {
  await csrfCookie()
  return (await apiClient.post<ApiResponse<{ id: number }>>('/consultation-requests', payload)).data.data
}

export async function getStorePage() {
  return (await apiClient.get<ApiResponse<StorePageData>>('/store-page')).data.data
}

export async function getAdminStorePage() {
  return (await apiClient.get<ApiResponse<StorePageAdminData>>('/admin/store-page')).data.data
}

export async function updateStorePage(payload: Record<string, unknown>) {
  return (await apiClient.put<ApiResponse<StorePageAdminData>>('/admin/store-page', payload)).data.data
}

export async function getContactPage() {
  return (await apiClient.get<ApiResponse<ContactPageData>>('/contact-page')).data.data
}

export async function getAdminContactPage() {
  return (await apiClient.get<ApiResponse<ContactPageAdminData>>('/admin/contact-page')).data.data
}

export async function updateContactPage(payload: Record<string, unknown>) {
  return (await apiClient.put<ApiResponse<ContactPageAdminData>>('/admin/contact-page', payload)).data.data
}
