import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, Category } from '../../types'

type CategoryDraft = Partial<Category> & { parent_id?: number | null; sort_order?: number }

export function CategoriesAdminPage() {
  const client = useQueryClient()
  const [draft, setDraft] = useState<CategoryDraft | null>(null)
  const query = useQuery({ queryKey: ['admin-categories'], queryFn: async () => (await apiClient.get<ApiResponse<Category[]>>('/admin/categories')).data.data })
  const refresh = () => client.invalidateQueries({ queryKey: ['admin-categories'] })
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = { name: String(form.get('name') ?? ''), slug: String(form.get('slug') ?? ''), parent_id: form.get('parent_id') ? Number(form.get('parent_id')) : null, description: String(form.get('description') ?? '') || null, image_path: String(form.get('image_path') ?? '') || null, is_active: form.get('is_active') === 'on', show_in_menu: form.get('show_in_menu') === 'on', sort_order: Number(form.get('sort_order') ?? 0) }
    try { if (draft?.id) await apiClient.put(`/admin/categories/${draft.id}`, payload); else await apiClient.post('/admin/categories', payload); await refresh(); setDraft(null); toast.success('Đã lưu danh mục.') } catch { toast.error('Không thể lưu danh mục. Kiểm tra slug và danh mục cha.') }
  }
  const remove = async (category: Category) => { if (!confirm(`Xóa danh mục ${category.name}?`)) return; try { await apiClient.delete(`/admin/categories/${category.id}`); await refresh(); toast.success('Đã xóa danh mục.') } catch { toast.error('Không thể xóa danh mục đang có sản phẩm.') } }
  const toggle = async (category: Category) => { await apiClient.patch(`/admin/categories/${category.id}/status`, { is_active: !category.is_active }); await refresh(); toast.success('Đã cập nhật trạng thái.') }

  return <div>
    <div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-3xl font-black'>Danh mục</h1><p className='muted'>Tổ chức danh mục cha, con và trạng thái hiển thị.</p></div><button className='btn-primary' onClick={() => setDraft({ is_active: true, sort_order: 0 })}><Plus size={18} />Thêm danh mục</button></div>
    {draft && <form className='card mb-6 grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4' onSubmit={save}>
      <label><span className='label'>Tên danh mục</span><input className='input' name='name' defaultValue={draft.name} required /></label>
      <label><span className='label'>Slug</span><input className='input' name='slug' defaultValue={draft.slug} required /></label>
      <label><span className='label'>Danh mục cha</span><select className='input' name='parent_id' defaultValue={draft.parent_id ?? ''}><option value=''>Danh mục gốc</option>{query.data?.filter((item) => item.id !== draft.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span className='label'>Thứ tự</span><input className='input' name='sort_order' type='number' min='0' defaultValue={draft.sort_order ?? 0} /></label>
      <label className='md:col-span-2'><span className='label'>Mô tả</span><textarea className='input' name='description' defaultValue={draft.description ?? ''} /></label>
      <label><span className='label'>Đường dẫn ảnh</span><input className='input' name='image_path' defaultValue={draft.image_path ?? ''} /></label>
      <label className='flex items-center gap-2'><input type='checkbox' name='is_active' defaultChecked={draft.is_active ?? true} /> Đang hiển thị</label>
      <label className='flex items-center gap-2'><input type='checkbox' name='show_in_menu' defaultChecked={draft.show_in_menu ?? false} /> Hiển thị trong menu</label>
      <div className='flex gap-2 md:col-span-2 xl:col-span-4'><button className='btn-primary'>Lưu danh mục</button><button type='button' className='btn-secondary' onClick={() => setDraft(null)}><X size={17} />Đóng</button></div>
    </form>}
    {query.isLoading ? <LoadingState /> : query.data?.length ? <div className='table-wrap'><table className='table'><thead><tr><th>Tên</th><th>Slug</th><th>Cấu trúc</th><th>Trạng thái</th><th></th></tr></thead><tbody>{query.data.map((category) => <tr key={category.id}><td><strong>{category.name}</strong><div className='text-sm text-slate-500'>{category.description}</div></td><td>{category.slug}</td><td>{category.children?.length ? `${category.children.length} danh mục con` : 'Danh mục'}</td><td>{category.is_active ? 'Hiển thị' : 'Đã ẩn'}</td><td><div className='flex gap-2'><button className='btn-secondary px-3' onClick={() => setDraft(category)}><Edit3 size={16} /></button><button className='btn-secondary px-3' onClick={() => toggle(category)}>{category.is_active ? <EyeOff size={16} /> : <Eye size={16} />}</button><button className='btn-secondary px-3 text-red-700' onClick={() => remove(category)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title='Chưa có danh mục' description='Tạo danh mục đầu tiên để phân loại sản phẩm.' />}
  </div>
}
