import { apiClient, csrfCookie } from './apiClient'
import type { AboutPageData, ApiResponse, CatalogContent, NewsArticle, NewsArticleSummary, NewsPageAdminData, NewsPageData, Pagination } from '../types'

export async function getAboutPage() {
  return (await apiClient.get<ApiResponse<AboutPageData>>('/about')).data.data
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

export async function getAdminNewsPage() {
  return (await apiClient.get<ApiResponse<NewsPageAdminData>>('/admin/news-page')).data.data
}

export async function updateNewsPageContent(payload: Record<string, unknown>) {
  return (await apiClient.put<ApiResponse<NewsPageAdminData>>('/admin/news-page', payload)).data.data
}

export async function uploadNewsCtaImage(image: File) {
  const data = new FormData()
  data.append('image', image)
  return (await apiClient.post<ApiResponse<{ cta_image_path: string; cta_image_alt: string }>>('/admin/news-page/cta-image', data)).data.data
}

export async function deleteNewsCtaImage() {
  return (await apiClient.delete<ApiResponse<unknown>>('/admin/news-page/cta-image')).data
}

export async function getCatalogContent() {
  return (await apiClient.get<ApiResponse<CatalogContent>>('/catalog/content')).data.data
}

export async function getCategoryCatalogContent(slug: string) {
  return (await apiClient.get<ApiResponse<CatalogContent>>(`/catalog/content/category/${slug}`)).data.data
}

export async function submitConsultation(payload: { name: string; phone: string; source_page: string; message?: string; category_id?: number }) {
  await csrfCookie()
  return (await apiClient.post<ApiResponse<{ id: number }>>('/consultation-requests', payload)).data.data
}
