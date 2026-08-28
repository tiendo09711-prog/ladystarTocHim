import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, Pagination, ReturnRequest, WarrantyRequest } from '../../types'
import { formatPrice, statusLabel } from '../../utils/format'

export function ReturnsPage() {
  const { id } = useParams()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['account-returns', id], queryFn: async () => id ? (await apiClient.get<ApiResponse<ReturnRequest>>(`/account/returns/${id}`)).data.data : (await apiClient.get<ApiResponse<Pagination<ReturnRequest>>>('/account/returns')).data.data })
  if (query.isLoading) return <LoadingState />
  const cancel = async () => { try { await apiClient.post(`/account/returns/${id}/cancel`); await client.invalidateQueries({ queryKey: ['account-returns'] }); toast.success('Đã hủy yêu cầu đổi / trả.') } catch { toast.error('Yêu cầu không còn được phép hủy.') } }

  if (id) {
    const item = query.data as ReturnRequest
    return <Detail back='/tai-khoan/doi-tra' title={`Đổi / Trả ${item.code}`} status={item.status}>
      <Info label='Đơn hàng' value={item.order?.order_number ?? '-'} /><Info label='Hình thức' value={item.request_type === 'exchange' ? 'Đổi hàng' : 'Trả hàng và hoàn tiền'} /><Info label='Ngày yêu cầu' value={new Date(item.requested_at).toLocaleString('vi-VN')} />
      <div className='grid gap-3'>{item.items?.map((line) => <div className='rounded-xl bg-slate-50 p-4' key={line.id}><strong>{line.order_item?.product_name}</strong><p className='muted mt-1'>SKU: {line.order_item?.sku} · Số lượng: {line.quantity}</p><p className='mt-2'>Lý do: {line.reason_code}{line.reason_detail ? ` — ${line.reason_detail}` : ''}</p>{line.replacement_variant && <p className='mt-1'>Biến thể thay thế: {line.replacement_variant.sku}</p>}</div>)}</div>
      <MediaGrid media={item.media} />
      {item.shipments?.map((shipment) => <div className='rounded-xl border p-4' key={shipment.id}><strong>Vận chuyển: {shipment.purpose}</strong><p className='muted mt-1'>{shipment.carrier || 'Chưa có đơn vị'} · {shipment.tracking_number || 'Chưa có mã vận đơn'} · {statusLabel[shipment.status] ?? shipment.status}</p></div>)}
      {item.refunds?.length ? <div className='rounded-xl border p-4'><h2 className='font-black'>Hoàn tiền</h2>{item.refunds.map((refund) => <p className='mt-2' key={refund.id}>{refund.code}: <strong>{formatPrice(refund.amount)}</strong> · {statusLabel[refund.status] ?? refund.status}{refund.completed_at ? ` · ${new Date(refund.completed_at).toLocaleString('vi-VN')}` : ''}</p>)}</div> : null}
      {item.rejection_reason && <p className='rounded-xl bg-red-50 p-4 text-red-800'>Lý do từ chối: {item.rejection_reason}</p>}
      {['requested', 'reviewing', 'approved'].includes(item.status) && <button className='btn-secondary justify-self-start text-red-700' type='button' onClick={() => void cancel()}>Hủy yêu cầu</button>}
    </Detail>
  }

  const page = query.data as Pagination<ReturnRequest>
  return <List title='Đổi / Trả'>{page?.data.length ? page.data.map((item) => <Link className='card block p-5' key={item.id} to={`/tai-khoan/doi-tra/${item.id}`}><div className='flex justify-between gap-3'><strong>{item.code}</strong><span>{statusLabel[item.status] ?? item.status}</span></div><p className='muted mt-2'>Đơn {item.order?.order_number} · {new Date(item.requested_at).toLocaleDateString('vi-VN')}</p></Link>) : <EmptyState title='Chưa có yêu cầu' description='Yêu cầu đổi trả từ đơn hàng hoàn thành sẽ hiển thị tại đây.' />}</List>
}

