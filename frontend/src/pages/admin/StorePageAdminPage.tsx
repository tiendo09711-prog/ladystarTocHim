import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Edit3, ExternalLink, Eye, EyeOff, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { getAdminStorePage, updateStorePage } from '../../api/contentApi'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { StorePageContent, StorePageItem, StorePageItemType } from '../../types'

type ContentForm = {
  eyebrow: string; title: string; description: string; hero_image_alt: string; locations_eyebrow: string; locations_title: string; locations_description: string
  empty_title: string; empty_description: string; support_title: string; support_description: string; process_eyebrow: string; process_title: string; process_description: string
  policies_eyebrow: string; policies_title: string; policies_description: string; contact_eyebrow: string; contact_title: string; contact_description: string
  contact_image_alt: string; services: string; region_all_label: string; details_label: string; directions_label: string; call_label: string; booking_label: string
  support_cta_label: string; support_cta_url: string; form_name_label: string; form_phone_label: string; form_service_label: string; form_branch_label: string
  form_message_label: string; form_submit_label: string; form_success_message: string; seo_title: string; seo_description: string
}

const emptyForm: ContentForm = {
  eyebrow: '', title: '', description: '', hero_image_alt: '', locations_eyebrow: '', locations_title: '', locations_description: '', empty_title: '', empty_description: '',
  support_title: '', support_description: '', process_eyebrow: '', process_title: '', process_description: '', policies_eyebrow: '', policies_title: '', policies_description: '',
  contact_eyebrow: '', contact_title: '', contact_description: '', contact_image_alt: '', services: '', region_all_label: '', details_label: '', directions_label: '', call_label: '',
  booking_label: '', support_cta_label: '', support_cta_url: '', form_name_label: '', form_phone_label: '', form_service_label: '', form_branch_label: '', form_message_label: '',
  form_submit_label: '', form_success_message: '', seo_title: '', seo_description: '',
}

const toForm = (content?: StorePageContent, seo?: { title?: string | null; description?: string | null }): ContentForm => {
  const settings = content?.settings ?? {}
  return {
    ...emptyForm,
    eyebrow: content?.eyebrow ?? '', title: content?.title ?? '', description: content?.description ?? '', hero_image_alt: content?.hero_image_alt ?? '',
    locations_eyebrow: content?.locations_eyebrow ?? '', locations_title: content?.locations_title ?? '', locations_description: content?.locations_description ?? '',
    empty_title: content?.empty_title ?? '', empty_description: content?.empty_description ?? '', support_title: content?.support_title ?? '', support_description: content?.support_description ?? '',
    process_eyebrow: content?.process_eyebrow ?? '', process_title: content?.process_title ?? '', process_description: content?.process_description ?? '',
    policies_eyebrow: content?.policies_eyebrow ?? '', policies_title: content?.policies_title ?? '', policies_description: content?.policies_description ?? '',
    contact_eyebrow: content?.contact_eyebrow ?? '', contact_title: content?.contact_title ?? '', contact_description: content?.contact_description ?? '', contact_image_alt: content?.contact_image_alt ?? '',
    services: settings.services?.join('\n') ?? '', region_all_label: settings.region_all_label ?? '', details_label: settings.details_label ?? '', directions_label: settings.directions_label ?? '',
    call_label: settings.call_label ?? '', booking_label: settings.booking_label ?? '', support_cta_label: settings.support_cta_label ?? '', support_cta_url: settings.support_cta_url ?? '',
    form_name_label: settings.form_name_label ?? '', form_phone_label: settings.form_phone_label ?? '', form_service_label: settings.form_service_label ?? '', form_branch_label: settings.form_branch_label ?? '',
    form_message_label: settings.form_message_label ?? '', form_submit_label: settings.form_submit_label ?? '', form_success_message: settings.form_success_message ?? '',
    seo_title: seo?.title ?? '', seo_description: seo?.description ?? '',
  }
}

