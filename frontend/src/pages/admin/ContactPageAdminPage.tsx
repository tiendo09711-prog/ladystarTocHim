import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { getAdminContactPage, updateContactPage } from '../../api/contentApi'
import { LoadingState } from '../../components/common/LoadingState'
import type { ContactCommitment, ContactPageContent } from '../../types'

type FormField =
  | 'hero_eyebrow' | 'hero_title' | 'hero_description' | 'hero_image_alt'
  | 'contact_eyebrow' | 'contact_title' | 'contact_description'
  | 'commitments_eyebrow' | 'commitments_title' | 'commitments_description'
  | 'guide_eyebrow' | 'guide_title' | 'guide_description' | 'guide_image_alt' | 'guide_quote' | 'guide_points'
  | 'branches_eyebrow' | 'branches_title' | 'branches_description'
  | 'form_eyebrow' | 'form_title' | 'form_description' | 'services'
  | 'hero_primary_label' | 'hero_primary_url' | 'hero_secondary_label' | 'hero_secondary_url'
  | 'hotline_label' | 'email_label' | 'hours_label' | 'hours_value' | 'branch_call_label' | 'branch_directions_label'
  | 'form_name_label' | 'form_phone_label' | 'form_service_label' | 'form_branch_label' | 'form_message_label' | 'form_submit_label' | 'form_success_message' | 'privacy_note'
  | 'seo_title' | 'seo_description'

type ContentForm = Record<FormField, string>

const emptyForm: ContentForm = Object.fromEntries([
  'hero_eyebrow', 'hero_title', 'hero_description', 'hero_image_alt', 'contact_eyebrow', 'contact_title', 'contact_description', 'commitments_eyebrow', 'commitments_title',
  'commitments_description', 'guide_eyebrow', 'guide_title', 'guide_description', 'guide_image_alt', 'guide_quote', 'guide_points', 'branches_eyebrow', 'branches_title',
  'branches_description', 'form_eyebrow', 'form_title', 'form_description', 'services', 'hero_primary_label', 'hero_primary_url', 'hero_secondary_label', 'hero_secondary_url',
  'hotline_label', 'email_label', 'hours_label', 'hours_value', 'branch_call_label', 'branch_directions_label', 'form_name_label', 'form_phone_label', 'form_service_label',
  'form_branch_label', 'form_message_label', 'form_submit_label', 'form_success_message', 'privacy_note', 'seo_title', 'seo_description',
].map((key) => [key, ''])) as ContentForm

const iconOptions = ['sparkles', 'heart-handshake', 'shield-check', 'badge-check', 'headphones', 'map-pin', 'messages-square']

function toForm(content?: ContactPageContent, seo?: { title?: string | null; description?: string | null }): ContentForm {
  const settings = content?.settings ?? {}
  return {
    ...emptyForm,
    hero_eyebrow: content?.hero_eyebrow ?? '', hero_title: content?.hero_title ?? '', hero_description: content?.hero_description ?? '', hero_image_alt: content?.hero_image_alt ?? '',
    contact_eyebrow: content?.contact_eyebrow ?? '', contact_title: content?.contact_title ?? '', contact_description: content?.contact_description ?? '',
    commitments_eyebrow: content?.commitments_eyebrow ?? '', commitments_title: content?.commitments_title ?? '', commitments_description: content?.commitments_description ?? '',
    guide_eyebrow: content?.guide_eyebrow ?? '', guide_title: content?.guide_title ?? '', guide_description: content?.guide_description ?? '', guide_image_alt: content?.guide_image_alt ?? '',
    guide_quote: content?.guide_quote ?? '', guide_points: settings.guide_points?.join('\n') ?? '', branches_eyebrow: content?.branches_eyebrow ?? '', branches_title: content?.branches_title ?? '',
    branches_description: content?.branches_description ?? '', form_eyebrow: content?.form_eyebrow ?? '', form_title: content?.form_title ?? '', form_description: content?.form_description ?? '',
    services: settings.services?.join('\n') ?? '', hero_primary_label: settings.hero_primary_label ?? '', hero_primary_url: settings.hero_primary_url ?? '',
    hero_secondary_label: settings.hero_secondary_label ?? '', hero_secondary_url: settings.hero_secondary_url ?? '', hotline_label: settings.hotline_label ?? '', email_label: settings.email_label ?? '',
    hours_label: settings.hours_label ?? '', hours_value: settings.hours_value ?? '', branch_call_label: settings.branch_call_label ?? '', branch_directions_label: settings.branch_directions_label ?? '',
    form_name_label: settings.form_name_label ?? '', form_phone_label: settings.form_phone_label ?? '', form_service_label: settings.form_service_label ?? '', form_branch_label: settings.form_branch_label ?? '',
    form_message_label: settings.form_message_label ?? '', form_submit_label: settings.form_submit_label ?? '', form_success_message: settings.form_success_message ?? '', privacy_note: settings.privacy_note ?? '',
    seo_title: seo?.title ?? '', seo_description: seo?.description ?? '',
  }
}

