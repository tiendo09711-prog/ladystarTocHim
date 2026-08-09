import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, Branch } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

export function BranchesAdminPage() {
  const client = useQueryClient()
  const [draft, setDraft] = useState<Partial<Branch> | null>(null)
  const query = useQuery({ queryKey: ['admin-branches'], queryFn: async () => (await apiClient.get<ApiResponse<Branch[]>>('/admin/branches')).data.data })
  const refresh = () => client.invalidateQueries({ queryKey: ['admin-branches'] })

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nullable = (name: string) => String(form.get(name) ?? '').trim() || null
    const numeric = (name: string) => {
      const value = String(form.get(name) ?? '').trim()
      return value === '' ? null : Number(value)
    }
    const payload = {
      name: String(form.get('name') ?? ''), code: String(form.get('code') ?? ''), phone: nullable('phone'), email: nullable('email'), province: nullable('province'),
      district: nullable('district'), ward: nullable('ward'), address_line: nullable('address_line'), public_description: nullable('public_description'), opening_hours: nullable('opening_hours'),
      image_alt: nullable('image_alt'), latitude: numeric('latitude'), longitude: numeric('longitude'), booking_url: nullable('booking_url'), map_url: nullable('map_url'),
      show_on_store_page: form.get('show_on_store_page') === 'on', public_sort_order: Number(form.get('public_sort_order') ?? 0), is_default: form.get('is_default') === 'on', is_active: form.get('is_active') === 'on',
    }
    try {
      if (draft?.id) await apiClient.put(`/admin/branches/${draft.id}`, payload)
      else await apiClient.post('/admin/branches', payload)
      await refresh(); setDraft(null); toast.success('Đã lưu chi nhánh.')
    } catch { toast.error('Không thể lưu chi nhánh. Vui lòng kiểm tra mã, email, tọa độ và URL.') }
  }

  const remove = async (branch: Branch) => {
    if (!confirm(`Xóa chi nhánh ${branch.name}?`)) return
    try { await apiClient.delete(`/admin/branches/${branch.id}`); await refresh(); toast.success('Đã xóa chi nhánh.') } catch { toast.error('Không thể xóa chi nhánh mặc định hoặc đang có tồn kho.') }
  }

  const uploadImage = async (branch: Branch, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const body = new FormData(); body.append('image', file)
    try { await apiClient.post(`/admin/store-page/branches/${branch.id}/image`, body); await refresh(); toast.success('Đã cập nhật ảnh cửa hàng.') } catch { toast.error('Không thể tải ảnh cửa hàng.') } finally { event.target.value = '' }
  }

  const deleteImage = async (branch: Branch) => {
    try { await apiClient.delete(`/admin/store-page/branches/${branch.id}/image`); await refresh(); toast.success('Đã xóa ảnh cửa hàng.') } catch { toast.error('Không thể xóa ảnh cửa hàng.') }
  }

  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Chi nhánh</h1><p className="muted">Quản lý kho hàng và dữ liệu địa điểm hiển thị trên trang hệ thống cửa hàng.</p></div><button className="btn-primary" onClick={() => setDraft({ is_active: true, is_default: false, show_on_store_page: true, public_sort_order: (query.data?.length ?? 0) + 1 })}><Plus size={18} />Thêm chi nhánh</button></div>
    {draft && <form className="card mb-6 grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4" onSubmit={save}>
      <label><span className="label">Tên chi nhánh</span><input className="input" name="name" defaultValue={draft.name} required /></label>
      <label><span className="label">Mã chi nhánh</span><input className="input" name="code" defaultValue={draft.code} required /></label>
      <label><span className="label">Điện thoại</span><input className="input" name="phone" defaultValue={draft.phone ?? ''} /></label>
      <label><span className="label">Email</span><input className="input" name="email" type="email" defaultValue={draft.email ?? ''} /></label>
      <label><span className="label">Tỉnh / thành</span><input className="input" name="province" defaultValue={draft.province ?? ''} /></label>
      <label><span className="label">Quận / huyện</span><input className="input" name="district" defaultValue={draft.district ?? ''} /></label>
      <label><span className="label">Phường / xã</span><input className="input" name="ward" defaultValue={draft.ward ?? ''} /></label>
      <label><span className="label">Địa chỉ</span><input className="input" name="address_line" defaultValue={draft.address_line ?? ''} /></label>
      <label><span className="label">Giờ mở cửa</span><input className="input" name="opening_hours" defaultValue={draft.opening_hours ?? ''} placeholder="09:00 - 20:00" /></label>
      <label><span className="label">Alt ảnh cửa hàng</span><input className="input" name="image_alt" defaultValue={draft.image_alt ?? ''} /></label>
      <label><span className="label">Vĩ độ</span><input className="input" name="latitude" type="number" step="0.0000001" min="-90" max="90" defaultValue={draft.latitude ?? ''} /></label>
      <label><span className="label">Kinh độ</span><input className="input" name="longitude" type="number" step="0.0000001" min="-180" max="180" defaultValue={draft.longitude ?? ''} /></label>
      <label className="xl:col-span-2"><span className="label">URL đặt lịch</span><input className="input" name="booking_url" defaultValue={draft.booking_url ?? ''} placeholder="/lien-he hoặc https://..." /></label>
      <label className="xl:col-span-2"><span className="label">URL chỉ đường</span><input className="input" name="map_url" defaultValue={draft.map_url ?? ''} placeholder="https://maps.google.com/..." /></label>
      <label className="md:col-span-2 xl:col-span-3"><span className="label">Mô tả hiển thị công khai</span><textarea className="input" name="public_description" rows={3} defaultValue={draft.public_description ?? ''} /></label>
      <label><span className="label">Thứ tự public</span><input className="input" name="public_sort_order" type="number" min="0" defaultValue={draft.public_sort_order ?? 0} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" name="is_default" defaultChecked={draft.is_default} /> Chi nhánh mặc định</label>
      <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={draft.is_active ?? true} /> Đang hoạt động</label>
      <label className="flex items-center gap-2"><input type="checkbox" name="show_on_store_page" defaultChecked={draft.show_on_store_page ?? true} /> Hiện trên trang cửa hàng</label>
      <div className="flex gap-2 md:col-span-2 xl:col-span-4"><button className="btn-primary">Lưu chi nhánh</button><button type="button" className="btn-secondary" onClick={() => setDraft(null)}><X size={17} />Đóng</button></div>
    </form>}
    {query.isLoading ? <LoadingState /> : query.data?.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Chi nhánh</th><th>Liên hệ</th><th>Địa chỉ</th><th>Hiển thị public</th><th>Trạng thái</th><th></th></tr></thead><tbody>{query.data.map((branch) => <tr key={branch.id}>
      <td>{branch.image_path && <img className="mb-2 h-12 w-20 rounded-lg object-cover" src={resolveAssetUrl(branch.image_path)} alt={branch.image_alt ?? ''} />}<strong>{branch.name}</strong><div className="text-sm text-slate-500">{branch.code}</div></td>
      <td>{branch.phone || '—'}<div className="text-sm text-slate-500">{branch.email}</div></td>
      <td>{[branch.address_line, branch.ward, branch.district, branch.province].filter(Boolean).join(', ') || '—'}<div className="text-sm text-slate-500">{branch.opening_hours}</div></td>
      <td>{branch.show_on_store_page ? `Có · Thứ tự ${branch.public_sort_order ?? 0}` : 'Ẩn'}</td>
      <td>{branch.is_active ? 'Hoạt động' : 'Tạm ngưng'}{branch.is_default && <div className="text-sm font-bold text-emerald-700">Mặc định</div>}</td>
      <td><div className="flex flex-wrap gap-2"><label className="btn-secondary cursor-pointer px-3" title="Tải ảnh"><ImagePlus size={16} /><input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage(branch, event)} /></label>{branch.image_path && <button className="btn-secondary px-3 text-red-700" onClick={() => deleteImage(branch)} title="Xóa ảnh"><Trash2 size={16} /></button>}<button className="btn-secondary px-3" onClick={() => setDraft(branch)} title="Chỉnh sửa"><Edit3 size={16} /></button><button className="btn-secondary px-3 text-red-700" onClick={() => remove(branch)} title="Xóa chi nhánh"><Trash2 size={16} /></button></div></td>
    </tr>)}</tbody></table></div> : <EmptyState title="Chưa có chi nhánh" description="Tạo chi nhánh để quản lý tồn kho và hiển thị trên trang cửa hàng." />}
  </div>
}
