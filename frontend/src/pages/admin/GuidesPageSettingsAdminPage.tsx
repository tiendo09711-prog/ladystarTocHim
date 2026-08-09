import { useQuery } from '@tanstack/react-query'
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { deleteGuidesHeroImage, getAdminGuidesPage, updateGuidesPageContent, uploadGuidesHeroImage } from '../../api/contentApi'
import { LoadingState } from '../../components/common/LoadingState'
import { resolveAssetUrl } from '../../utils/assetUrl'

export function GuidesPageSettingsAdminPage() {
  const query = useQuery({ queryKey: ['admin-guides-page'], queryFn: getAdminGuidesPage })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    const payload = { ...values, featured_article_id: values.featured_article_id ? Number(values.featured_article_id) : null, show_cta: new FormData(form).has('show_cta'), seo: { title: values.seo_title, description: values.seo_description } }
    delete (payload as any).seo_title; delete (payload as any).seo_description
    setSaving(true)
    try { await updateGuidesPageContent(payload); await query.refetch(); toast.success('Đã lưu thiết lập trang hướng dẫn.') }
    catch (error: any) { toast.error(error.response?.data?.message ?? 'Không thể lưu thiết lập.') }
    finally { setSaving(false) }
  }

  const uploadHero = async (file?: File, alt?: string) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) return toast.error('Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB.')
    setUploading(true)
    try { await uploadGuidesHeroImage(file, alt); await query.refetch(); toast.success('Đã cập nhật ảnh nền.') }
    catch { toast.error('Không thể tải ảnh nền.') }
    finally { setUploading(false) }
  }

  const removeHero = async () => {
    setUploading(true)
    try { await deleteGuidesHeroImage(); await query.refetch(); toast.success('Đã xóa ảnh nền.') }
    catch { toast.error('Không thể xóa ảnh nền.') }
    finally { setUploading(false) }
  }

  if (query.isLoading || !query.data) return <LoadingState />
  const { content, seo, articles } = query.data

  return <div>
    <div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-3xl font-black'>Thiết lập trang hướng dẫn</h1><p className='muted'>Chỉnh tiêu đề, mô tả, bài nổi bật, ảnh nền và SEO.</p></div><div className='flex gap-2'><Link className='btn-secondary' to='/admin/guides'>Quay lại</Link><a className='btn-secondary' href='/huong-dan' target='_blank' rel='noreferrer'>Xem trang</a></div></div>
    <form className='grid gap-5' onSubmit={save}>
      <section className='card grid gap-4 p-6'><h2 className='text-xl font-black'>Phần mở đầu</h2><div className='grid gap-4 md:grid-cols-2'><label><span className='label'>Nhãn nhỏ</span><input className='input' name='eyebrow' defaultValue={content.eyebrow ?? ''} /></label><label><span className='label'>Tiêu đề trang</span><input className='input' name='title' defaultValue={content.title ?? ''} /></label><label className='md:col-span-2'><span className='label'>Mô tả</span><textarea className='input min-h-28' name='description' defaultValue={content.description ?? ''} /></label><label><span className='label'>Alt text ảnh nền</span><input className='input' id='guide-hero-alt' name='hero_image_alt' defaultValue={content.hero_image_alt ?? ''} /></label><label><span className='label'>Bài nổi bật</span><select className='input' name='featured_article_id' defaultValue={content.featured_article_id ?? ''}><option value=''>Tự chọn bài mới nhất</option>{articles.filter((article) => article.status === 'published').map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}</select></label><label><span className='label'>Nhãn bài nổi bật</span><input className='input' name='featured_badge_label' defaultValue={content.featured_badge_label ?? ''} /></label></div>
      <div className='grid gap-3 rounded-2xl border border-dashed border-slate-300 p-4'>{content.hero_image_path && <img className='h-44 w-full rounded-2xl object-cover' src={resolveAssetUrl(content.hero_image_path)} alt={content.hero_image_alt ?? 'Ảnh nền hướng dẫn'} />}<div className='flex flex-wrap gap-2'><label className='btn-secondary'><ImagePlus size={17} />{uploading ? 'Đang tải...' : 'Chọn ảnh nền'}<input className='hidden' type='file' accept='image/jpeg,image/png,image/webp' disabled={uploading} onChange={(event) => uploadHero(event.target.files?.[0], (document.getElementById('guide-hero-alt') as HTMLInputElement | null)?.value)} /></label>{content.hero_image_path && <button className='btn-secondary text-red-700' type='button' onClick={removeHero} disabled={uploading}><Trash2 size={16} />Xóa ảnh nền</button>}</div></div></section>
      <section className='card grid gap-4 p-6'><h2 className='text-xl font-black'>Danh sách bài viết</h2><div className='grid gap-4 md:grid-cols-2'><label><span className='label'>Nhãn nhỏ</span><input className='input' name='list_eyebrow' defaultValue={content.list_eyebrow ?? ''} /></label><label><span className='label'>Tiêu đề danh sách</span><input className='input' name='list_title' defaultValue={content.list_title ?? ''} /></label><label className='md:col-span-2'><span className='label'>Mô tả danh sách</span><textarea className='input min-h-24' name='list_description' defaultValue={content.list_description ?? ''} /></label></div></section>
      <section className='card grid gap-4 p-6'><div className='flex items-center gap-3'><input id='guide-show-cta' name='show_cta' type='checkbox' defaultChecked={content.show_cta} /><label htmlFor='guide-show-cta' className='font-bold'>Hiển thị khối tư vấn cuối trang</label></div><div className='grid gap-4 md:grid-cols-2'><label><span className='label'>Nhãn CTA</span><input className='input' name='cta_eyebrow' defaultValue={content.cta_eyebrow ?? ''} /></label><label><span className='label'>Tiêu đề CTA</span><input className='input' name='cta_title' defaultValue={content.cta_title ?? ''} /></label><label className='md:col-span-2'><span className='label'>Mô tả CTA</span><textarea className='input min-h-24' name='cta_description' defaultValue={content.cta_description ?? ''} /></label><label><span className='label'>Nút chính</span><input className='input' name='cta_primary_label' defaultValue={content.cta_primary_label ?? ''} /></label><label><span className='label'>URL nút chính</span><input className='input' name='cta_primary_url' defaultValue={content.cta_primary_url ?? ''} /></label><label><span className='label'>Nút phụ</span><input className='input' name='cta_secondary_label' defaultValue={content.cta_secondary_label ?? ''} /></label><label><span className='label'>URL nút phụ</span><input className='input' name='cta_secondary_url' defaultValue={content.cta_secondary_url ?? ''} /></label></div></section>
      <section className='card grid gap-4 p-6'><h2 className='text-xl font-black'>SEO</h2><div className='grid gap-4 md:grid-cols-2'><label><span className='label'>SEO title</span><input className='input' name='seo_title' defaultValue={seo.title ?? ''} /></label><label><span className='label'>SEO description</span><textarea className='input min-h-24' name='seo_description' defaultValue={seo.description ?? ''} /></label></div></section>
      <div className='sticky bottom-4 z-10 flex justify-end'><button className='btn-primary shadow-lg' type='submit' disabled={saving || uploading}>{saving ? <Loader2 size={17} className='animate-spin' /> : <Save size={17} />}Lưu thiết lập</button></div>
    </form>
  </div>
}