function Field({ label, name, value, setValue, multiline = false }: { label: string; name: FormField; value: string; setValue: (name: FormField, value: string) => void; multiline?: boolean }) {
  return <label><span className="label">{label}</span>{multiline ? <textarea className="input" rows={4} value={value} onChange={(event) => setValue(name, event.target.value)} /> : <input className="input" value={value} onChange={(event) => setValue(name, event.target.value)} />}</label>
}

function ImageControl({ slot, label, path, alt }: { slot: 'hero' | 'guide'; label: string; path?: string | null; alt?: string | null }) {
  const client = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0]
    if (!image) return
    const body = new FormData(); body.append('image', image)
    setUploading(true)
    try { await apiClient.post(`/admin/contact-page/images/${slot}`, body); await client.invalidateQueries({ queryKey: ['admin-contact-page'] }); toast.success('Đã tải ảnh.') }
    catch { toast.error('Không thể tải ảnh.') }
    finally { setUploading(false); event.target.value = '' }
  }
  const remove = async () => {
    try { await apiClient.delete(`/admin/contact-page/images/${slot}`); await client.invalidateQueries({ queryKey: ['admin-contact-page'] }); toast.success('Đã xóa ảnh.') }
    catch { toast.error('Không thể xóa ảnh.') }
  }
  return <div className="rounded-2xl border border-slate-200 p-4"><span className="label">{label}</span>{path ? <div className="relative overflow-hidden rounded-xl border bg-slate-50"><img className="h-44 w-full object-cover" src={path} alt={alt ?? ''} /><button type="button" className="absolute right-2 top-2 rounded-full bg-white p-2 text-red-700 shadow" aria-label={`Xóa ${label}`} onClick={() => void remove()}><X size={16} /></button></div> : <div className="grid h-36 place-items-center rounded-xl border border-dashed border-slate-300 text-slate-400"><ImagePlus /></div>}<label className="btn-secondary mt-3 cursor-pointer justify-center"><ImagePlus size={16} />{uploading ? 'Đang tải...' : 'Chọn ảnh'}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={upload} /></label></div>
}

