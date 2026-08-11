import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, ImagePlus, Loader2, Save, Trash2, X } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { AdminImageCropDialog } from '../../components/admin/HomeImageCropEditor'
import { LoadingState } from '../../components/common/LoadingState'
import { ABOUT_MEDIA, type AboutImageSectionType } from '../../config/aboutMedia'
import { ABOUT_SECTION_ICONS } from '../../data/aboutContent'
import { buildAboutSectionSettings } from '../../features/admin/aboutSettings'
import type { AboutSection, AboutSectionItem, AboutSectionType, ApiResponse, PageSeo } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

const sectionTypeLabels: Record<string, string> = { hero: 'Hero', rich_text_image: 'Nội dung + ảnh', timeline: 'Timeline', showcase: 'Showcase', cards: 'Thẻ giá trị', goals: 'Mục tiêu', testimonials: 'Testimonial', cta: 'CTA cuối trang' }
const sectionKeyLabels: Record<string, string> = { hero: 'Hero thương hiệu', introduction: 'Giới thiệu thương hiệu', 'story-empathy': 'Câu chuyện: đồng cảm', 'story-journey': 'Câu chuyện: hành trình', process: 'Quy trình', direction: 'Định hướng', commitments: 'Cam kết', goals: 'Mục tiêu dài hạn', testimonials: 'Testimonial', 'final-cta': 'CTA cuối trang' }
const listSectionTypes = ['timeline', 'showcase', 'cards', 'goals', 'testimonials']

type SectionErrors = Record<string, string[]>

function fieldError(errors: SectionErrors, name: string) {
  return errors[name]?.[0] ? <span className="text-sm font-semibold text-red-700">{errors[name][0]}</span> : null
}

