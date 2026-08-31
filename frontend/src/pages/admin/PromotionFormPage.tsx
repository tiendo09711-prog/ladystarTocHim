import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gift, ImagePlus, Loader2, Save, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { AdminImageCropDialog } from '../../components/admin/HomeImageCropEditor'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, NewsArticle, NewsStatus, PromotionProductOption } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const dateTimeInput = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : ''

export function PromotionFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const client = useQueryClient()
  const publishIntent = useRef(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null)
  const [imageError, setImageError] = useState('')
  const [uploading, setUploading] = useState(false)
  const query = useQuery({ queryKey: ['admin-promotion', id], enabled: isEdit, queryFn: async () => (await apiClient.get<ApiResponse<NewsArticle>>(`/admin/promotions/${id}`)).data.data })
  const productsQuery = useQuery({ queryKey: ['promotion-products'], queryFn: async () => (await apiClient.get<ApiResponse<PromotionProductOption[]>>('/admin/promotions/product-options')).data.data })
  const article = query.data

  useEffect(() => { if (!slugTouched) setSlug(slugify(title)) }, [title, slugTouched])
  useEffect(() => {
    if (!article) return
    setTitle(article.title)
    setSlug(article.slug)
    setContent(article.content ?? '')
    setSelectedProductIds((article.products ?? []).map((product) => product.id))
  }, [article])
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => isEdit ? (await apiClient.put<ApiResponse<NewsArticle>>(`/admin/promotions/${id}`, payload)).data.data : (await apiClient.post<ApiResponse<NewsArticle>>('/admin/promotions', payload)).data.data,
    onError: (error: any) => { setErrors(error.response?.data?.errors ?? {}); toast.error(error.response?.data?.message ?? 'Không thể lưu ưu đãi.') },
  })
  const field = (name: string) => errors[name]?.[0] ? <span className='text-sm font-semibold text-red-700'>{errors[name][0]}</span> : null
  const products = productsQuery.data ?? []
  const visibleProducts = useMemo(() => {
    const keyword = productSearch.trim().toLocaleLowerCase('vi')
    if (!keyword) return products
    return products.filter((product) => product.name.toLocaleLowerCase('vi').includes(keyword) || product.base_sku.toLocaleLowerCase('vi').includes(keyword))
  }, [productSearch, products])

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
  const removeCover = async () => {
    try {
      await apiClient.delete(`/admin/promotions/${id}/cover-image`)
      await client.invalidateQueries({ queryKey: ['admin-promotion', id] })
      toast.success('Đã xóa ảnh bìa.')
    } catch { toast.error('Không thể xóa ảnh bìa.') }
  }
  const toggleProduct = (productId: number) => setSelectedProductIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const status: NewsStatus = publishIntent.current ? 'published' : (article?.status === 'published' ? 'published' : 'draft')
    publishIntent.current = false
    setErrors({})
    const form = new FormData(event.currentTarget)
    const payload = {
      title,
      slug,
      excerpt: String(form.get('excerpt') ?? '') || null,
      content,
      cover_image_alt: String(form.get('cover_image_alt') ?? '') || null,
      promotion_badge: String(form.get('promotion_badge') ?? '') || null,
      promotion_conditions: String(form.get('promotion_conditions') ?? '') || null,
      promotion_starts_at: String(form.get('promotion_starts_at') ?? '') || null,
      promotion_ends_at: String(form.get('promotion_ends_at') ?? '') || null,
      product_ids: selectedProductIds,
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
        data.append('cover_image_alt', String(form.get('cover_image_alt') ?? ''))
        await apiClient.post(`/admin/promotions/${saved.id}/cover-image`, data)
      }
      await Promise.all([client.invalidateQueries({ queryKey: ['admin-promotions'] }), client.invalidateQueries({ queryKey: ['promotions-page'] })])
      toast.success(status === 'published' ? 'Đã xuất bản ưu đãi.' : 'Đã lưu ưu đãi.')
      navigate('/admin/promotions')
    } catch { /* handled */ } finally { setUploading(false) }
  }

  if ((isEdit && (query.isLoading || !article)) || productsQuery.isLoading) return <LoadingState />
  const currentImage = imagePreview ?? (article?.cover_image_path ? resolveAssetUrl(article.cover_image_path) : null)

  return <div>
    <div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-3xl font-black'>{isEdit ? 'Chỉnh sửa ưu đãi' : 'Tạo ưu đãi'}</h1><p className='muted'>Chọn đúng sản phẩm áp dụng, điều kiện kích hoạt và ảnh bìa trước khi xuất bản.</p></div><Link className='btn-secondary' to='/admin/promotions'>Hủy</Link></div>
    <form className='grid gap-5' onSubmit={save}>
      <section className='card grid gap-4 p-6'>
        <h2 className='text-xl font-black'>Nội dung ưu đãi</h2>
        <div className='grid gap-4 md:grid-cols-2'><label><span className='label'>Tiêu đề</span><input className='input' value={title} onChange={(event) => setTitle(event.target.value)} required />{field('title')}</label><label><span className='label'>Slug</span><input className='input' value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value) }} required />{field('slug')}</label><label className='md:col-span-2'><span className='label'>Tóm tắt</span><textarea className='input' name='excerpt' defaultValue={article?.excerpt ?? ''} maxLength={500} />{field('excerpt')}</label><label className='md:col-span-2'><span className='label'>Nội dung</span><textarea className='input min-h-56' value={content} onChange={(event) => setContent(event.target.value)} />{field('content')}</label><label><span className='label'>Nhãn ưu đãi</span><input className='input' name='promotion_badge' defaultValue={article?.promotion_badge ?? ''} placeholder='Ví dụ: Giảm 10%' />{field('promotion_badge')}</label><label><span className='label'>Thứ tự hiển thị</span><input className='input' name='sort_order' type='number' min='0' defaultValue={article?.sort_order ?? 0} /></label><label className='md:col-span-2'><span className='label'>Điều kiện kích hoạt ưu đãi</span><textarea className='input min-h-28' name='promotion_conditions' defaultValue={article?.promotion_conditions ?? ''} placeholder='Ví dụ: Áp dụng khi mua sản phẩm được chọn, không cộng dồn chương trình khác...' />{field('promotion_conditions')}</label><label><span className='label'>Bắt đầu áp dụng</span><input className='input' name='promotion_starts_at' type='datetime-local' defaultValue={dateTimeInput(article?.promotion_starts_at)} />{field('promotion_starts_at')}</label><label><span className='label'>Kết thúc áp dụng</span><input className='input' name='promotion_ends_at' type='datetime-local' defaultValue={dateTimeInput(article?.promotion_ends_at)} />{field('promotion_ends_at')}</label><label><span className='label'>SEO title</span><input className='input' name='seo_title' defaultValue={article?.seo_title ?? ''} /></label><label><span className='label'>SEO description</span><input className='input' name='seo_description' defaultValue={article?.seo_description ?? ''} /></label></div>
      </section>

      <section className='card grid gap-4 p-6'>
        <div><h2 className='text-xl font-black'>Sản phẩm được áp dụng</h2><p className='muted mt-1 text-sm'>Ưu đãi chỉ hiển thị trên các sản phẩm được chọn. Cần chọn ít nhất một sản phẩm để xuất bản.</p></div>
        <label className='relative'><span className='sr-only'>Tìm sản phẩm áp dụng</span><Search className='absolute left-3 top-3.5 text-slate-400' size={17} /><input className='input pl-10' value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder='Tìm theo tên hoặc SKU' /></label>
        <div className='grid max-h-[460px] gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3 md:grid-cols-2'>
          {visibleProducts.map((product) => <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selectedProductIds.includes(product.id) ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'}`} key={product.id}><input type='checkbox' checked={selectedProductIds.includes(product.id)} onChange={() => toggleProduct(product.id)} /><img className='h-14 w-14 rounded-xl object-cover' src={resolveAssetUrl(product.image_path, '/images/product-placeholder.svg')} alt='' /><span className='min-w-0'><strong className='block truncate'>{product.name}</strong><small className='text-slate-500'>{product.base_sku}</small></span></label>)}
        </div>
        <p className='text-sm font-bold text-rose-800'>Đã chọn {selectedProductIds.length} sản phẩm.</p>{field('product_ids')}
      </section>

      <section className='card grid gap-4 p-6'>
        <div className='flex flex-wrap items-start justify-between gap-3'><div><h2 className='text-xl font-black'>Ảnh bìa ưu đãi</h2><p className='muted mt-1 text-sm'>Khung cố định 16:9. Ảnh được crop để fill đầy khung, không kéo giãn hoặc làm đổi bố cục.</p></div>{article?.cover_image_path && <button className='btn-secondary text-red-700' type='button' onClick={removeCover}><Trash2 size={16} />Xóa ảnh</button>}</div>
        {currentImage && <div className='fixed-media-frame promotion-admin-cover' style={{ '--media-ratio': '16 / 9' } as React.CSSProperties}><img src={currentImage} alt='' /></div>}
        <label className='btn-secondary w-fit cursor-pointer'><ImagePlus size={17} />Chọn và cắt ảnh<input className='hidden' aria-label='Chọn ảnh bìa ưu đãi' type='file' accept='image/jpeg,image/png,image/webp' onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; chooseImage(file) }} /></label>
        {imageError && <p className='text-sm font-semibold text-red-700'>{imageError}</p>}
        <label><span className='label'>Alt ảnh bìa</span><input className='input' name='cover_image_alt' defaultValue={article?.cover_image_alt ?? ''} /></label>
        {cropSourceFile && <AdminImageCropDialog file={cropSourceFile} title='bìa ưu đãi' mediaKey='promotionCover' onCancel={() => setCropSourceFile(null)} onConfirm={confirmCrop} />}
      </section>

      <div className='flex flex-wrap justify-end gap-2'><Link className='btn-secondary' to='/admin/promotions'>Hủy</Link><button className='btn-secondary' type='submit' onClick={() => { publishIntent.current = false }} disabled={mutation.isPending || uploading}><Save size={17} />Lưu nháp</button><button className='btn-primary' type='submit' onClick={() => { publishIntent.current = true }} disabled={mutation.isPending || uploading}>{mutation.isPending || uploading ? <Loader2 className='animate-spin' size={17} /> : <Gift size={17} />}Xuất bản</button></div>
    </form>
  </div>
}
