import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, NewsArticle, NewsStatus } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function GuideFormAdminPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const client = useQueryClient()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const query = useQuery({ queryKey: ['admin-guide', id], queryFn: async () => (await apiClient.get<ApiResponse<NewsArticle>>(`/admin/guides/${id}`)).data.data, enabled: isEdit })

  useEffect(() => {
    if (!query.data) return
    setTitle(query.data.title); setSlug(query.data.slug); setContent(query.data.content ?? '')
  }, [query.data])

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  const chooseImage = (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) return toast.error('Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB.')
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  const removeCover = async () => {
    if (!id) return
    await apiClient.delete(`/admin/guides/${id}/cover-image`)
    await query.refetch(); toast.success('Đã xóa ảnh bìa.')
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const status = (submitter?.value || query.data?.status || 'draft') as NewsStatus
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setSaving(true)
    try {
      const payload = { ...values, title, slug, content, category: 'Hướng dẫn', status, sort_order: Number(values.sort_order || 0) }
      const article = isEdit
        ? (await apiClient.put<ApiResponse<NewsArticle>>(`/admin/guides/${id}`, payload)).data.data
        : (await apiClient.post<ApiResponse<NewsArticle>>('/admin/guides', payload)).data.data
      if (imageFile) {
        const image = new FormData(); image.append('image', imageFile); image.append('cover_image_alt', String(values.cover_image_alt ?? ''))
        await apiClient.post(`/admin/guides/${article.id}/cover-image`, image)
      }
      await client.invalidateQueries({ queryKey: ['admin-guides'] })
      toast.success(status === 'published' ? 'Đã xuất bản bài hướng dẫn.' : 'Đã lưu bài hướng dẫn.')
      navigate('/admin/guides')
    } catch (error: any) { toast.error(error.response?.data?.message ?? 'Không thể lưu bài hướng dẫn.') }
    finally { setSaving(false) }
  }

  if (isEdit && query.isLoading) return <LoadingState />
  const article = query.data

  return <div>
    <div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-3xl font-black'>{isEdit ? 'Chỉnh sửa bài hướng dẫn' : 'Tạo bài hướng dẫn'}</h1><p className='muted'>Bài chỉ hiển thị ngoài website sau khi xuất bản.</p></div><Link className='btn-secondary' to='/admin/guides'>Hủy</Link></div>
    <form className='card grid gap-4 p-6' onSubmit={save}>
      <div className='grid gap-4 md:grid-cols-2'>
        <label><span className='label'>Tiêu đề</span><input className='input' name='title' value={title} onChange={(event) => { setTitle(event.target.value); if (!slugTouched) setSlug(slugify(event.target.value)) }} required /></label>
        <label><span className='label'>Slug</span><input className='input' name='slug' value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value) }} required /></label>
        <label className='md:col-span-2'><span className='label'>Tóm tắt</span><textarea className='input min-h-24' name='excerpt' defaultValue={article?.excerpt ?? ''} maxLength={500} /></label>
        <label className='md:col-span-2'><span className='label'>Nội dung (mỗi đoạn cách nhau một dòng trống)</span><textarea className='input min-h-64' name='content' value={content} onChange={(event) => setContent(event.target.value)} required /></label>
        <label><span className='label'>Thứ tự hiển thị</span><input className='input' name='sort_order' type='number' min='0' defaultValue={article?.sort_order ?? 0} /></label>
        <label><span className='label'>Alt text ảnh bìa</span><input className='input' name='cover_image_alt' defaultValue={article?.cover_image_alt ?? ''} /></label>
        <label><span className='label'>SEO title</span><input className='input' name='seo_title' defaultValue={article?.seo_title ?? ''} /></label>
        <label><span className='label'>SEO description</span><input className='input' name='seo_description' defaultValue={article?.seo_description ?? ''} /></label>
      </div>
      <div className='grid gap-3 rounded-2xl border border-dashed border-slate-300 p-4'><span className='label'>Ảnh bìa (JPG, PNG, WebP · tối đa 5 MB)</span><div className='flex flex-wrap items-center gap-4'>{(imagePreview || article?.cover_image_path) && <img src={imagePreview ?? resolveAssetUrl(article?.cover_image_path)} alt={article?.cover_image_alt ?? 'Ảnh bìa'} className='h-28 w-44 rounded-xl object-cover' />}<label className='btn-secondary'><ImagePlus size={17} />Chọn ảnh<input className='hidden' type='file' accept='image/jpeg,image/png,image/webp' onChange={(event) => chooseImage(event.target.files?.[0])} /></label>{isEdit && article?.cover_image_path && <button type='button' className='btn-secondary text-red-700' onClick={removeCover}><Trash2 size={16} />Xóa ảnh</button>}</div></div>
      {content.trim() && <section className='rounded-2xl border border-slate-200 p-5'><span className='label'>Xem trước nội dung</span><h2 className='text-xl font-black'>{title || 'Tiêu đề bài hướng dẫn'}</h2><div className='news-detail-content mt-3'>{content.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean).map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}</div></section>}
      <div className='flex flex-wrap gap-2'><button type='submit' value={article?.status === 'published' ? 'published' : 'draft'} className='btn-primary' disabled={saving}>{saving ? <Loader2 size={17} className='animate-spin' /> : <Save size={17} />}{article?.status === 'published' ? 'Lưu thay đổi' : 'Lưu bản nháp'}</button>{article?.status !== 'published' && <button type='submit' value='published' className='btn-secondary' disabled={saving}>Xuất bản</button>}<Link className='btn-secondary' to='/admin/guides'>Hủy</Link></div>
    </form>
  </div>
}