export function WarrantiesPage() {
  const { id } = useParams()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['account-warranties', id], queryFn: async () => id ? (await apiClient.get<ApiResponse<WarrantyRequest>>(`/account/warranties/${id}`)).data.data : (await apiClient.get<ApiResponse<Pagination<WarrantyRequest>>>('/account/warranties')).data.data })
  if (query.isLoading) return <LoadingState />
  const cancel = async () => { try { await apiClient.post(`/account/warranties/${id}/cancel`); await client.invalidateQueries({ queryKey: ['account-warranties'] }); toast.success('Đã hủy yêu cầu bảo hành.') } catch { toast.error('Yêu cầu không còn được phép hủy.') } }

  if (id) {
    const item = query.data as WarrantyRequest
    return <Detail back='/tai-khoan/bao-hanh' title={`Bảo hành ${item.code}`} status={item.status}>
      <Info label='Đơn hàng' value={item.order?.order_number ?? '-'} /><Info label='Sản phẩm' value={`${item.order_item?.product_name ?? '-'} · ${item.order_item?.sku ?? ''}`} /><Info label='Ngày yêu cầu' value={new Date(item.requested_at).toLocaleString('vi-VN')} /><Info label='Sự cố' value={`${item.issue_type}: ${item.description}`} /><Info label='Phương án yêu cầu' value={item.requested_resolution ?? '-'} /><Info label='Phương án xử lý' value={item.actual_resolution ?? '-'} />
      <MediaGrid media={item.media} />
      {item.shipments?.map((shipment) => <div className='rounded-xl border p-4' key={shipment.id}><strong>Vận chuyển: {shipment.purpose}</strong><p className='muted mt-1'>{shipment.carrier || 'Chưa có đơn vị'} · {shipment.tracking_number || 'Chưa có mã vận đơn'} · {statusLabel[shipment.status] ?? shipment.status}</p></div>)}
      {item.rejection_reason && <p className='rounded-xl bg-red-50 p-4 text-red-800'>Lý do từ chối: {item.rejection_reason}</p>}
      {['requested', 'reviewing', 'approved'].includes(item.status) && <button className='btn-secondary justify-self-start text-red-700' type='button' onClick={() => void cancel()}>Hủy yêu cầu</button>}
    </Detail>
  }

  const page = query.data as Pagination<WarrantyRequest>
  return <List title='Bảo hành'>{page?.data.length ? page.data.map((item) => <Link className='card block p-5' key={item.id} to={`/tai-khoan/bao-hanh/${item.id}`}><div className='flex justify-between gap-3'><strong>{item.code}</strong><span>{statusLabel[item.status] ?? item.status}</span></div><p className='muted mt-2'>{item.order_item?.product_name}</p></Link>) : <EmptyState title='Chưa có bảo hành' description='Yêu cầu bảo hành từ đơn hàng đủ điều kiện sẽ hiển thị tại đây.' />}</List>
}

function List({ title, children }: { title: string; children: React.ReactNode }) { return <div><h1 className='mb-5 text-2xl font-black'>{title}</h1><div className='grid gap-3'>{children}</div></div> }
function Detail({ back, title, status, children }: { back: string; title: string; status: string; children: React.ReactNode }) { return <div className='card p-6'><Link className='text-sm font-bold text-emerald-800' to={back}>← Quay lại danh sách</Link><div className='mt-4 flex justify-between gap-3'><h1 className='text-2xl font-black'>{title}</h1><span className='badge'>{statusLabel[status] ?? status}</span></div><div className='mt-5 grid gap-4'>{children}</div></div> }
function Info({ label, value }: { label: string; value: string }) { return <p><strong>{label}:</strong> {value}</p> }
function MediaGrid({ media }: { media?: Array<{ id: number; url: string }> }) { return media?.length ? <div><h2 className='font-black'>Ảnh minh chứng</h2><div className='mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4'>{media.map((item) => <a href={item.url} target='_blank' rel='noreferrer' key={item.id}><img className='aspect-square w-full rounded-xl border object-cover' src={item.url} alt='Ảnh minh chứng hậu mãi' /></a>)}</div></div> : null }