function Field({ label, name, value, setValue, multiline = false }: { label: string; name: keyof ContentForm; value: string; setValue: (name: keyof ContentForm, value: string) => void; multiline?: boolean }) {
  return <label><span className="label">{label}</span>{multiline ? <textarea className="input" rows={4} value={value} onChange={(event) => setValue(name, event.target.value)} /> : <input className="input" value={value} onChange={(event) => setValue(name, event.target.value)} />}</label>
}

function ImageControl({ slot, label, path, alt }: { slot: 'hero' | 'contact'; label: string; path?: string | null; alt?: string | null }) {
  const client = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const body = new FormData()
    body.append('image', file)
    setUploading(true)
    try {
      await apiClient.post(`/admin/store-page/images/${slot}`, body)
      await client.invalidateQueries({ queryKey: ['admin-store-page'] })
      toast.success(`Đã cập nhật ${label.toLowerCase()}.`)
    } catch { toast.error('Không thể tải ảnh. Chỉ hỗ trợ JPG, PNG hoặc WEBP tối đa 5MB.') } finally { setUploading(false); event.target.value = '' }
  }
  const remove = async () => {
    try {
      await apiClient.delete(`/admin/store-page/images/${slot}`)
      await client.invalidateQueries({ queryKey: ['admin-store-page'] })
      toast.success(`Đã xóa ${label.toLowerCase()}.`)
    } catch { toast.error('Không thể xóa ảnh.') }
  }
  return <div className="rounded-2xl border border-slate-200 p-4">
    <div className="mb-3 flex items-center justify-between gap-3"><strong>{label}</strong>{path && <button type="button" className="btn-secondary px-3 text-red-700" onClick={remove}><Trash2 size={16} />Xóa</button>}</div>
    {path ? <img className="mb-3 h-44 w-full rounded-xl object-cover" src={path} alt={alt ?? ''} /> : <div className="mb-3 grid h-32 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-400">Chưa có ảnh</div>}
    <label className="btn-secondary cursor-pointer"><ImagePlus size={17} />{uploading ? 'Đang tải...' : 'Chọn ảnh'}<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={upload} /></label>
  </div>
}

const iconOptions = ['calendar-days', 'messages-square', 'sparkles', 'badge-check', 'heart-handshake', 'refresh-cw', 'headphones', 'shield-check', 'package-check', 'map-pin']

