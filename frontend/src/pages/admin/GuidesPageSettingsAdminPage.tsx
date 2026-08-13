import { Loader2, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { deleteGuidesCtaImage, deleteGuidesHeroImage, getAdminGuidesPage, updateGuidesPageContent, uploadGuidesCtaImage, uploadGuidesHeroImage } from '../../api/contentApi'
import { HomeImageCropEditor } from '../../components/admin/HomeImageCropEditor'
import { LoadingState } from '../../components/common/LoadingState'
import { useQuery } from '@tanstack/react-query'

export function GuidesPageSettingsAdminPage() {
  const query = useQuery({ queryKey: ['admin-guides-page'], queryFn: getAdminGuidesPage })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [heroAlt, setHeroAlt] = useState('')
  const [ctaAlt, setCtaAlt] = useState('')
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [ctaFile, setCtaFile] = useState<File | null>(null)

  useEffect(() => {
    if (!query.data) return
    setHeroAlt(query.data.content.hero_image_alt ?? '')
    setCtaAlt(query.data.content.cta_image_alt ?? '')
  }, [query.data])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    const payload = {
      ...values,
      hero_image_alt: heroAlt || null,
      cta_image_alt: ctaAlt || null,
      featured_article_id: values.featured_article_id ? Number(values.featured_article_id) : null,
      show_cta: new FormData(form).has('show_cta'),
      seo: { title: values.seo_title, description: values.seo_description },
    }
    delete (payload as any).seo_title
    delete (payload as any).seo_description
    setSaving(true)
    try {
      await updateGuidesPageContent(payload)
      setUploading(true)
      if (heroFile) await uploadGuidesHeroImage(heroFile, heroAlt)
      if (ctaFile) await uploadGuidesCtaImage(ctaFile, ctaAlt)
      await query.refetch()
      setHeroFile(null)
      setCtaFile(null)
      toast.success('Đã lưu thiết lập trang hướng dẫn.')
    } catch (error: any) { toast.error(error.response?.data?.message ?? 'Không thể lưu thiết lập.') }
    finally { setSaving(false); setUploading(false) }
  }

  const removeImage = async (slot: 'hero' | 'cta') => {
    setUploading(true)
    try {
      if (slot === 'hero') await deleteGuidesHeroImage(); else await deleteGuidesCtaImage()
      await query.refetch()
      toast.success(slot === 'hero' ? 'Đã xóa ảnh nền.' : 'Đã xóa ảnh CTA.')
    } catch { toast.error('Không thể xóa ảnh.') }
    finally { setUploading(false) }
  }

  if (query.isLoading || !query.data) return <LoadingState />
  const { content, seo, articles } = query.data

  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Thiết lập trang hướng dẫn</h1><p className="muted">Chỉnh nội dung, bài nổi bật, crop ảnh banner/CTA và SEO.</p></div><div className="flex gap-2"><Link className="btn-secondary" to="/admin/guides">Quay lại</Link><a className="btn-secondary" href="/huong-dan" target="_blank" rel="noreferrer">Xem trang</a></div></div>
    <form className="grid gap-5" onSubmit={save}>
      <section className="card grid gap-4 p-6">
        <h2 className="text-xl font-black">Phần mở đầu</h2>
        <div className="grid gap-4 md:grid-cols-2"><label><span className="label">Nhãn nhỏ</span><input className="input" name="eyebrow" defaultValue={content.eyebrow ?? ''} /></label><label><span className="label">Tiêu đề trang</span><input className="input" name="title" defaultValue={content.title ?? ''} /></label><label className="md:col-span-2"><span className="label">Mô tả</span><textarea className="input min-h-28" name="description" defaultValue={content.description ?? ''} /></label><label><span className="label">Bài nổi bật</span><select className="input" name="featured_article_id" defaultValue={content.featured_article_id ?? ''}><option value="">Tự chọn bài mới nhất</option>{articles.filter((article) => article.status === 'published').map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}</select></label><label><span className="label">Nhãn bài nổi bật</span><input className="input" name="featured_badge_label" defaultValue={content.featured_badge_label ?? ''} /></label></div>
        <HomeImageCropEditor title="banner trang hướng dẫn" mediaKey="guidesPageHero" description="Ảnh nền của phần mở đầu trang /huong-dan." path={content.hero_image_path} alt={heroAlt} fallback="/images/product-placeholder.svg" uploading={uploading} onAltChange={setHeroAlt} onUpload={(file) => setHeroFile(file ?? null)} onRemove={() => { void removeImage('hero') }} />
        {heroFile && <p className="text-sm font-semibold text-slate-600">Ảnh banner đã cắt sẽ tải lên khi lưu: {heroFile.name}</p>}
      </section>

      <section className="card grid gap-4 p-6"><h2 className="text-xl font-black">Danh sách bài viết</h2><div className="grid gap-4 md:grid-cols-2"><label><span className="label">Nhãn nhỏ</span><input className="input" name="list_eyebrow" defaultValue={content.list_eyebrow ?? ''} /></label><label><span className="label">Tiêu đề danh sách</span><input className="input" name="list_title" defaultValue={content.list_title ?? ''} /></label><label className="md:col-span-2"><span className="label">Mô tả danh sách</span><textarea className="input min-h-24" name="list_description" defaultValue={content.list_description ?? ''} /></label></div></section>

      <section className="card grid gap-4 p-6">
        <div className="flex items-center gap-3"><input id="guide-show-cta" name="show_cta" type="checkbox" defaultChecked={content.show_cta} /><label htmlFor="guide-show-cta" className="font-bold">Hiển thị khối tư vấn cuối trang</label></div>
        <div className="grid gap-4 md:grid-cols-2"><label><span className="label">Nhãn CTA</span><input className="input" name="cta_eyebrow" defaultValue={content.cta_eyebrow ?? ''} /></label><label><span className="label">Tiêu đề CTA</span><input className="input" name="cta_title" defaultValue={content.cta_title ?? ''} /></label><label className="md:col-span-2"><span className="label">Mô tả CTA</span><textarea className="input min-h-24" name="cta_description" defaultValue={content.cta_description ?? ''} /></label><label><span className="label">Nút chính</span><input className="input" name="cta_primary_label" defaultValue={content.cta_primary_label ?? ''} /></label><label><span className="label">URL nút chính</span><input className="input" name="cta_primary_url" defaultValue={content.cta_primary_url ?? ''} /></label><label><span className="label">Nút phụ</span><input className="input" name="cta_secondary_label" defaultValue={content.cta_secondary_label ?? ''} /></label><label><span className="label">URL nút phụ</span><input className="input" name="cta_secondary_url" defaultValue={content.cta_secondary_url ?? ''} /></label></div>
        <HomeImageCropEditor title="CTA trang hướng dẫn" mediaKey="guidesPageCta" description="Ảnh minh họa cạnh khối tư vấn cuối trang." path={content.cta_image_path} alt={ctaAlt} fallback="/images/product-placeholder.svg" uploading={uploading} onAltChange={setCtaAlt} onUpload={(file) => setCtaFile(file ?? null)} onRemove={() => { void removeImage('cta') }} />
        {ctaFile && <p className="text-sm font-semibold text-slate-600">Ảnh CTA đã cắt sẽ tải lên khi lưu: {ctaFile.name}</p>}
      </section>

      <section className="card grid gap-4 p-6"><h2 className="text-xl font-black">SEO</h2><div className="grid gap-4 md:grid-cols-2"><label><span className="label">SEO title</span><input className="input" name="seo_title" defaultValue={seo.title ?? ''} /></label><label><span className="label">SEO description</span><textarea className="input min-h-24" name="seo_description" defaultValue={seo.description ?? ''} /></label></div></section>
      <div className="sticky bottom-4 z-10 flex justify-end"><button className="btn-primary shadow-lg" type="submit" disabled={saving || uploading}>{saving || uploading ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}Lưu thiết lập</button></div>
    </form>
  </div>
}
