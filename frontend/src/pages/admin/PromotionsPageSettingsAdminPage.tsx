import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { deletePromotionsCtaImage, getAdminPromotionsPage, updatePromotionsPageContent, uploadPromotionsCtaImage } from '../../api/contentApi'
import { LoadingState } from '../../components/common/LoadingState'
import { fallbackPromotionContent } from '../../data/promotionsContent'
import type { NewsPageContent } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

interface FormState {
  eyebrow: string; title: string; description: string; featured_article_id: string; featured_badge_label: string
  list_eyebrow: string; list_title: string; list_description: string; show_cta: boolean
  cta_eyebrow: string; cta_title: string; cta_description: string; cta_primary_label: string; cta_primary_url: string
  cta_secondary_label: string; cta_secondary_url: string; cta_image_alt: string; seo_title: string; seo_description: string
}

const text = (value?: string | null) => value ?? ''
const toFormState = (content?: NewsPageContent, seo?: { title?: string | null; description?: string | null }): FormState => ({
  eyebrow: text(content?.eyebrow ?? fallbackPromotionContent.eyebrow), title: text(content?.title ?? fallbackPromotionContent.title), description: text(content?.description ?? fallbackPromotionContent.description), featured_article_id: content?.featured_article_id ? String(content.featured_article_id) : '', featured_badge_label: text(content?.featured_badge_label ?? fallbackPromotionContent.featured_badge_label),
  list_eyebrow: text(content?.list_eyebrow ?? fallbackPromotionContent.list_eyebrow), list_title: text(content?.list_title ?? fallbackPromotionContent.list_title), list_description: text(content?.list_description ?? fallbackPromotionContent.list_description), show_cta: content?.show_cta ?? true,
  cta_eyebrow: text(content?.cta_eyebrow ?? fallbackPromotionContent.cta_eyebrow), cta_title: text(content?.cta_title ?? fallbackPromotionContent.cta_title), cta_description: text(content?.cta_description ?? fallbackPromotionContent.cta_description), cta_primary_label: text(content?.cta_primary_label ?? fallbackPromotionContent.cta_primary_label), cta_primary_url: text(content?.cta_primary_url ?? fallbackPromotionContent.cta_primary_url), cta_secondary_label: text(content?.cta_secondary_label ?? fallbackPromotionContent.cta_secondary_label), cta_secondary_url: text(content?.cta_secondary_url ?? fallbackPromotionContent.cta_secondary_url), cta_image_alt: text(content?.cta_image_alt), seo_title: text(seo?.title ?? content?.title ?? fallbackPromotionContent.title), seo_description: text(seo?.description ?? content?.description ?? fallbackPromotionContent.description),
})

export function PromotionsPageSettingsAdminPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-promotions-page'], queryFn: getAdminPromotionsPage })
  const [form, setForm] = useState<FormState>(toFormState())
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { if (query.data) setForm(toFormState(query.data.content, query.data.seo)) }, [query.data])
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])
  const selectedArticle = useMemo(() => query.data?.articles.find((article) => article.id === Number(form.featured_article_id)), [form.featured_article_id, query.data?.articles])
  const setField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => setForm((current) => ({ ...current, [key]: value }))
  const errorFor = (name: string) => errors[name]?.[0] ? <span className='mt-1 block text-sm font-semibold text-red-700'>{errors[name][0]}</span> : null
  const save = useMutation({ mutationFn: () => updatePromotionsPageContent({ ...form, featured_article_id: form.featured_article_id ? Number(form.featured_article_id) : null, seo: { title: form.seo_title || null, description: form.seo_description || null } }), onError: (error: any) => { setErrors(error.response?.data?.errors ?? {}); toast.error(error.response?.data?.message ?? 'Không thể lưu thiết lập trang ưu đãi.') } })

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    const file = event.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setErrors({})
    try { await save.mutateAsync(); if (imageFile) { setUploading(true); await uploadPromotionsCtaImage(imageFile); setImageFile(null); setImagePreview(null) }; await Promise.all([client.invalidateQueries({ queryKey: ['admin-promotions-page'] }), client.invalidateQueries({ queryKey: ['promotions-page'] })]); toast.success('Đã lưu thiết lập trang ưu đãi.') } catch { /* handled */ } finally { setUploading(false) }
  }

  const removeImage = async () => {
    try { await deletePromotionsCtaImage(); await Promise.all([client.invalidateQueries({ queryKey: ['admin-promotions-page'] }), client.invalidateQueries({ queryKey: ['promotions-page'] })]); toast.success('Đã xóa ảnh CTA.') } catch { toast.error('Không thể xóa ảnh CTA.') }
  }

  if (query.isLoading || !query.data) return <LoadingState />
  const currentImage = imagePreview ?? (query.data.content.cta_image_path ? resolveAssetUrl(query.data.content.cta_image_path) : null)

  return <div>
    <div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-3xl font-black'>Thiết lập trang ưu đãi</h1><p className='muted'>Chỉnh nội dung giới thiệu, bài nổi bật, CTA, hình ảnh và SEO tại /uu-dai.</p></div><div className='flex gap-2'><Link className='btn-secondary' to='/admin/promotions'>Quay lại</Link><a className='btn-secondary' href='/uu-dai' target='_blank' rel='noreferrer'>Xem trang <ExternalLink size={16} /></a></div></div>
    <form className='grid gap-5' onSubmit={submit}>
      <SettingsSection title='Phần mở đầu'><TextInput label='Eyebrow' value={form.eyebrow} onChange={(value) => setField('eyebrow', value)} /><TextInput label='Tiêu đề trang' value={form.title} onChange={(value) => setField('title', value)} error={errorFor('title')} /><TextArea label='Mô tả' value={form.description} onChange={(value) => setField('description', value)} /><label><span className='label'>Bài ưu đãi nổi bật</span><select className='input' value={form.featured_article_id} onChange={(event) => setField('featured_article_id', event.target.value)}><option value=''>Tự động chọn bài mới nhất</option>{query.data.articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}</select>{selectedArticle && <p className='muted mt-2 text-sm'>Đang chọn: {selectedArticle.title}</p>}{errorFor('featured_article_id')}</label><TextInput label='Nhãn bài nổi bật' value={form.featured_badge_label} onChange={(value) => setField('featured_badge_label', value)} /></SettingsSection>
      <SettingsSection title='Danh sách ưu đãi'><TextInput label='Eyebrow danh sách' value={form.list_eyebrow} onChange={(value) => setField('list_eyebrow', value)} /><TextInput label='Tiêu đề danh sách' value={form.list_title} onChange={(value) => setField('list_title', value)} /><TextArea label='Mô tả danh sách' value={form.list_description} onChange={(value) => setField('list_description', value)} /></SettingsSection>
      <SettingsSection title='Khối kêu gọi hành động'><label className='flex items-center gap-3 font-semibold'><input type='checkbox' checked={form.show_cta} onChange={(event) => setField('show_cta', event.target.checked)} />Hiển thị CTA</label><TextInput label='Eyebrow CTA' value={form.cta_eyebrow} onChange={(value) => setField('cta_eyebrow', value)} /><TextInput label='Tiêu đề CTA' value={form.cta_title} onChange={(value) => setField('cta_title', value)} /><TextArea label='Mô tả CTA' value={form.cta_description} onChange={(value) => setField('cta_description', value)} /><div className='grid gap-4 md:grid-cols-2'><TextInput label='Nút chính' value={form.cta_primary_label} onChange={(value) => setField('cta_primary_label', value)} /><TextInput label='URL nút chính' value={form.cta_primary_url} onChange={(value) => setField('cta_primary_url', value)} error={errorFor('cta_primary_url')} /><TextInput label='Nút phụ' value={form.cta_secondary_label} onChange={(value) => setField('cta_secondary_label', value)} /><TextInput label='URL nút phụ' value={form.cta_secondary_url} onChange={(value) => setField('cta_secondary_url', value)} error={errorFor('cta_secondary_url')} /></div><TextInput label='Alt ảnh CTA' value={form.cta_image_alt} onChange={(value) => setField('cta_image_alt', value)} />{currentImage && <img className='max-h-72 w-full rounded-2xl object-cover' src={currentImage} alt='' />}<div className='flex flex-wrap gap-2'><label className='btn-secondary cursor-pointer'><ImagePlus size={17} />Chọn ảnh CTA<input className='hidden' type='file' accept='image/jpeg,image/png,image/webp' onChange={chooseImage} /></label>{query.data.content.cta_image_path && <button className='btn-secondary text-red-700' type='button' onClick={removeImage}><Trash2 size={16} />Xóa ảnh</button>}</div></SettingsSection>
      <SettingsSection title='SEO'><TextInput label='SEO title' value={form.seo_title} onChange={(value) => setField('seo_title', value)} /><TextArea label='SEO description' value={form.seo_description} onChange={(value) => setField('seo_description', value)} /></SettingsSection>
      <div className='flex justify-end'><button className='btn-primary' disabled={save.isPending || uploading}>{save.isPending || uploading ? <Loader2 className='animate-spin' size={17} /> : <Save size={17} />}Lưu thiết lập</button></div>
    </form>
  </div>
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className='card grid gap-4 p-6'><h2 className='text-xl font-black'>{title}</h2>{children}</section> }
function TextInput({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: React.ReactNode }) { return <label><span className='label'>{label}</span><input className='input' value={value} onChange={(event) => onChange(event.target.value)} />{error}</label> }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><span className='label'>{label}</span><textarea className='input min-h-24' value={value} onChange={(event) => onChange(event.target.value)} /></label> }
