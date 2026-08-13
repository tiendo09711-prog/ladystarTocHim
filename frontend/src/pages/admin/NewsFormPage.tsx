import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { HomeImageCropEditor } from '../../components/admin/HomeImageCropEditor'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, NewsArticle, NewsStatus } from '../../types'

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export function NewsFormPage() {
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
  const [coverImageAlt, setCoverImageAlt] = useState('')
  const [uploading, setUploading] = useState(false)
  const publishIntent = useRef(false)

  const query = useQuery({
    queryKey: ['admin-news', id],
    enabled: isEdit,
    queryFn: async () => (await apiClient.get<ApiResponse<NewsArticle>>(`/admin/news/${id}`)).data.data,
  })

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title))
  }, [title, slugTouched])

  useEffect(() => {
    if (query.data) {
      setTitle(query.data.title)
      setSlug(query.data.slug)
      setContent(query.data.content ?? '')
      setCoverImageAlt(query.data.cover_image_alt ?? '')
    }
  }, [query.data])

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => isEdit
      ? (await apiClient.put<ApiResponse<NewsArticle>>(`/admin/news/${id}`, payload)).data.data
      : (await apiClient.post<ApiResponse<NewsArticle>>('/admin/news', payload)).data.data,
    onError: (error: any) => { setErrors(error.response?.data?.errors ?? {}); toast.error(error.response?.data?.message ?? 'Không thể lưu bản tin.') },
  })

  const field = (name: string) => errors[name]?.[0] ? <span className="text-sm font-semibold text-red-700">{errors[name][0]}</span> : null

  const removeCover = async () => {
    try {
      await apiClient.delete(`/admin/news/${id}/cover-image`)
      await client.invalidateQueries({ queryKey: ['admin-news'] })
      toast.success('Đã xóa ảnh bìa.')
    } catch { toast.error('Không thể xóa ảnh bìa.') }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const status: NewsStatus = publishIntent.current ? 'published' : (article?.status === 'published' ? 'published' : 'draft')
    publishIntent.current = false
    setErrors({})
    const form = new FormData(event.currentTarget)
    const payload: Record<string, unknown> = {
      title, slug,
      excerpt: String(form.get('excerpt') ?? '') || null,
      content,
      category: String(form.get('category') ?? '') || null,
      cover_image_alt: coverImageAlt || null,
      seo_title: String(form.get('seo_title') ?? '') || null,
      seo_description: String(form.get('seo_description') ?? '') || null,
      sort_order: Number(form.get('sort_order') ?? 0),
      status,
    }
    try {
      const saved = await mutation.mutateAsync(payload)
      if (imageFile) {
        setUploading(true)
        const data = new FormData()
        data.append('image', imageFile)
        if (coverImageAlt) data.append('cover_image_alt', coverImageAlt)
        await apiClient.post(`/admin/news/${saved.id}/cover-image`, data)
      }
      await client.invalidateQueries({ queryKey: ['admin-news'] })
      toast.success(status === 'published' ? 'Đã xuất bản bản tin.' : 'Đã lưu bản tin.')
      navigate('/admin/news')
    } catch { /* handled */ } finally { setUploading(false) }
  }

  if (isEdit && (query.isLoading || !query.data)) return <LoadingState />
  const article = query.data

  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black">{isEdit ? 'Chỉnh sửa bản tin' : 'Tạo bản tin'}</h1><p className="muted">Bản nháp chỉ hiển thị sau khi xuất bản.</p></div>
      <Link className="btn-secondary" to="/admin/news">Hủy</Link>
    </div>
    <form className="card grid gap-4 p-6" onSubmit={save}>
      <div className="grid gap-4 md:grid-cols-2">
        <label><span className="label">Tiêu đề</span><input className="input" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required />{field('title')}</label>
        <label><span className="label">Slug</span><input className="input" name="slug" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value) }} required />{field('slug')}</label>
        <label className="md:col-span-2"><span className="label">Tóm tắt (excerpt)</span><textarea className="input" name="excerpt" defaultValue={article?.excerpt ?? ''} maxLength={500} />{field('excerpt')}</label>
        <label className="md:col-span-2"><span className="label">Nội dung (văn bản thuần, mỗi đoạn cách nhau một dòng trống)</span><textarea className="input min-h-56" name="content" value={content} onChange={(event) => setContent(event.target.value)} />{field('content')}</label>
        <label><span className="label">Chuyên mục</span><input className="input" name="category" defaultValue={article?.category ?? ''} placeholder="Cẩm nang" />{field('category')}</label>
        <label><span className="label">Thứ tự hiển thị</span><input className="input" name="sort_order" type="number" min="0" defaultValue={article?.sort_order ?? 0} /></label>
        <label><span className="label">SEO title</span><input className="input" name="seo_title" defaultValue={article?.seo_title ?? ''} /></label>
        <label><span className="label">SEO description</span><input className="input" name="seo_description" defaultValue={article?.seo_description ?? ''} /></label>
      </div>
      <HomeImageCropEditor title="bìa bản tin" mediaKey="newsCover" description="Ảnh này dùng chung cho bài nổi bật, danh sách bài viết và trang chi tiết." path={article?.cover_image_path} alt={coverImageAlt} fallback="/images/product-placeholder.svg" uploading={uploading} onAltChange={setCoverImageAlt} onUpload={(file) => setImageFile(file ?? null)} onRemove={() => { void removeCover() }} />
      {imageFile && <p className="text-sm font-semibold text-slate-600">Ảnh đã cắt sẽ được tải lên sau khi lưu: {imageFile.name}</p>}
      {content.trim() && <section className="rounded-2xl border border-slate-200 p-5">
        <span className="label">Xem trước nội dung</span>
        <h2 className="text-xl font-black">{title || 'Tiêu đề bản tin'}</h2>
        <div className="news-detail-content mt-3">{content.split(/\\n{2,}/).map((part) => part.trim()).filter(Boolean).map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}</div>
      </section>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={mutation.isPending || uploading}>{mutation.isPending || uploading ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{article?.status === 'published' ? 'Lưu thay đổi' : 'Lưu bản nháp'}</button>
        {article?.status !== 'published' && <button type="submit" className="btn-secondary" disabled={mutation.isPending || uploading} onClick={() => { publishIntent.current = true }}>Xuất bản</button>}
        <Link className="btn-secondary" to="/admin/news">Hủy</Link>
      </div>
    </form>
  </div>
}
