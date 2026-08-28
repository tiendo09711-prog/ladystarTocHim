import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, Brand, Pagination } from '../../types'

type BrandDraft = Partial<Brand>

function errorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback
  const response = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
  return Object.values(response?.errors ?? {})[0]?.[0] ?? response?.message ?? fallback
}

export function BrandsAdminPage() {
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState<BrandDraft | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const query = useQuery({ queryKey: ['admin-brands', page], queryFn: async () => (await apiClient.get<ApiResponse<Pagination<Brand>>>('/admin/brands', { params: { page } })).data.data })
  const refresh = () => client.invalidateQueries({ queryKey: ['admin-brands'] })
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = { name: String(form.get('name') ?? ''), slug: String(form.get('slug') ?? '') || null, description: String(form.get('description') ?? '') || null, is_active: form.get('is_active') === 'on' }
    setPendingAction('save')
    try {
      if (draft?.id) await apiClient.put(`/admin/brands/${draft.id}`, payload)
      else await apiClient.post('/admin/brands', payload)
      await refresh(); setDraft(null); toast.success(draft?.id ? 'Đã cập nhật thương hiệu.' : 'Đã tạo thương hiệu.')
    } catch (error) { toast.error(errorMessage(error, 'Không thể lưu thương hiệu.')) }
    finally { setPendingAction(null) }
  }
  const remove = async (brand: Brand) => {
    if (!confirm(`Xóa thương hiệu ${brand.name}? Sản phẩm liên quan sẽ không còn thương hiệu.`)) return
    setPendingAction(`delete-${brand.id}`)
    try { await apiClient.delete(`/admin/brands/${brand.id}`); await refresh(); toast.success('Đã xóa thương hiệu.') }
    catch (error) { toast.error(errorMessage(error, 'Không thể xóa thương hiệu.')) }
    finally { setPendingAction(null) }
  }
  return <div><div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-3xl font-black'>Thương hiệu</h1><p className='muted'>Quản lý thương hiệu dùng trong danh mục sản phẩm.</p></div><button className='btn-primary' onClick={() => setDraft({ is_active: true })}><Plus size={18} />Thêm thương hiệu</button></div>
    {draft && <form key={draft.id ?? 'new'} className='card mb-6 grid gap-4 p-5 md:grid-cols-2' onSubmit={save}><label><span className='label'>Tên thương hiệu</span><input className='input' name='name' defaultValue={draft.name ?? ''} maxLength={190} required /></label><label><span className='label'>Slug</span><input className='input' name='slug' defaultValue={draft.slug ?? ''} maxLength={190} placeholder='Để trống để tự tạo' /></label><label className='md:col-span-2'><span className='label'>Mô tả</span><textarea className='input min-h-24' name='description' defaultValue={draft.description ?? ''} /></label><label className='flex items-center gap-2'><input type='checkbox' name='is_active' defaultChecked={draft.is_active ?? true} /> Hoạt động</label><div className='flex gap-2 md:col-span-2'><button className='btn-primary' disabled={pendingAction === 'save'}>{pendingAction === 'save' ? 'Đang lưu...' : 'Lưu thương hiệu'}</button><button type='button' className='btn-secondary' disabled={pendingAction === 'save'} onClick={() => setDraft(null)}><X size={17} />Đóng</button></div></form>}
    {query.isLoading ? <LoadingState /> : query.data?.data.length ? <><div className='table-wrap'><table className='table'><thead><tr><th>Tên</th><th>Slug</th><th>Mô tả</th><th>Trạng thái</th><th></th></tr></thead><tbody>{query.data.data.map((brand) => <tr key={brand.id}><td className='font-bold'>{brand.name}</td><td>{brand.slug}</td><td>{brand.description || '—'}</td><td>{brand.is_active ? 'Hoạt động' : 'Tạm ẩn'}</td><td><div className='flex gap-2'><button className='btn-secondary px-3' onClick={() => setDraft(brand)}><Edit3 size={16} />Sửa</button><button className='btn-secondary px-3 text-red-700' disabled={pendingAction === `delete-${brand.id}`} onClick={() => void remove(brand)}><Trash2 size={16} />{pendingAction === `delete-${brand.id}` ? 'Đang xóa...' : 'Xóa'}</button></div></td></tr>)}</tbody></table></div>{query.data.last_page > 1 && <div className='mt-4 flex items-center justify-end gap-3'><button className='btn-secondary' disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Trang trước</button><span className='font-semibold'>{page} / {query.data.last_page}</span><button className='btn-secondary' disabled={page >= query.data.last_page} onClick={() => setPage((current) => current + 1)}>Trang sau</button></div>}</> : <EmptyState title='Chưa có thương hiệu' description='Tạo thương hiệu đầu tiên để gán cho sản phẩm.' />}
  </div>
}
