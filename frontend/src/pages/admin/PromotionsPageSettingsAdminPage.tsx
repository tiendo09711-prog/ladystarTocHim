import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { deletePromotionsCtaImage, getAdminPromotionsPage, updatePromotionsPageContent, uploadPromotionsCtaImage } from '../../api/contentApi'
import { AdminImageCropDialog } from '../../components/admin/HomeImageCropEditor'
import { LoadingState } from '../../components/common/LoadingState'
import { emptyPromotionContent } from '../../data/promotionsContent'
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
  eyebrow: text(content?.eyebrow ?? emptyPromotionContent.eyebrow), title: text(content?.title ?? emptyPromotionContent.title), description: text(content?.description ?? emptyPromotionContent.description), featured_article_id: content?.featured_article_id ? String(content.featured_article_id) : '', featured_badge_label: text(content?.featured_badge_label ?? emptyPromotionContent.featured_badge_label),
  list_eyebrow: text(content?.list_eyebrow ?? emptyPromotionContent.list_eyebrow), list_title: text(content?.list_title ?? emptyPromotionContent.list_title), list_description: text(content?.list_description ?? emptyPromotionContent.list_description), show_cta: content?.show_cta ?? false,
  cta_eyebrow: text(content?.cta_eyebrow ?? emptyPromotionContent.cta_eyebrow), cta_title: text(content?.cta_title ?? emptyPromotionContent.cta_title), cta_description: text(content?.cta_description ?? emptyPromotionContent.cta_description), cta_primary_label: text(content?.cta_primary_label ?? emptyPromotionContent.cta_primary_label), cta_primary_url: text(content?.cta_primary_url ?? emptyPromotionContent.cta_primary_url), cta_secondary_label: text(content?.cta_secondary_label ?? emptyPromotionContent.cta_secondary_label), cta_secondary_url: text(content?.cta_secondary_url ?? emptyPromotionContent.cta_secondary_url), cta_image_alt: text(content?.cta_image_alt), seo_title: text(seo?.title ?? content?.title ?? emptyPromotionContent.title), seo_description: text(seo?.description ?? content?.description ?? emptyPromotionContent.description),
})

export function PromotionsPageSettingsAdminPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-promotions-page'], queryFn: getAdminPromotionsPage })
  const [form, setForm] = useState<FormState>(toFormState())
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null)
  const [imageError, setImageError] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => { if (query.data) setForm(toFormState(query.data.content, query.data.seo)) }, [query.data])
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])
  const selectedArticle = useMemo(() => query.data?.articles.find((article) => article.id === Number(form.featured_article_id)), [form.featured_article_id, query.data?.articles])
  const setField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => setForm((current) => ({ ...current, [key]: value }))
  const errorFor = (name: string) => errors[name]?.[0] ? <span className='mt-1 block text-sm font-semibold text-red-700'>{errors[name][0]}</span> : null
  const save = useMutation({ mutationFn: () => updatePromotionsPageContent({ ...form, featured_article_id: form.featured_article_id ? Number(form.featured_article_id) : null, seo: { title: form.seo_title || null, description: form.seo_description || null } }), onError: (error: any) => { setErrors(error.response?.data?.errors ?? {}); toast.error(error.response?.data?.message ?? 'Không thể lưu thiết lập trang ưu đãi.') } })

  const chooseImage = (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setImageError('Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB.')
      return
    }
    setImageError('')
    setCropSourceFile(file)
  }

  const confirmCrop = (file: File) => {
    setCropSourceFile(null)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setErrors({})
    try { await save.mutateAsync(); if (imageFile) { setUploading(true); await uploadPromotionsCtaImage(imageFile, form.cta_image_alt); setImageFile(null); setImagePreview(null) }; await Promise.all([client.invalidateQueries({ queryKey: ['admin-promotions-page'] }), client.invalidateQueries({ queryKey: ['promotions-page'] })]); toast.success('Đã lưu thiết lập trang ưu đãi.') } catch { /* handled */ } finally { setUploading(false) }
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
      <SettingsSection title='Khối kêu gọi hành động'><label className='flex items-center gap-3 font-semibold'><input type='checkbox' checked={form.show_cta} onChange={(event) => setField('show_cta', event.target.checked)} />Hiển thị CTA</label><TextInput label='Eyebrow CTA' value={form.cta_eyebrow} onChange={(value) => setField('cta_eyebrow', value)} /><TextInput label='Tiêu đề CTA' value={form.cta_title} onChange={(value) => setField('cta_title', value)} /><TextArea label='Mô tả CTA' value={form.cta_description} onChange={(value) => setField('cta_description', value)} /><div className='grid gap-4 md:grid-cols-2'><TextInput label='Nút chính' value={form.cta_primary_label} onChange={(value) => setField('cta_primary_label', value)} /><TextInput label='URL nút chính' value={form.cta_primary_url} onChange={(value) => setField('cta_primary_url', value)} error={errorFor('cta_primary_url')} /><TextInput label='Nút phụ' value={form.cta_secondary_label} onChange={(value) => setField('cta_secondary_label', value)} /><TextInput label='URL nút phụ' value={form.cta_secondary_url} onChange={(value) => setField('cta_secondary_url', value)} error={errorFor('cta_secondary_url')} /></div><TextInput label='Alt ảnh CTA' value={form.cta_image_alt} onChange={(value) => setField('cta_image_alt', value)} />{currentImage && <div className='fixed-media-frame promotion-admin-cta' style={{ '--media-ratio': '4 / 3' } as React.CSSProperties}><img src={currentImage} alt='' /></div>}<p className='muted text-sm'>Khung CTA cố định 4:3; ảnh sẽ được crop để fill đầy khung và giữ đúng bố cục.</p><div className='flex flex-wrap gap-2'><label className='btn-secondary cursor-pointer'><ImagePlus size={17} />Chọn và cắt ảnh CTA<input className='hidden' aria-label='Chọn ảnh CTA ưu đãi' type='file' accept='image/jpeg,image/png,image/webp' onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; chooseImage(file) }} /></label>{query.data.content.cta_image_path && <button className='btn-secondary text-red-700' type='button' onClick={removeImage}><Trash2 size={16} />Xóa ảnh</button>}</div>{imageError && <p className='text-sm font-semibold text-red-700'>{imageError}</p>}{cropSourceFile && <AdminImageCropDialog file={cropSourceFile} title='CTA ưu đãi' mediaKey='promotionCta' onCancel={() => setCropSourceFile(null)} onConfirm={confirmCrop} />}</SettingsSection>
      <SettingsSection title='SEO'><TextInput label='SEO title' value={form.seo_title} onChange={(value) => setField('seo_title', value)} /><TextArea label='SEO description' value={form.seo_description} onChange={(value) => setField('seo_description', value)} /></SettingsSection>
      <div className='flex justify-end'><button className='btn-primary' disabled={save.isPending || uploading}>{save.isPending || uploading ? <Loader2 className='animate-spin' size={17} /> : <Save size={17} />}Lưu thiết lập</button></div>
    </form>
  </div>
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className='card grid gap-4 p-6'><h2 className='text-xl font-black'>{title}</h2>{children}</section> }
function TextInput({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: React.ReactNode }) { return <label><span className='label'>{label}</span><input className='input' value={value} onChange={(event) => onChange(event.target.value)} />{error}</label> }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><span className='label'>{label}</span><textarea className='input min-h-24' value={value} onChange={(event) => onChange(event.target.value)} /></label> }
