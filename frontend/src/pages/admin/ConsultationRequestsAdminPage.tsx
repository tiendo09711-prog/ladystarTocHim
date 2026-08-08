import { Save } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/apiClient'
import type { ApiResponse } from '../../types'
import { toast } from 'sonner'

type Consultation = { id: number; name: string; phone: string; source_page: string; message?: string; status: string; admin_note?: string; created_at: string; product?: { name: string }; category?: { name: string } }
const statuses = [['', 'Tất cả trạng thái'], ['new', 'Mới'], ['contacted', 'Đã liên hệ'], ['completed', 'Hoàn thành'], ['cancelled', 'Đã hủy']] as const

export function ConsultationRequestsAdminPage() {
  const [filterStatus, setFilterStatus] = useState('')
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [selectedStatuses, setSelectedStatuses] = useState<Record<number, string>>({})
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['consultation-requests', filterStatus], queryFn: async () => (await apiClient.get<ApiResponse<{ data: Consultation[] }>>('/admin/consultation-requests', { params: filterStatus ? { status: filterStatus } : undefined })).data.data })
  const save = async (item: Consultation) => { await apiClient.patch(`/admin/consultation-requests/${item.id}/status`, { status: selectedStatuses[item.id] ?? item.status, admin_note: notes[item.id] ?? item.admin_note ?? null }); toast.success('Đã cập nhật yêu cầu.'); client.invalidateQueries({ queryKey: ['consultation-requests'] }) }
  return <div><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black">Yêu cầu tư vấn</h1><p className="muted">Theo dõi và cập nhật các yêu cầu từ trang catalog.</p></div><label className="min-w-52"><span className="label">Lọc trạng thái</span><select className="input" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="table-wrap"><table className="table"><thead><tr><th>Khách hàng</th><th>Nguồn</th><th>Sản phẩm / tin nhắn</th><th>Thời gian</th><th>Trạng thái & ghi chú</th></tr></thead><tbody>{query.data?.data.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><br /><span className="text-sm text-slate-500">{item.phone}</span></td><td>{item.source_page}</td><td><strong>{item.product?.name ?? item.category?.name ?? '—'}</strong>{item.message && <p className="mt-1 max-w-56 text-sm text-slate-500">{item.message}</p>}</td><td>{new Date(item.created_at).toLocaleString('vi-VN')}</td><td><div className="grid min-w-64 gap-2"><select className="input" value={selectedStatuses[item.id] ?? item.status} aria-label={`Trạng thái yêu cầu ${item.id}`} onChange={(event) => setSelectedStatuses((current) => ({ ...current, [item.id]: event.target.value }))}>{statuses.slice(1).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><textarea className="input min-h-20" aria-label={`Ghi chú yêu cầu ${item.id}`} defaultValue={item.admin_note ?? ''} placeholder="Ghi chú nội bộ" onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} /><button className="btn-secondary justify-center" onClick={() => void save(item)}><Save size={15} />Lưu</button></div></td></tr>)}</tbody></table></div></div>
}
