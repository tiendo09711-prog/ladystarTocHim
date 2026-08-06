import { apiClient } from './apiClient'
import type { ApiResponse, Brand, Category, Pagination, Product } from '../types'

export async function getProducts(params?: Record<string, string | number | boolean | undefined>) {
  const response = await apiClient.get<ApiResponse<{ data: Product[]; meta: Pagination<Product>; links: unknown }>>('/products', { params })
  return response.data.data
}
export async function getProduct(slug: string) { return (await apiClient.get<ApiResponse<Product>>(`/products/${slug}`)).data.data }
export async function getCategories() { return (await apiClient.get<ApiResponse<Category[]>>('/categories')).data.data }
export async function getBrands() { return (await apiClient.get<ApiResponse<Brand[]>>('/brands')).data.data }