function ItemManager({ type, items }: { type: StorePageItemType; items: StorePageItem[] }) {
  const client = useQueryClient()
  const [draft, setDraft] = useState<Partial<StorePageItem> | null>(null)
  const rows = items.filter((item) => item.item_type === type).sort((a, b) => a.sort_order - b.sort_order)
  const refresh = () => client.invalidateQueries({ queryKey: ['admin-store-page'] })
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = { item_type: type, title: String(form.get('title') ?? ''), description: String(form.get('description') ?? '') || null, image_alt: String(form.get('image_alt') ?? '') || null, icon: String(form.get('icon') ?? '') || null, sort_order: Number(form.get('sort_order') ?? 0), is_active: form.get('is_active') === 'on' }
    try {
      if (draft?.id) await apiClient.put(`/admin/store-page/items/${draft.id}`, payload)
      else await apiClient.post('/admin/store-page/items', payload)
      await refresh(); setDraft(null); toast.success('Đã lưu nội dung.')
    } catch { toast.error('Không thể lưu nội dung. Vui lòng kiểm tra lại.') }
  }
  const remove = async (item: StorePageItem) => {
    if (!confirm(`Xóa “${item.title}”?`)) return
    try { await apiClient.delete(`/admin/store-page/items/${item.id}`); await refresh(); toast.success('Đã xóa nội dung.') } catch { toast.error('Không thể xóa nội dung.') }
  }
  const toggle = async (item: StorePageItem) => {
    try { await apiClient.patch(`/admin/store-page/items/${item.id}/status`, { is_active: !item.is_active }); await refresh() } catch { toast.error('Không thể đổi trạng thái.') }
  }
  const move = async (index: number, direction: -1 | 1) => {
    const next = [...rows]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    try { await apiClient.patch('/admin/store-page/items/reorder', { item_type: type, order: next.map((item) => item.id) }); await refresh() } catch { toast.error('Không thể sắp xếp lại.') }
  }
  const uploadImage = async (item: StorePageItem, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const body = new FormData(); body.append('image', file)
    try { await apiClient.post(`/admin/store-page/items/${item.id}/image`, body); await refresh(); toast.success('Đã tải ảnh nội dung.') } catch { toast.error('Không thể tải ảnh.') } finally { event.target.value = '' }
  }

  return <section className="card p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{type === 'process' ? 'Các bước quy trình' : 'Các thẻ cam kết'}</h2><p className="muted text-sm">Thêm, sửa, ẩn và sắp xếp nội dung hiển thị trên trang.</p></div><button className="btn-primary" onClick={() => setDraft({ item_type: type, icon: 'sparkles', is_active: true, sort_order: rows.length + 1 })}><Plus size={17} />Thêm mục</button></div>
    {draft && <form className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2" onSubmit={save}>
      <label><span className="label">Tiêu đề</span><input className="input" name="title" defaultValue={draft.title ?? ''} required /></label>
      <label><span className="label">Biểu tượng</span><select className="input" name="icon" defaultValue={draft.icon ?? 'sparkles'}>{iconOptions.map((icon) => <option key={icon}>{icon}</option>)}</select></label>
      <label className="md:col-span-2"><span className="label">Mô tả</span><textarea className="input" name="description" rows={3} defaultValue={draft.description ?? ''} /></label>
      <label><span className="label">Alt ảnh</span><input className="input" name="image_alt" defaultValue={draft.image_alt ?? ''} /></label>
      <label><span className="label">Thứ tự</span><input className="input" name="sort_order" type="number" min="0" defaultValue={draft.sort_order ?? rows.length + 1} /></label>
      <label className="flex items-center gap-2"><input name="is_active" type="checkbox" defaultChecked={draft.is_active ?? true} /> Đang hiển thị</label>
      <div className="flex gap-2 md:col-span-2"><button className="btn-primary"><Save size={17} />Lưu mục</button><button type="button" className="btn-secondary" onClick={() => setDraft(null)}><X size={17} />Đóng</button></div>
    </form>}
    {rows.length ? <div className="grid gap-3">{rows.map((item, index) => <article key={item.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 p-4">
      {item.image_path ? <img className="h-16 w-24 rounded-xl object-cover" src={item.image_path} alt={item.image_alt ?? ''} /> : <div className="grid h-16 w-24 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400">Không ảnh</div>}
      <div className="min-w-0 flex-1"><strong>{item.title}</strong><p className="muted mt-1 line-clamp-2 text-sm">{item.description}</p><span className="mt-1 block text-xs font-bold text-slate-400">{item.icon} · Thứ tự {item.sort_order} · {item.is_active ? 'Đang hiện' : 'Đang ẩn'}</span></div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary px-3" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Di chuyển lên ${item.title}`}><ArrowUp size={16} /></button>
        <button className="btn-secondary px-3" disabled={index === rows.length - 1} onClick={() => move(index, 1)} aria-label={`Di chuyển xuống ${item.title}`}><ArrowDown size={16} /></button>
        <button className="btn-secondary px-3" onClick={() => toggle(item)} aria-label={item.is_active ? `Ẩn ${item.title}` : `Hiện ${item.title}`}>{item.is_active ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        <label className="btn-secondary cursor-pointer px-3" title="Tải ảnh"><ImagePlus size={16} /><input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage(item, event)} /></label>
        <button className="btn-secondary px-3" onClick={() => setDraft(item)} aria-label={`Sửa ${item.title}`}><Edit3 size={16} /></button>
        <button className="btn-secondary px-3 text-red-700" onClick={() => remove(item)} aria-label={`Xóa ${item.title}`}><Trash2 size={16} /></button>
      </div>
    </article>)}</div> : <EmptyState title="Chưa có nội dung" description="Thêm mục đầu tiên để hiển thị trên trang cửa hàng." />}
  </section>
}

