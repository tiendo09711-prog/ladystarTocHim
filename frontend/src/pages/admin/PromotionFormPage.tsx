import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, NewsArticle, NewsStatus } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export function PromotionFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const client = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const publishIntent = useRef(false)
  const query = useQuery({ queryKey: ['admin-promotion', id], enabled: isEdit, queryFn: async () => (await apiClient.get<ApiResponse<NewsArticle>>(`/admin/promotions/${id}`)).data.data })
  const article = query.data

  useEffect(() => { if (!slugTouched) setSlug(slugify(title)) }, [title, slugTouched])
  useEffect(() => { if (article) { setTitle(article.title); setSlug(article.slug); setContent(article.content ?? '') } }, [article])
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => isEdit ? (await apiClient.put<ApiResponse<NewsArticle>>(`/admin/promotions/${id}`, payload)).data.data : (await apiClient.post<ApiResponse<NewsArticle>>('/admin/promotions', payload)).data.data,
    onError: (error: any) => { setErrors(error.response?.data?.errors ?? {}); toast.error(error.response?.data?.message ?? 'Không thể lưu ưu đãi.') },
  })
  const field = (name: string) => errors[name]?.[0] ? <span className='text-sm font-semibold text-red-700'>{errors[name][0]}</span> : null

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    const file = event.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  const removeCover = async () => {
    try {
      await apiClient.delete(`/admin/promotions/${id}/cover-image`)
      await client.invalidateQueries({ queryKey: ['admin-promotion', id] })
      toast.success('Đã xóa ảnh bìa.')
    } catch { toast.error('Không thể xóa ảnh bìa.') }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const status: NewsStatus = publishIntent.current ? 'published' : (article?.status === 'published' ? 'published' : 'draft')
    publishIntent.current = false
    setErrors({})
    const form = new FormData(event.currentTarget)
    const payload = { title, slug, excerpt: String(form.get('excerpt') ?? '') || null, content, category: 'Ưu đãi', cover_image_alt: String(form.get('cover_image_alt') ?? '') || null, seo_title: String(form.get('seo_title') ?? '') || null, seo_description: String(form.get('seo_description') ?? '') || null, sort_order: Number(form.get('sort_order') ?? 0), status }
    try {
      const saved = await mutation.mutateAsync(payload)
      if (imageFile) { setUploading(true); const data = new FormData(); data.append('image', imageFile); data.append('cover_image_alt', String(form.get('cover_image_alt') ?? '')); await apiClient.post(`/admin/promotions/${saved.id}/cover-image`, data) }
      await Promise.all([client.invalidateQueries({ queryKey: ['admin-promotions'] }), client.invalidateQueries({ queryKey: ['promotions-page'] })])
      toast.success(status === 'published' ? 'Đã xuất bản ưu đãi.' : 'Đã lưu ưu đãi.')
      navigate('/admin/promotions')
    } catch { /* handled */ } finally { setUploading(false) }
  }

  if (isEdit && (query.isLoading || !article)) return <LoadingState />
  const currentImage = imagePreview ?? (article?.cover_image_path ? resolveAssetUrl(article.cover_image_path) : null)

  return <div>
    <div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-3xl font-black'>{isEdit ? 'Chỉnh sửa ưu đãi' : 'Tạo ưu đãi'}</h1><p className='muted'>Bản nháp chỉ hiển thị tại /uu-dai sau khi xuất bản.</p></div><Link className='btn-secondary' to='/admin/promotions'>Hủy</Link></div>
    <form className='card grid gap-4 p-6' onSubmit={save}>
      <div className='grid gap-4 md:grid-cols-2'><label><span className='label'>Tiêu đề</span><input className='input' value={title} onChange={(event) => setTitle(event.target.value)} required />{field('title')}</label><label><span className='label'>Slug</span><input className='input' value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value) }} required />{field('slug')}</label><label className='md:col-span-2'><span className='label'>Tóm tắt</span><textarea className='input' name='excerpt' defaultValue={article?.excerpt ?? ''} maxLength={500} />{field('excerpt')}</label><label className='md:col-span-2'><span className='label'>Nội dung</span><textarea className='input min-h-56' value={content} onChange={(event) => setContent(event.target.value)} />{field('content')}</label><label><span className='label'>Thứ tự hiển thị</span><input className='input' name='sort_order' type='number' min='0' defaultValue={article?.sort_order ?? 0} /></label><label><span className='label'>Alt ảnh bìa</span><input className='input' name='cover_image_alt' defaultValue={article?.cover_image_alt ?? ''} /></label><label><span className='label'>SEO title</span><input className='input' name='seo_title' defaultValue={article?.seo_title ?? ''} /></label><label><span className='label'>SEO description</span><input className='input' name='seo_description' defaultValue={article?.seo_description ?? ''} /></label></div>
      <section className='rounded-2xl border border-slate-200 p-4'><div className='mb-3 flex items-center justify-between gap-3'><div><h2 className='font-black'>Ảnh bìa ưu đãi</h2><p className='muted text-sm'>JPG, PNG hoặc WebP, tối đa 5MB.</p></div>{article?.cover_image_path && <button className='btn-secondary text-red-700' type='button' onClick={removeCover}><Trash2 size={16} />Xóa ảnh</button>}</div>{currentImage && <img className='mb-3 max-h-72 w-full rounded-2xl object-cover' src={currentImage} alt='' />}<label className='btn-secondary inline-flex cursor-pointer'><ImagePlus size={17} />Chọn ảnh<input className='hidden' type='file' accept='image/jpeg,image/png,image/webp' onChange={chooseImage} /></label></section>
      <div className='flex flex-wrap justify-end gap-2'><Link className='btn-secondary' to='/admin/promotions'>Hủy</Link><button className='btn-secondary' type='submit' onClick={() => { publishIntent.current = false }} disabled={mutation.isPending || uploading}><Save size={17} />Lưu nháp</button><button className='btn-primary' type='submit' onClick={() => { publishIntent.current = true }} disabled={mutation.isPending || uploading}>{mutation.isPending || uploading ? <Loader2 className='animate-spin' size={17} /> : <Save size={17} />}Xuất bản</button></div>
    </form>
  </div>
}