function CommitmentsEditor({ items, onChange }: { items: ContactCommitment[]; onChange: (items: ContactCommitment[]) => void }) {
  const update = (index: number, patch: Partial<ContactCommitment>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  return <div className="grid gap-3">
    {items.map((item, index) => <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[180px_1fr_1fr_auto]">
      <label><span className="label">Icon</span><select className="input" value={item.icon ?? 'sparkles'} onChange={(event) => update(index, { icon: event.target.value })}>{iconOptions.map((icon) => <option key={icon}>{icon}</option>)}</select></label>
      <label><span className="label">Tiêu đề</span><input className="input" value={item.title} onChange={(event) => update(index, { title: event.target.value })} /></label>
      <label><span className="label">Mô tả</span><input className="input" value={item.description ?? ''} onChange={(event) => update(index, { description: event.target.value })} /></label>
      <button type="button" className="btn-secondary self-end px-3 text-red-700" aria-label={`Xóa cam kết ${index + 1}`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button>
    </div>)}
    <button type="button" className="btn-secondary justify-self-start" onClick={() => onChange([...items, { icon: 'sparkles', title: '', description: '' }])}><Plus size={16} />Thêm cam kết</button>
  </div>
}

export function ContactPageAdminPage() {
  const query = useQuery({ queryKey: ['admin-contact-page'], queryFn: getAdminContactPage })
  const client = useQueryClient()
  const [form, setForm] = useState<ContentForm>(emptyForm)
  const [commitments, setCommitments] = useState<ContactCommitment[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!query.data) return
    setForm(toForm(query.data.content, query.data.seo ?? undefined))
    setCommitments(query.data.content.settings?.commitments ?? [])
  }, [query.data])

  if (query.isLoading || !query.data) return <LoadingState />
  const setValue = (name: FormField, value: string) => setForm((current) => ({ ...current, [name]: value }))
  const lines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      await updateContactPage({
        hero_eyebrow: form.hero_eyebrow, hero_title: form.hero_title, hero_description: form.hero_description, hero_image_alt: form.hero_image_alt,
        contact_eyebrow: form.contact_eyebrow, contact_title: form.contact_title, contact_description: form.contact_description,
        commitments_eyebrow: form.commitments_eyebrow, commitments_title: form.commitments_title, commitments_description: form.commitments_description,
        guide_eyebrow: form.guide_eyebrow, guide_title: form.guide_title, guide_description: form.guide_description, guide_image_alt: form.guide_image_alt, guide_quote: form.guide_quote,
        branches_eyebrow: form.branches_eyebrow, branches_title: form.branches_title, branches_description: form.branches_description,
        form_eyebrow: form.form_eyebrow, form_title: form.form_title, form_description: form.form_description,
        settings: {
          hero_primary_label: form.hero_primary_label, hero_primary_url: form.hero_primary_url, hero_secondary_label: form.hero_secondary_label, hero_secondary_url: form.hero_secondary_url,
          hotline_label: form.hotline_label, email_label: form.email_label, hours_label: form.hours_label, hours_value: form.hours_value,
          branch_call_label: form.branch_call_label, branch_directions_label: form.branch_directions_label, form_name_label: form.form_name_label, form_phone_label: form.form_phone_label,
          form_service_label: form.form_service_label, form_branch_label: form.form_branch_label, form_message_label: form.form_message_label, form_submit_label: form.form_submit_label,
          form_success_message: form.form_success_message, privacy_note: form.privacy_note, services: lines(form.services), commitments, guide_points: lines(form.guide_points),
        },
        seo: { title: form.seo_title, description: form.seo_description },
      })
      await client.invalidateQueries({ queryKey: ['admin-contact-page'] })
      await client.invalidateQueries({ queryKey: ['contact-page'] })
      toast.success('Đã lưu trang liên hệ.')
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Không thể lưu trang liên hệ.')
    } finally { setSaving(false) }
  }

  const content = query.data.content
  return <div className="grid gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-black">Trang liên hệ</h1><p className="muted mt-1">Quản lý nội dung riêng của trang; hotline, email và địa điểm được đồng bộ từ dữ liệu dùng chung.</p></div><Link className="btn-secondary" to="/lien-he" target="_blank">Xem trang <ExternalLink size={16} /></Link></div>
    <div className="card flex flex-wrap items-center justify-between gap-3 p-4"><p className="muted text-sm">Cần đổi hotline/email hoặc địa chỉ chi nhánh?</p><div className="flex flex-wrap gap-2"><Link className="btn-secondary" to="/admin/settings">Cài đặt cửa hàng</Link><Link className="btn-secondary" to="/admin/branches">Quản lý chi nhánh</Link></div></div>
    <form className="grid gap-6" onSubmit={save}>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">Hero đầu trang</h2></div><Field label="Nhãn nhỏ" name="hero_eyebrow" value={form.hero_eyebrow} setValue={setValue} /><Field label="Tiêu đề" name="hero_title" value={form.hero_title} setValue={setValue} /><div className="md:col-span-2"><Field label="Mô tả" name="hero_description" value={form.hero_description} setValue={setValue} multiline /></div><Field label="Nút chính" name="hero_primary_label" value={form.hero_primary_label} setValue={setValue} /><Field label="URL nút chính" name="hero_primary_url" value={form.hero_primary_url} setValue={setValue} /><Field label="Nút phụ" name="hero_secondary_label" value={form.hero_secondary_label} setValue={setValue} /><Field label="URL nút phụ" name="hero_secondary_url" value={form.hero_secondary_url} setValue={setValue} /><Field label="Alt ảnh hero" name="hero_image_alt" value={form.hero_image_alt} setValue={setValue} /><ImageControl slot="hero" label="Ảnh hero" path={content.hero_image_path} alt={content.hero_image_alt} /></section>
      <section className="card grid gap-4 p-5 md:grid-cols-3"><div className="md:col-span-3"><h2 className="text-xl font-black">Thông tin liên hệ</h2></div><Field label="Nhãn nhỏ" name="contact_eyebrow" value={form.contact_eyebrow} setValue={setValue} /><Field label="Tiêu đề" name="contact_title" value={form.contact_title} setValue={setValue} /><div className="md:col-span-3"><Field label="Mô tả" name="contact_description" value={form.contact_description} setValue={setValue} multiline /></div><Field label="Nhãn hotline" name="hotline_label" value={form.hotline_label} setValue={setValue} /><Field label="Nhãn email" name="email_label" value={form.email_label} setValue={setValue} /><Field label="Nhãn thời gian" name="hours_label" value={form.hours_label} setValue={setValue} /><div className="md:col-span-3"><Field label="Thời gian phục vụ" name="hours_value" value={form.hours_value} setValue={setValue} /></div></section>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">Khối cam kết</h2></div><Field label="Nhãn nhỏ" name="commitments_eyebrow" value={form.commitments_eyebrow} setValue={setValue} /><Field label="Tiêu đề" name="commitments_title" value={form.commitments_title} setValue={setValue} /><div className="md:col-span-2"><Field label="Mô tả" name="commitments_description" value={form.commitments_description} setValue={setValue} multiline /><div className="mt-4"><CommitmentsEditor items={commitments} onChange={setCommitments} /></div></div></section>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">Bản tin hướng dẫn nhận diện</h2></div><Field label="Nhãn nhỏ" name="guide_eyebrow" value={form.guide_eyebrow} setValue={setValue} /><Field label="Tiêu đề" name="guide_title" value={form.guide_title} setValue={setValue} /><div className="md:col-span-2"><Field label="Mô tả" name="guide_description" value={form.guide_description} setValue={setValue} multiline /></div><Field label="Alt ảnh hướng dẫn" name="guide_image_alt" value={form.guide_image_alt} setValue={setValue} /><ImageControl slot="guide" label="Ảnh hướng dẫn" path={content.guide_image_path} alt={content.guide_image_alt} /><div className="md:col-span-2"><Field label="Các lưu ý (mỗi dòng một ý)" name="guide_points" value={form.guide_points} setValue={setValue} multiline /><div className="mt-4"><Field label="Lời nhắn cuối khối" name="guide_quote" value={form.guide_quote} setValue={setValue} multiline /></div></div></section>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">Khối địa điểm</h2></div><Field label="Nhãn nhỏ" name="branches_eyebrow" value={form.branches_eyebrow} setValue={setValue} /><Field label="Tiêu đề" name="branches_title" value={form.branches_title} setValue={setValue} /><div className="md:col-span-2"><Field label="Mô tả" name="branches_description" value={form.branches_description} setValue={setValue} multiline /></div><Field label="Nhãn gọi cửa hàng" name="branch_call_label" value={form.branch_call_label} setValue={setValue} /><Field label="Nhãn chỉ đường" name="branch_directions_label" value={form.branch_directions_label} setValue={setValue} /></section>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">Biểu mẫu tư vấn</h2></div><Field label="Nhãn nhỏ" name="form_eyebrow" value={form.form_eyebrow} setValue={setValue} /><Field label="Tiêu đề" name="form_title" value={form.form_title} setValue={setValue} /><div className="md:col-span-2"><Field label="Mô tả" name="form_description" value={form.form_description} setValue={setValue} multiline /></div><Field label="Nhãn họ tên" name="form_name_label" value={form.form_name_label} setValue={setValue} /><Field label="Nhãn số điện thoại" name="form_phone_label" value={form.form_phone_label} setValue={setValue} /><Field label="Nhãn dịch vụ" name="form_service_label" value={form.form_service_label} setValue={setValue} /><Field label="Nhãn chi nhánh" name="form_branch_label" value={form.form_branch_label} setValue={setValue} /><Field label="Nhãn ghi chú" name="form_message_label" value={form.form_message_label} setValue={setValue} /><Field label="Nhãn nút gửi" name="form_submit_label" value={form.form_submit_label} setValue={setValue} /><div className="md:col-span-2"><Field label="Thông báo gửi thành công" name="form_success_message" value={form.form_success_message} setValue={setValue} /><div className="mt-4"><Field label="Ghi chú bảo mật dưới form" name="privacy_note" value={form.privacy_note} setValue={setValue} /></div><div className="mt-4"><Field label="Danh sách dịch vụ (mỗi dòng một mục)" name="services" value={form.services} setValue={setValue} multiline /></div></div></section>
      <section className="card grid gap-4 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-black">SEO</h2></div><Field label="SEO title" name="seo_title" value={form.seo_title} setValue={setValue} /><Field label="Meta description" name="seo_description" value={form.seo_description} setValue={setValue} /></section>
      <button className="btn-primary justify-self-start" disabled={saving}><Save size={18} />{saving ? 'Đang lưu...' : 'Lưu trang liên hệ'}</button>
    </form>
  </div>
}
