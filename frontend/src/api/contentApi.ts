import { apiClient } from './apiClient'
import type { AboutPageData, ApiResponse, NewsArticle, NewsArticleSummary, Pagination } from '../types'

export async function getAboutPage() {
  return (await apiClient.get<ApiResponse<AboutPageData>>('/about')).data.data
}

export async function getNewsArticles(params?: Record<string, string | number | undefined>) {
  return (await apiClient.get<ApiResponse<Pagination<NewsArticleSummary>>>('/news', { params })).data.data
}

export async function getNewsArticle(slug: string) {
  return (await apiClient.get<ApiResponse<NewsArticle>>(`/news/${slug}`)).data.data
}