export function StorePageAdminPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-store-page'], queryFn: getAdminStorePage })
  const [form, setForm] = useState<ContentForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (query.data) setForm(toForm(query.data.content, query.data.seo ?? undefined)) }, [query.data])
  const setValue = (name: keyof ContentForm, value: string) => setForm((current) => ({ ...current, [name]: value }))

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true)
    const contentKeys: Array<keyof ContentForm> = ['eyebrow', 'title', 'description', 'hero_image_alt', 'locations_eyebrow', 'locations_title', 'locations_description', 'empty_title', 'empty_description', 'support_title', 'support_description', 'process_eyebrow', 'process_title', 'process_description', 'policies_eyebrow', 'policies_title', 'policies_description', 'contact_eyebrow', 'contact_title', 'contact_description', 'contact_image_alt']
    const payload: Record<string, unknown> = Object.fromEntries(contentKeys.map((key) => [key, form[key] || null]))
    payload.settings = { services: form.services.split('\n').map((item) => item.trim()).filter(Boolean), region_all_label: form.region_all_label || null, details_label: form.details_label || null, directions_label: form.directions_label || null, call_label: form.call_label || null, booking_label: form.booking_label || null, support_cta_label: form.support_cta_label || null, support_cta_url: form.support_cta_url || null, form_name_label: form.form_name_label || null, form_phone_label: form.form_phone_label || null, form_service_label: form.form_service_label || null, form_branch_label: form.form_branch_label || null, form_message_label: form.form_message_label || null, form_submit_label: form.form_submit_label || null, form_success_message: form.form_success_message || null }
    payload.seo = { title: form.seo_title || null, description: form.seo_description || null }
    try { await updateStorePage(payload); await client.invalidateQueries({ queryKey: ['admin-store-page'] }); toast.success('Đã lưu thiết lập trang hệ thống cửa hàng.') } catch { toast.error('Không thể lưu thiết lập. Vui lòng kiểm tra dữ liệu.') } finally { setSaving(false) }
  }

  if (query.isLoading) return <LoadingState />
  if (!query.data) return <EmptyState title="Không thể tải thiết lập" description="Vui lòng tải lại trang." />

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Trang hệ thống cửa hàng</h1><p className="muted">Quản lý toàn bộ tiêu đề, nội dung, ảnh và các khối hướng dẫn trên trang public.</p></div><div className="flex gap-2"><Link className="btn-secondary" to="/admin/branches">Quản lý chi nhánh</Link><a className="btn-secondary" href="/he-thong-cua-hang" target="_blank" rel="noreferrer"><ExternalLink size={17} />Xem trang public</a></div></div>
    <form className="grid gap-6" onSubmit={save}>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">Hero và giới thiệu</h2></div><Field label="Nhãn nhỏ" name="eyebrow" value={form.eyebrow} setValue={setValue} /><Field label="Tiêu đề H1" name="title" value={form.title} setValue={setValue} /><div className="md:col-span-2"><Field label="Mô tả" name="description" value={form.description} setValue={setValue} multiline /></div><Field label="Alt ảnh hero" name="hero_image_alt" value={form.hero_image_alt} setValue={setValue} /><ImageControl slot="hero" label="Ảnh hero" path={query.data.content.hero_image_path} alt={query.data.content.hero_image_alt} /></section>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">Khối danh sách cửa hàng</h2></div><Field label="Nhãn nhỏ" name="locations_eyebrow" value={form.locations_eyebrow} setValue={setValue} /><Field label="Tiêu đề" name="locations_title" value={form.locations_title} setValue={setValue} /><div className="md:col-span-2"><Field label="Mô tả" name="locations_description" value={form.locations_description} setValue={setValue} multiline /></div><Field label="Tiêu đề khi trống" name="empty_title" value={form.empty_title} setValue={setValue} /><Field label="Mô tả khi trống" name="empty_description" value={form.empty_description} setValue={setValue} multiline /><Field label="Tiêu đề hỗ trợ từ xa" name="support_title" value={form.support_title} setValue={setValue} /><Field label="Mô tả hỗ trợ từ xa" name="support_description" value={form.support_description} setValue={setValue} multiline /></section>
      <section className="card grid gap-4 p-5 md:grid-cols-3"><div className="md:col-span-3"><h2 className="text-xl font-black">Nhãn nút và bộ lọc</h2></div><Field label="Tất cả khu vực" name="region_all_label" value={form.region_all_label} setValue={setValue} /><Field label="Xem chi tiết" name="details_label" value={form.details_label} setValue={setValue} /><Field label="Chỉ đường" name="directions_label" value={form.directions_label} setValue={setValue} /><Field label="Gọi cửa hàng" name="call_label" value={form.call_label} setValue={setValue} /><Field label="Đặt lịch" name="booking_label" value={form.booking_label} setValue={setValue} /><Field label="Nhãn CTA hỗ trợ" name="support_cta_label" value={form.support_cta_label} setValue={setValue} /><div className="md:col-span-3"><Field label="URL CTA hỗ trợ" name="support_cta_url" value={form.support_cta_url} setValue={setValue} /></div></section>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">Tiêu đề quy trình và cam kết</h2></div><Field label="Nhãn quy trình" name="process_eyebrow" value={form.process_eyebrow} setValue={setValue} /><Field label="Tiêu đề quy trình" name="process_title" value={form.process_title} setValue={setValue} /><div className="md:col-span-2"><Field label="Mô tả quy trình" name="process_description" value={form.process_description} setValue={setValue} multiline /></div><Field label="Nhãn cam kết" name="policies_eyebrow" value={form.policies_eyebrow} setValue={setValue} /><Field label="Tiêu đề cam kết" name="policies_title" value={form.policies_title} setValue={setValue} /><div className="md:col-span-2"><Field label="Mô tả cam kết" name="policies_description" value={form.policies_description} setValue={setValue} multiline /></div></section>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">Khối liên hệ và biểu mẫu</h2></div><Field label="Nhãn nhỏ" name="contact_eyebrow" value={form.contact_eyebrow} setValue={setValue} /><Field label="Tiêu đề" name="contact_title" value={form.contact_title} setValue={setValue} /><div className="md:col-span-2"><Field label="Mô tả" name="contact_description" value={form.contact_description} setValue={setValue} multiline /></div><Field label="Alt ảnh liên hệ" name="contact_image_alt" value={form.contact_image_alt} setValue={setValue} /><ImageControl slot="contact" label="Ảnh liên hệ" path={query.data.content.contact_image_path} alt={query.data.content.contact_image_alt} /><Field label="Nhãn họ tên" name="form_name_label" value={form.form_name_label} setValue={setValue} /><Field label="Nhãn số điện thoại" name="form_phone_label" value={form.form_phone_label} setValue={setValue} /><Field label="Nhãn dịch vụ" name="form_service_label" value={form.form_service_label} setValue={setValue} /><Field label="Nhãn cửa hàng" name="form_branch_label" value={form.form_branch_label} setValue={setValue} /><Field label="Nhãn ghi chú" name="form_message_label" value={form.form_message_label} setValue={setValue} /><Field label="Nhãn nút gửi" name="form_submit_label" value={form.form_submit_label} setValue={setValue} /><div className="md:col-span-2"><Field label="Thông báo gửi thành công" name="form_success_message" value={form.form_success_message} setValue={setValue} /></div><label className="md:col-span-2"><span className="label">Danh sách dịch vụ (mỗi dòng một mục)</span><textarea className="input" rows={5} value={form.services} onChange={(event) => setValue('services', event.target.value)} /></label></section>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">SEO</h2></div><Field label="SEO title" name="seo_title" value={form.seo_title} setValue={setValue} /><Field label="Meta description" name="seo_description" value={form.seo_description} setValue={setValue} /></section>
      <button className="btn-primary justify-self-start" disabled={saving}><Save size={18} />{saving ? 'Đang lưu...' : 'Lưu thiết lập trang'}</button>
    </form>
    <ItemManager type="process" items={query.data.items} />
    <ItemManager type="policy" items={query.data.items} />
  </div>
}
