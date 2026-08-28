import { Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import type { ApiResponse, Service } from '../../types'

type ServiceForm = Omit<Service, 'id' | 'image_path'> & { id?: number; image_path?: string | null }
type ValidationErrors = Record<string, string[]>
const blankService = (): ServiceForm => ({ name: '', slug: '', short_description: '', price: 0, duration_minutes: 60, image_alt: '', sort_order: 0, status: 'active', image_path: null })
const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function ServicesAdminPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-services'], queryFn: async () => (await apiClient.get<ApiResponse<Service[]>>('/admin/services')).data.data })
  const [form, setForm] = useState<ServiceForm>(blankService())
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [slugTouched, setSlugTouched] = useState(false)
  const editing = Boolean(form.id)

  const reset = () => { setForm(blankService()); setImageFile(null); setErrors({}); setSlugTouched(false) }
  const edit = (service: Service) => { setForm({ ...service }); setImageFile(null); setErrors({}); setSlugTouched(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const fieldError = (field: string) => errors[field]?.[0]
  const refresh = async () => client.invalidateQueries({ queryKey: ['admin-services'] })

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = { name: form.name.trim(), slug: form.slug.trim(), short_description: form.short_description?.trim() || null, price: Number(form.price), duration_minutes: Number(form.duration_minutes), image_alt: form.image_alt?.trim() || null, sort_order: Number(form.sort_order), status: form.status }
      const response = form.id
        ? await apiClient.put<ApiResponse<Service>>(`/admin/services/${form.id}`, payload)
        : await apiClient.post<ApiResponse<Service>>('/admin/services', payload)
      const saved = response.data.data
      if (imageFile) {
        const data = new FormData()
        data.append('image', imageFile)
        if (form.image_alt) data.append('image_alt', form.image_alt)
        await apiClient.post(`/admin/services/${saved.id}/image`, data)
      }
      toast.success(form.id ? 'Đã cập nhật dịch vụ.' : 'Đã tạo dịch vụ.')
      reset()
      await refresh()
    } catch (error) {
      const nextErrors = (error as { response?: { data?: { errors?: ValidationErrors } } }).response?.data?.errors ?? {}
      setErrors(nextErrors)
      toast.error(Object.keys(nextErrors).length ? 'Vui lòng kiểm tra thông tin dịch vụ.' : 'Không thể lưu dịch vụ.')
    } finally { setSaving(false) }
  }

  const toggle = async (service: Service) => {
    await apiClient.patch(`/admin/services/${service.id}/status`, { status: service.status === 'active' ? 'inactive' : 'active' })
    toast.success(service.status === 'active' ? 'Đã ẩn dịch vụ.' : 'Đã hiển thị dịch vụ.')
    await refresh()
  }

  const remove = async (service: Service) => {
    if (!window.confirm(`Xóa dịch vụ “${service.name}”? Lịch sử yêu cầu tư vấn vẫn được giữ lại.`)) return
    await apiClient.delete(`/admin/services/${service.id}`)
    if (form.id === service.id) reset()
    toast.success('Đã xóa dịch vụ.')
    await refresh()
  }

  const removeImage = async () => {
    if (!form.id) { setImageFile(null); setForm((current) => ({ ...current, image_path: null })); return }
    await apiClient.delete(`/admin/services/${form.id}/image`)
    setForm((current) => ({ ...current, image_path: null }))
    setImageFile(null)
    toast.success('Đã xóa ảnh dịch vụ.')
    await refresh()
  }

  return <div>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black">Dịch vụ chăm sóc</h1><p className="muted">Quản lý dịch vụ thật hiển thị tại /dich-vu-cham-soc.</p></div><button className="btn-primary" type="button" onClick={reset}><Plus size={17} />Thêm dịch vụ</button></div>

    <form className="card mb-6 grid gap-5 p-5" onSubmit={save} noValidate>
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">{editing ? `Chỉnh sửa: ${form.name}` : 'Tạo dịch vụ'}</h2><p className="muted text-sm">Ảnh lưu qua backend storage, giá và thứ tự có thể chỉnh bất kỳ lúc nào.</p></div>{editing && <button className="btn-secondary px-3" type="button" onClick={reset} aria-label="Đóng form chỉnh sửa"><X size={17} /></button>}</div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-4 md:grid-cols-2">
          <label><span className="label">Tên dịch vụ</span><input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: slugTouched ? current.slug : slugify(event.target.value) }))} required />{fieldError('name') && <small className="text-red-700">{fieldError('name')}</small>}</label>
          <label><span className="label">Slug</span><input className="input" value={form.slug} onChange={(event) => { setSlugTouched(true); setForm((current) => ({ ...current, slug: slugify(event.target.value) })) }} required />{fieldError('slug') && <small className="text-red-700">{fieldError('slug')}</small>}</label>
          <label className="md:col-span-2"><span className="label">Mô tả ngắn</span><textarea className="input min-h-24" value={form.short_description ?? ''} maxLength={1000} onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))} /></label>
          <label><span className="label">Giá (VND)</span><input className="input" type="number" min="0" step="1000" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))} required />{fieldError('price') && <small className="text-red-700">{fieldError('price')}</small>}</label>
          <label><span className="label">Thời lượng (phút)</span><input className="input" type="number" min="5" max="720" step="5" value={form.duration_minutes} onChange={(event) => setForm((current) => ({ ...current, duration_minutes: Number(event.target.value) }))} required />{fieldError('duration_minutes') && <small className="text-red-700">{fieldError('duration_minutes')}</small>}</label>
          <label><span className="label">Thứ tự</span><input className="input" type="number" min="0" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} required /></label>
          <label><span className="label">Trạng thái</span><select className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Service['status'] }))}><option value="active">Đang hiển thị</option><option value="inactive">Đang ẩn</option></select></label>
          <label><span className="label">Alt ảnh</span><input className="input" value={form.image_alt ?? ''} onChange={(event) => setForm((current) => ({ ...current, image_alt: event.target.value }))} /></label>
        </div>
        <div className="grid content-start gap-3"><span className="label">Ảnh dịch vụ (1:1)</span><div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">{form.image_path ? <img className="h-full w-full object-cover" src={form.image_path} alt={form.image_alt || form.name} /> : <ImagePlus className="text-slate-400" size={42} />}</div><input className="input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />{imageFile && <p className="text-sm font-semibold text-slate-600">Sẽ tải lên: {imageFile.name}</p>}{(form.image_path || imageFile) && <button className="btn-secondary justify-center text-red-700" type="button" onClick={() => void removeImage()}><Trash2 size={16} />Xóa ảnh</button>}</div>
      </div>
      <div className="flex flex-wrap gap-2"><button className="btn-primary" disabled={saving}>{saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}{editing ? 'Lưu thay đổi' : 'Tạo dịch vụ'}</button>{editing && <button className="btn-secondary" type="button" onClick={reset}>Hủy</button>}</div>
    </form>

    <div className="table-wrap"><table className="table"><thead><tr><th>Ảnh</th><th>Dịch vụ</th><th>Giá</th><th>Thời lượng</th><th>Thứ tự</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
      {query.data?.map((service) => <tr key={service.id}><td><div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100">{service.image_path ? <img className="h-full w-full object-cover" src={service.image_path} alt={service.image_alt || service.name} /> : null}</div></td><td><strong>{service.name}</strong><br /><span className="text-sm text-slate-500">{service.slug}</span></td><td className="font-bold">{currency.format(service.price)}</td><td>{service.duration_minutes} phút</td><td>{service.sort_order}</td><td><span className={`badge ${service.status === 'active' ? 'badge-success' : ''}`}>{service.status === 'active' ? 'Hiển thị' : 'Đang ẩn'}</span></td><td><div className="flex flex-wrap gap-2"><button className="btn-secondary px-3" type="button" onClick={() => edit(service)}><Pencil size={15} />Sửa</button><button className="btn-secondary px-3" type="button" onClick={() => void toggle(service)}>{service.status === 'active' ? <EyeOff size={15} /> : <Eye size={15} />}{service.status === 'active' ? 'Ẩn' : 'Hiện'}</button><button className="btn-secondary px-3 text-red-700" type="button" onClick={() => void remove(service)}><Trash2 size={15} />Xóa</button></div></td></tr>)}
      {!query.isLoading && !query.data?.length && <tr><td colSpan={7} className="py-10 text-center text-slate-500">Chưa có dịch vụ.</td></tr>}
    </tbody></table></div>
  </div>
}
