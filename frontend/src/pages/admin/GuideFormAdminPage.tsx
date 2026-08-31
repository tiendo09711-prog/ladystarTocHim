import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Film, Loader2, Save, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { uploadGuideContentImage, uploadGuideVideo } from '../../api/contentApi'
import { HomeImageCropEditor } from '../../components/admin/HomeImageCropEditor'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, NewsArticle, NewsStatus } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { guideVideoSource } from '../../utils/guideVideo'

const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function GuideFormAdminPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const client = useQueryClient()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [content, setContent] = useState('')
  const [coverImageAlt, setCoverImageAlt] = useState('')
  const [contentImageAlt, setContentImageAlt] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [contentImageFile, setContentImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const query = useQuery({ queryKey: ['admin-guide', id], queryFn: async () => (await apiClient.get<ApiResponse<NewsArticle>>(`/admin/guides/${id}`)).data.data, enabled: isEdit })

  useEffect(() => {
    if (!query.data) return
    setTitle(query.data.title)
    setSlug(query.data.slug)
    setContent(query.data.content ?? '')
    setCoverImageAlt(query.data.cover_image_alt ?? '')
    setContentImageAlt(query.data.content_image_alt ?? '')
    setVideoUrl(query.data.video_url ?? '')
    setVideoTitle(query.data.video_title ?? '')
  }, [query.data])

  useEffect(() => () => { if (videoPreview) URL.revokeObjectURL(videoPreview) }, [videoPreview])

  const removeMedia = async (slot: 'cover-image' | 'content-image' | 'video', message: string) => {
    if (!id) return
    try {
      await apiClient.delete(`/admin/guides/${id}/${slot}`)
      await query.refetch()
      toast.success(message)
    } catch { toast.error('Không thể xóa media.') }
  }

  const chooseVideo = (file?: File) => {
    if (!file) return
    if (!['video/mp4', 'video/webm'].includes(file.type) || file.size > 50 * 1024 * 1024) return toast.error('Video phải là MP4 hoặc WebM và không quá 50 MB.')
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const status = (submitter?.value || query.data?.status || 'draft') as NewsStatus
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setSaving(true)
    try {
      const payload = {
        ...values, title, slug, content, status,
        cover_image_alt: coverImageAlt || null,
        content_image_alt: contentImageAlt || null,
        video_url: videoUrl || null,
        video_title: videoTitle || null,
        sort_order: Number(values.sort_order || 0),
      }
      const article = isEdit
        ? (await apiClient.put<ApiResponse<NewsArticle>>(`/admin/guides/${id}`, payload)).data.data
        : (await apiClient.post<ApiResponse<NewsArticle>>('/admin/guides', payload)).data.data
      setUploading(true)
      if (coverFile) {
        const image = new FormData()
        image.append('image', coverFile)
        if (coverImageAlt) image.append('cover_image_alt', coverImageAlt)
        await apiClient.post(`/admin/guides/${article.id}/cover-image`, image)
      }
      if (contentImageFile) await uploadGuideContentImage(article.id, contentImageFile, contentImageAlt)
      if (videoFile) await uploadGuideVideo(article.id, videoFile)
      await client.invalidateQueries({ queryKey: ['admin-guides'] })
      toast.success(status === 'published' ? 'Đã xuất bản bài hướng dẫn.' : 'Đã lưu bài hướng dẫn.')
      navigate('/admin/guides')
    } catch (error: any) { toast.error(error.response?.data?.message ?? 'Không thể lưu bài hướng dẫn.') }
    finally { setSaving(false); setUploading(false) }
  }

  if (isEdit && query.isLoading) return <LoadingState />
  const article = query.data
  const remoteVideo = guideVideoSource(article?.video_path ? resolveAssetUrl(article.video_path) : videoUrl)

  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">{isEdit ? 'Chỉnh sửa bài hướng dẫn' : 'Tạo bài hướng dẫn'}</h1><p className="muted">Quản lý tiêu đề, nội dung, ảnh và video riêng cho từng bài. Bài chỉ hiển thị sau khi xuất bản.</p></div><Link className="btn-secondary" to="/admin/guides">Hủy</Link></div>
    <form className="grid gap-5" onSubmit={save}>
      <section className="card grid gap-4 p-6">
        <h2 className="text-xl font-black">Nội dung bài hướng dẫn</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label><span className="label">Tiêu đề</span><input className="input" name="title" value={title} onChange={(event) => { setTitle(event.target.value); if (!slugTouched) setSlug(slugify(event.target.value)) }} required /></label>
          <label><span className="label">Slug</span><input className="input" name="slug" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value) }} required /></label>
          <label className="md:col-span-2"><span className="label">Tóm tắt</span><textarea className="input min-h-24" name="excerpt" defaultValue={article?.excerpt ?? ''} maxLength={500} /></label>
          <label className="md:col-span-2"><span className="label">Nội dung (mỗi đoạn cách nhau một dòng trống)</span><textarea className="input min-h-64" name="content" value={content} onChange={(event) => setContent(event.target.value)} /></label>
          <label><span className="label">Thứ tự</span><input className="input" name="sort_order" type="number" min="0" defaultValue={article?.sort_order ?? 0} /></label>
          <label><span className="label">SEO title</span><input className="input" name="seo_title" defaultValue={article?.seo_title ?? ''} /></label>
          <label className="md:col-span-2"><span className="label">SEO description</span><input className="input" name="seo_description" defaultValue={article?.seo_description ?? ''} /></label>
        </div>
      </section>

      <section className="card p-6"><HomeImageCropEditor title="bìa bài hướng dẫn" mediaKey="guideCover" description="Ảnh dùng ở bài nổi bật, danh sách và đầu trang chi tiết." path={article?.cover_image_path} alt={coverImageAlt} fallback="/images/product-placeholder.svg" uploading={uploading} onAltChange={setCoverImageAlt} onUpload={(file) => setCoverFile(file ?? null)} onRemove={() => { void removeMedia('cover-image', 'Đã xóa ảnh bìa.') }} />{coverFile && <p className="mt-3 text-sm font-semibold text-slate-600">Ảnh bìa đã cắt sẽ tải lên khi lưu: {coverFile.name}</p>}</section>

      <section className="card p-6"><HomeImageCropEditor title="minh họa nội dung" mediaKey="guideContent" description="Ảnh minh họa hiển thị trong phần nội dung chi tiết của bài." path={article?.content_image_path} alt={contentImageAlt} fallback="/images/product-placeholder.svg" uploading={uploading} onAltChange={setContentImageAlt} onUpload={(file) => setContentImageFile(file ?? null)} onRemove={() => { void removeMedia('content-image', 'Đã xóa ảnh nội dung.') }} />{contentImageFile && <p className="mt-3 text-sm font-semibold text-slate-600">Ảnh nội dung đã cắt sẽ tải lên khi lưu: {contentImageFile.name}</p>}</section>

      <section className="card grid gap-4 p-6">
        <div><h2 className="text-xl font-black">Video hướng dẫn</h2><p className="muted mt-1 text-sm">Tải MP4/WebM tối đa 50 MB hoặc nhập URL YouTube, Vimeo hay video trực tiếp. Video đã tải lên được ưu tiên hiển thị.</p></div>
        <div className="grid gap-4 md:grid-cols-2"><label><span className="label">Tiêu đề video</span><input className="input" value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} placeholder="Video hướng dẫn từng bước" /></label><label><span className="label">URL video</span><input className="input" type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtube.com/watch?v=..." /></label></div>
        {(videoPreview || remoteVideo) && <div className="guide-admin-video-preview">{videoPreview ? <video src={videoPreview} controls /> : remoteVideo?.type === 'embed' ? <iframe src={remoteVideo.src} title={videoTitle || 'Video hướng dẫn'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <video src={remoteVideo?.src} controls />}</div>}
        <div className="flex flex-wrap gap-3"><label className="btn-secondary cursor-pointer"><Film size={18} />{uploading ? 'Đang tải...' : 'Chọn video'}<input className="hidden" aria-label="Chọn video hướng dẫn" type="file" accept="video/mp4,video/webm" disabled={uploading} onChange={(event) => { chooseVideo(event.target.files?.[0]); event.target.value = '' }} /></label>{article?.video_path && <button className="btn-secondary text-red-700" type="button" onClick={() => { void removeMedia('video', 'Đã xóa video hướng dẫn.') }}><Trash2 size={17} />Xóa video đã tải</button>}</div>
        {videoFile && <p className="text-sm font-semibold text-slate-600">Video sẽ tải lên khi lưu: {videoFile.name}</p>}
      </section>

      {content.trim() && <section className="card p-6"><span className="label">Xem trước nội dung</span><h2 className="text-xl font-black">{title || 'Tiêu đề bài hướng dẫn'}</h2><div className="news-detail-content mt-3">{content.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean).map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}</div></section>}
      <div className="sticky bottom-4 z-10 flex flex-wrap gap-2"><button type="submit" value={article?.status === 'published' ? 'published' : 'draft'} className="btn-primary" disabled={saving || uploading}>{saving || uploading ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{article?.status === 'published' ? 'Lưu thay đổi' : 'Lưu bản nháp'}</button>{article?.status !== 'published' && <button type="submit" value="published" className="btn-secondary" disabled={saving || uploading}>Xuất bản</button>}<Link className="btn-secondary" to="/admin/guides">Hủy</Link></div>
    </form>
  </div>
}
