import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Printer, RefreshCw } from 'lucide-react'
import Barcode from 'react-barcode'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { PermissionGate } from '../../components/admin/PermissionGate'
import type { ApiResponse } from '../../types'
import { useFormatPrice } from '../../utils/format'

interface BarcodeRow { id: number; sku: string; barcode?: string | null; price: number; sale_price?: number | null; product: { name: string } }

export function BarcodesPage() {
  const formatPrice = useFormatPrice()
  const client = useQueryClient(); const query = useQuery({ queryKey: ['barcodes'], queryFn: async () => (await apiClient.get<ApiResponse<BarcodeRow[]>>('/admin/barcodes')).data.data })
  const generate = async (id: number) => { await apiClient.post(`/admin/barcodes/${id}/generate`); await client.invalidateQueries({ queryKey: ['barcodes'] }); toast.success('Đã tạo barcode cho biến thể.') }
  return <div><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Barcode</h1><p className="muted">Tạo CODE128 theo từng biến thể và in nhãn trực tiếp.</p></div><button className="btn-primary print:hidden" onClick={() => window.print()}><Printer size={18} />In trang</button></div>{query.isLoading ? <LoadingState /> : query.data?.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{query.data.map((item) => <article key={item.id} className="card break-inside-avoid p-5 text-center"><h2 className="font-black">{item.product.name}</h2><div className="mt-1 text-sm text-slate-500">SKU: {item.sku}</div>{item.barcode ? <div className="mt-4 overflow-hidden"><Barcode value={item.barcode} format="CODE128" height={54} width={1.5} fontSize={13} /></div> : <PermissionGate permission="barcodes.manage" fallback={<div className="muted mt-4 text-sm">Chưa có barcode</div>}><button className="btn-secondary mt-5 print:hidden" onClick={() => generate(item.id)}><RefreshCw size={17} />Tạo barcode</button></PermissionGate>}<div className="price mt-2">{formatPrice(item.sale_price ?? item.price)}</div></article>)}</div> : <EmptyState title="Chưa có biến thể sản phẩm" description="Tạo biến thể trước khi sinh barcode." />}</div>
}
