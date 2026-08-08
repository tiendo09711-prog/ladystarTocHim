import { apiClient, csrfCookie } from './apiClient'
import type { AboutPageData, ApiResponse, CatalogContent, NewsArticle, NewsArticleSummary, Pagination } from '../types'

export async function getAboutPage() {
  return (await apiClient.get<ApiResponse<AboutPageData>>('/about')).data.data
}

export async function getNewsArticles(params?: Record<string, string | number | undefined>) {
  return (await apiClient.get<ApiResponse<Pagination<NewsArticleSummary>>>('/news', { params })).data.data
}

export async function getNewsArticle(slug: string) {
  return (await apiClient.get<ApiResponse<NewsArticle>>(`/news/${slug}`)).data.data
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