function ItemsEditor({ items, onChange, sectionType }: { items: AboutSectionItem[]; onChange: (items: AboutSectionItem[]) => void; sectionType: AboutSectionType }) {
  const update = (index: number, patch: Partial<AboutSectionItem>) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const isTestimonial = sectionType === 'testimonials'
  return <div className="grid gap-3">
    {items.map((item, index) => <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 p-3 md:grid-cols-2">
      {isTestimonial ? <>
        <label className="md:col-span-2"><span className="label">Chia sẻ</span><textarea className="input" value={item.quote ?? ''} onChange={(event) => update(index, { quote: event.target.value })} /></label>
        <label><span className="label">Tên hiển thị</span><input className="input" value={item.name ?? ''} onChange={(event) => update(index, { name: event.target.value })} /></label>
        <label><span className="label">Vai trò</span><input className="input" value={item.role ?? ''} onChange={(event) => update(index, { role: event.target.value })} /></label>
        <label><span className="label">Đánh giá</span><input className="input" type="number" min="1" max="5" value={item.rating ?? 5} onChange={(event) => update(index, { rating: Number(event.target.value) })} /></label>
      </> : <>
        <label><span className="label">Icon</span><select className="input" value={item.icon ?? 'sparkles'} onChange={(event) => update(index, { icon: event.target.value })}>{ABOUT_SECTION_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></label>
        <label><span className="label">Tiêu đề</span><input className="input" value={item.title ?? ''} onChange={(event) => update(index, { title: event.target.value })} /></label>
        <label className="md:col-span-2"><span className="label">Mô tả</span><textarea className="input" value={item.description ?? ''} onChange={(event) => update(index, { description: event.target.value })} /></label>
      </>}
      <button type="button" className="btn-secondary justify-self-start px-3 text-red-700" aria-label={`Xóa mục ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 size={16} />Xóa mục</button>
    </div>)}
    <button type="button" className="btn-secondary justify-self-start" onClick={() => onChange([...items, isTestimonial ? { quote: '', name: '', role: '', rating: 5 } : { icon: 'sparkles', title: '', description: '' }])}>Thêm mục</button>
  </div>
}

function StepsEditor({ steps, onChange }: { steps: AboutSectionItem[]; onChange: (steps: AboutSectionItem[]) => void }) {
  const update = (index: number, patch: Partial<AboutSectionItem>) => onChange(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)))
  return <div className="grid gap-3">
    {steps.map((step, index) => <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 p-3 md:grid-cols-[160px_1fr_auto]">
      <label><span className="label">Nhãn bước</span><input className="input" value={step.label ?? ''} onChange={(event) => update(index, { label: event.target.value })} /></label>
      <label><span className="label">Nội dung bước</span><input className="input" value={step.title ?? ''} onChange={(event) => update(index, { title: event.target.value })} /></label>
      <button type="button" className="btn-secondary self-end px-3 text-red-700" aria-label={`Xóa bước ${index + 1}`} onClick={() => onChange(steps.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
    </div>)}
    <button type="button" className="btn-secondary justify-self-start" onClick={() => onChange([...steps, { label: '', title: '' }])}>Thêm bước</button>
  </div>
}

function SectionForm({ section, onClose }: { section: AboutSection; onClose: () => void }) {
  const client = useQueryClient()
  const [errors, setErrors] = useState<SectionErrors>({})
  const [items, setItems] = useState<AboutSectionItem[]>(section.settings?.items ?? [])
  const [steps, setSteps] = useState<AboutSectionItem[]>(section.settings?.steps ?? [])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null)
  const [imageSelectionError, setImageSelectionError] = useState('')
  const [uploading, setUploading] = useState(false)
  const hasItems = listSectionTypes.includes(section.section_type)
  const imageCrop = ABOUT_MEDIA[section.section_type as AboutImageSectionType]

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await apiClient.put<ApiResponse<AboutSection>>(`/admin/about/sections/${section.id}`, payload)).data,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['admin-about'] }); toast.success('Đã lưu section.') },
    onError: (error: any) => { setErrors(error.response?.data?.errors ?? {}); toast.error(error.response?.data?.message ?? 'Không thể lưu section.') },
  })

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setImageSelectionError('Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB.')
      return
    }
    setImageSelectionError('')
    setCropSourceFile(file)
  }

  const confirmCrop = (file: File) => {
    setCropSourceFile(null)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    const form = new FormData(event.currentTarget)
    const payload: Record<string, unknown> = {
      eyebrow: String(form.get('eyebrow') ?? '') || null,
      title: String(form.get('title') ?? '') || null,
      subtitle: String(form.get('subtitle') ?? '') || null,
      body: String(form.get('body') ?? '') || null,
      image_alt: String(form.get('image_alt') ?? '') || null,
      cta_label: String(form.get('cta_label') ?? '') || null,
      cta_url: String(form.get('cta_url') ?? '') || null,
      sort_order: Number(form.get('sort_order') ?? 0),
      is_active: form.get('is_active') === 'on',
      settings: buildAboutSectionSettings(section, {
        secondaryCtaLabel: String(form.get('secondary_cta_label') ?? ''),
        secondaryCtaUrl: String(form.get('secondary_cta_url') ?? ''),
        imageBadge: String(form.get('image_badge') ?? ''),
        layout: form.get('layout') === 'image-right' ? 'image-right' : 'image-left',
        quote: String(form.get('quote') ?? ''),
        captionTitle: String(form.get('caption_title') ?? ''),
        captionSubtitle: String(form.get('caption_subtitle') ?? ''),
        trustItems: String(form.get('trust_items') ?? ''),
        pills: String(form.get('pills') ?? ''),
        floatingCardTitle: String(form.get('floating_card_title') ?? ''),
        floatingCardSubtitle: String(form.get('floating_card_subtitle') ?? ''),
      }, items, steps),
    }
    try {
      if (imageFile) {
        setUploading(true)
        const data = new FormData()
        data.append('image', imageFile)
        await apiClient.post(`/admin/about/sections/${section.id}/image`, data)
      }
      await mutation.mutateAsync(payload)
      onClose()
    } catch { /* handled by mutation onError */ } finally { setUploading(false) }
  }

  const removeImage = async () => {
    try {
      await apiClient.delete(`/admin/about/sections/${section.id}/image`)
      await client.invalidateQueries({ queryKey: ['admin-about'] })
      toast.success('Đã xóa ảnh section.')
    } catch { toast.error('Không thể xóa ảnh.') }
  }

  return <form className="card grid gap-4 p-5" onSubmit={save}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-black">Chỉnh sửa: {sectionKeyLabels[section.section_key] ?? section.section_key}</h2>
      <button type="button" className="btn-secondary px-3" onClick={onClose} aria-label="Đóng form chỉnh sửa"><X size={17} /></button>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <label><span className="label">Eyebrow</span><input className="input" name="eyebrow" defaultValue={section.eyebrow ?? ''} />{fieldError(errors, 'eyebrow')}</label>
      <label><span className="label">Thứ tự hiển thị</span><input className="input" name="sort_order" type="number" min="0" defaultValue={section.sort_order} />{fieldError(errors, 'sort_order')}</label>
      <label className="md:col-span-2"><span className="label">Tiêu đề</span><input className="input" name="title" defaultValue={section.title ?? ''} />{fieldError(errors, 'title')}</label>
      <label className="md:col-span-2"><span className="label">Subtitle</span><textarea className="input" name="subtitle" defaultValue={section.subtitle ?? ''} />{fieldError(errors, 'subtitle')}</label>
      <label className="md:col-span-2"><span className="label">Nội dung (mỗi đoạn cách nhau một dòng trống)</span><textarea className="input min-h-28" name="body" defaultValue={section.body ?? ''} />{fieldError(errors, 'body')}</label>
      <label><span className="label">CTA chính</span><input className="input" name="cta_label" defaultValue={section.cta_label ?? ''} />{fieldError(errors, 'cta_label')}</label>
      <label><span className="label">CTA URL</span><input className="input" name="cta_url" defaultValue={section.cta_url ?? ''} placeholder="/san-pham" />{fieldError(errors, 'cta_url')}</label>
      <label><span className="label">CTA phụ</span><input className="input" name="secondary_cta_label" defaultValue={section.settings?.secondary_cta_label ?? ''} /></label>
      <label><span className="label">CTA phụ URL</span><input className="input" name="secondary_cta_url" defaultValue={section.settings?.secondary_cta_url ?? ''} placeholder="/lien-he" /></label>
      <label><span className="label">Alt text ảnh</span><input className="input" name="image_alt" defaultValue={section.image_alt ?? ''} />{fieldError(errors, 'image_alt')}</label>
      <label className="flex items-end gap-2 pb-2"><input type="checkbox" name="is_active" defaultChecked={section.is_active ?? true} /> Đang hiển thị</label>
    </div>
    {imageCrop && <div className="grid gap-3 rounded-2xl border border-dashed border-slate-300 p-4">
      <span className="label">Ảnh section</span>
      <p className="muted text-sm">Khung hiển thị: {imageCrop.label}. Ảnh tỷ lệ bất kỳ sẽ được cắt để fill đầy khung, không kéo giãn hay làm đổi kích thước bố cục.</p>
      <div className="flex flex-wrap items-center gap-4">
        {(imagePreview || section.image_path) && <div className="about-image-admin-preview" style={{ aspectRatio: `${imageCrop.width} / ${imageCrop.height}` }}><img src={imagePreview ?? resolveAssetUrl(section.image_path)} alt={section.image_alt ?? 'Ảnh section'} /></div>}
        <label className="btn-secondary"><ImagePlus size={17} />Chọn và cắt ảnh<input className="hidden" aria-label={`Chọn ảnh ${sectionKeyLabels[section.section_key] ?? section.section_key}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /></label>
        {section.image_path && <button type="button" className="btn-secondary text-red-700" onClick={removeImage}><Trash2 size={16} />Xóa ảnh</button>}
      </div>
      {imageSelectionError && <p className="text-sm font-semibold text-red-700">{imageSelectionError}</p>}
      {imageFile && <p className="text-sm font-semibold text-slate-600">Ảnh đã cắt sẽ được tải lên khi lưu: {imageFile.name}</p>}
      {cropSourceFile && <AdminImageCropDialog file={cropSourceFile} title={sectionKeyLabels[section.section_key] ?? section.section_key} crop={imageCrop} onCancel={() => setCropSourceFile(null)} onConfirm={confirmCrop} />}
    </div>}
    {section.section_type === 'hero' && <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
      <label><span className="label">Nhãn trên ảnh</span><input className="input" name="image_badge" defaultValue={section.settings?.image_badge ?? ''} /></label>
      <label className="md:col-span-2"><span className="label">Điểm tin cậy (mỗi dòng một mục)</span><textarea className="input min-h-28" name="trust_items" defaultValue={(section.settings?.trust_items ?? []).join('\n')} /></label>
    </div>}
    {section.section_type === 'rich_text_image' && <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
      <label><span className="label">Vị trí ảnh</span><select className="input" name="layout" defaultValue={section.settings?.layout ?? 'image-left'}><option value="image-left">Ảnh bên trái</option><option value="image-right">Ảnh bên phải</option></select></label>
      <label className="md:col-span-2"><span className="label">Trích dẫn nổi bật</span><textarea className="input" name="quote" defaultValue={section.settings?.quote ?? ''} /></label>
      <label className="md:col-span-2"><span className="label">Nhãn ngắn (mỗi dòng một mục)</span><textarea className="input" name="pills" defaultValue={(section.settings?.pills ?? []).join('\n')} /></label>
      <label><span className="label">Tiêu đề thẻ nổi</span><input className="input" name="floating_card_title" defaultValue={section.settings?.floating_card?.title ?? ''} /></label>
      <label><span className="label">Mô tả thẻ nổi</span><input className="input" name="floating_card_subtitle" defaultValue={section.settings?.floating_card?.subtitle ?? ''} /></label>
      <div className="md:col-span-2"><span className="label">Các bước hiển thị</span><StepsEditor steps={steps} onChange={setSteps} /></div>
    </div>}
    {section.section_type === 'showcase' && <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
      <label><span className="label">Tiêu đề chú thích ảnh</span><input className="input" name="caption_title" defaultValue={section.settings?.caption_title ?? ''} /></label>
      <label><span className="label">Mô tả chú thích ảnh</span><input className="input" name="caption_subtitle" defaultValue={section.settings?.caption_subtitle ?? ''} /></label>
    </div>}
    {hasItems && <div><span className="label">Danh sách mục hiển thị</span><ItemsEditor items={items} onChange={setItems} sectionType={section.section_type} /></div>}
    <div className="flex flex-wrap gap-2">
      <button className="btn-primary" disabled={mutation.isPending || uploading}>{mutation.isPending || uploading ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}Lưu section</button>
      <a className="btn-secondary" href="/gioi-thieu" target="_blank" rel="noreferrer">Xem trang public <ExternalLink size={16} /></a>
    </div>
  </form>
}

function SeoCard({ seos }: { seos: PageSeo[] }) {
  const client = useQueryClient()
  const saveSeo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await Promise.all(seos.map((seo) => apiClient.put(`/admin/about/seos/${seo.page_key}`, {
        title: String(form.get(`title_${seo.page_key}`) ?? ''),
        description: String(form.get(`description_${seo.page_key}`) ?? '') || null,
      })))
      await client.invalidateQueries({ queryKey: ['admin-about-seos'] })
      toast.success('Đã lưu SEO trang.')
    } catch { toast.error('Không thể lưu SEO.') }
  }
  return <form className="card mt-6 grid gap-4 p-5" onSubmit={saveSeo}>
    <div><h2 className="text-xl font-black">SEO trang</h2><p className="muted text-sm">Tiêu đề và mô tả hiển thị trên công cụ tìm kiếm cho /gioi-thieu và /tin-tuc.</p></div>
    {seos.map((seo) => <div key={seo.page_key} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
      <strong className="md:col-span-2">/{seo.page_key}</strong>
      <label><span className="label">SEO title</span><input className="input" name={`title_${seo.page_key}`} defaultValue={seo.title} required /></label>
      <label><span className="label">Meta description</span><input className="input" name={`description_${seo.page_key}`} defaultValue={seo.description ?? ''} /></label>
    </div>)}
    <button className="btn-primary justify-self-start"><Save size={17} />Lưu SEO</button>
  </form>
}

export function AboutAdminPage() {
  const client = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const sectionsQuery = useQuery({ queryKey: ['admin-about'], queryFn: async () => (await apiClient.get<ApiResponse<AboutSection[]>>('/admin/about/sections')).data.data })
  const seosQuery = useQuery({ queryKey: ['admin-about-seos'], queryFn: async () => (await apiClient.get<ApiResponse<PageSeo[]>>('/admin/about/seos')).data.data })

  const toggle = async (section: AboutSection) => {
    try {
      await apiClient.patch(`/admin/about/sections/${section.id}/status`, { is_active: !section.is_active })
      await client.invalidateQueries({ queryKey: ['admin-about'] })
      toast.success(section.is_active ? 'Đã ẩn section.' : 'Đã hiển thị section.')
    } catch { toast.error('Không thể đổi trạng thái.') }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const sections = sectionsQuery.data
    if (!sections) return
    const next = [...sections]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    try {
      await apiClient.patch('/admin/about/reorder', { order: next.map((section) => section.id) })
      await client.invalidateQueries({ queryKey: ['admin-about'] })
      toast.success('Đã cập nhật thứ tự section.')
    } catch { toast.error('Không thể sắp xếp lại.') }
  }

  if (sectionsQuery.isLoading) return <LoadingState />
  const sections = sectionsQuery.data ?? []

  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black">Câu chuyện thương hiệu</h1><p className="muted">Nội dung tại đây hiển thị trên trang <a className="font-bold text-emerald-800 underline" href="/gioi-thieu" target="_blank" rel="noreferrer">/gioi-thieu</a>.</p></div>
      <a className="btn-secondary" href="/gioi-thieu" target="_blank" rel="noreferrer"><ExternalLink size={17} />Xem trang public</a>
    </div>
    <section className="grid gap-3">
      {sections.map((section, index) => <article key={section.id} className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {section.image_path ? <img src={resolveAssetUrl(section.image_path)} alt={section.image_alt ?? ''} className="h-14 w-20 rounded-xl object-cover" /> : <span className="grid h-14 w-20 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400">Không ảnh</span>}
          <div className="min-w-0 flex-1">
            <strong>{sectionKeyLabels[section.section_key] ?? section.section_key}</strong>
            <div className="muted text-sm">{sectionTypeLabels[section.section_type] ?? section.section_type} · Thứ tự {section.sort_order} · {section.is_active ? 'Đang hiển thị' : 'Đang ẩn'}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary px-3" aria-label={`Di chuyển lên ${section.section_key}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
            <button className="btn-secondary px-3" aria-label={`Di chuyển xuống ${section.section_key}`} disabled={index === sections.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
            <button className="btn-secondary px-3" aria-label={section.is_active ? `Ẩn ${section.section_key}` : `Hiện ${section.section_key}`} onClick={() => toggle(section)}>{section.is_active ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            <button className="btn-secondary" onClick={() => setEditingId(editingId === section.id ? null : (section.id ?? null))}>Chỉnh sửa</button>
          </div>
        </div>
        {editingId === section.id && <div className="mt-4"><SectionForm section={section} onClose={() => setEditingId(null)} /></div>}
      </article>)}
    </section>
    {seosQuery.data && <SeoCard seos={seosQuery.data} />}
  </div>
}
