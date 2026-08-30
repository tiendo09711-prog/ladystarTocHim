import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/apiClient'
import type { ApiResponse, AttentionSummary } from '../../types'

export const adminAttentionQueryKey = ['admin', 'attention-center'] as const

export function useAdminAttention(enabled = true) {
  return useQuery({
    queryKey: adminAttentionQueryKey,
    queryFn: async ({ signal }): Promise<AttentionSummary> => {
      const payload = (await apiClient.get<ApiResponse<Partial<AttentionSummary>>>('/admin/dashboard/attention', {
        signal,
        suppressUnauthorizedEvent: true,
      })).data.data

      return {
        items: Array.isArray(payload?.items) ? payload.items : [],
        counters: payload?.counters && typeof payload.counters === 'object' ? payload.counters : {},
      }
    },
    enabled,
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
