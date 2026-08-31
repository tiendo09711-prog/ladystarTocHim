import { apiClient } from './apiClient'
import type { ApiResponse, Brand, CatalogFilters, Category, Pagination, Product, StoreSettings } from '../types'

export async function getProducts(params?: Record<string, string | string[] | number | boolean | undefined>) {
  const response = await apiClient.get<ApiResponse<{ data: Product[]; meta: Pagination<Product>; links: unknown }>>('/products', { params })
  return response.data.data
}
export async function getProduct(slug: string) { return (await apiClient.get<ApiResponse<Product>>(`/products/${slug}`)).data.data }
export async function getMenuCategories() { return (await apiClient.get<ApiResponse<Category[]>>('/categories')).data.data }
export const getCatalogCategories = getMenuCategories
export async function getBrands() { return (await apiClient.get<ApiResponse<Brand[]>>('/brands')).data.data }
export async function getCatalogFilters() { return (await apiClient.get<ApiResponse<CatalogFilters>>('/catalog/filters')).data.data }
export type PublicStoreSettings = { configured: boolean } & Partial<Pick<StoreSettings, 'store_name' | 'support_phone' | 'support_email' | 'store_address' | 'currency' | 'returns_enabled' | 'exchange_enabled' | 'warranty_enabled' | 'appointments_enabled'>>
export async function getPublicSettings() { return (await apiClient.get<ApiResponse<PublicStoreSettings>>('/settings/public')).data.data }
