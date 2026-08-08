import { ChevronDown, ChevronUp, ExternalLink, Plus, Save, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import type { ApiResponse, Category } from '../../types'

type EditorialSection = { title: string; body: string }
type TrustItem = { title: string; description?: string }
type GuideProduct = { product_id: number; badge?: string; note?: string }
type ProductOption = { id: number; name: string; base_sku: string; category?: Pick<Category, 'id' | 'name'> | null; status: string; image_path?: string | null }
type Content = {
  page_key: string
  eyebrow?: string
  title?: string
  subtitle?: string
  hero_image_path?: string | null
  hero_image_alt?: string
  editorial_title?: string
  editorial_intro?: string
  editorial_sections_json?: EditorialSection[]
  consultation_title?: string
  consultation_body?: string
  consultation_image_path?: string | null
  consultation_image_alt?: string
  consultation_cta_label?: string
  is_active?: boolean
  settings_json?: {
    hero_badge?: string
    trust_items?: TrustItem[]
    guide_grid_title?: string
    guide_grid_intro?: string
    guide_products?: GuideProduct[]
    product_primary_cta_label?: string
    product_secondary_cta_label?: string
    consultation_benefits?: string[]
  }
  seo?: { title?: string; description?: string } | null
}
type IndexData = { categories: Category[]; products: ProductOption[] }
type ValidationErrors = Record<string, string[]>

const blankSection = (): EditorialSection => ({ title: '', body: '' })
const blankTrust = (): TrustItem => ({ title: '', description: '' })

export function CatalogContentAdminPage() {
  const [pageKey, setPageKey] = useState('products')
  const [content, setContent] = useState<Content | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [errors, setErrors] = useState<ValidationErrors>({})
  const index = useQuery({ queryKey: ['admin-catalog-content'], queryFn: async () => (await apiClient.get<ApiResponse<IndexData>>('/admin/catalog/content')).data.data })
  const detail = useQuery({ queryKey: ['admin-catalog-content', pageKey], queryFn: async () => (await apiClient.get<ApiResponse<Content>>(`/admin/catalog/content/${pageKey}`)).data.data })

  useEffect(() => { if (detail.data) { setContent(detail.data); setErrors({}); setProductSearch('') } }, [detail.data])

  const isHairGuide = pageKey === 'hair-guide'
  const sections = content?.editorial_sections_json ?? []
  const trustItems = content?.settings_json?.trust_items ?? []
  const guideProducts = content?.settings_json?.guide_products ?? []
  const productOptions = index.data?.products ?? []
  const selectedProductIds = new Set(guideProducts.map((item) => item.product_id))
  const availableProducts = useMemo(() => productOptions.filter((product) => !selectedProductIds.has(product.id) && `${product.name} ${product.base_sku}`.toLocaleLowerCase().includes(productSearch.toLocaleLowerCase())), [productOptions, productSearch, selectedProductIds])
  const publicPath = pageKey === 'products' ? '/san-pham' : isHairGuide ? '/dich-vu-cham-soc' : `/danh-muc/${index.data?.categories.find((item) => `category-${item.id}` === pageKey)?.slug ?? ''}`

  const update = <K extends keyof Content>(field: K, value: Content[K]) => setContent((current) => current ? { ...current, [field]: value } : current)
  const updateSettings = (changes: Partial<NonNullable<Content['settings_json']>>) => setContent((current) => current ? { ...current, settings_json: { ...current.settings_json, ...changes } } : current)
  const move = <T,>(items: T[], index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return items
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  }
  const fieldError = (field: string) => errors[field]?.[0]
  const setApiErrors = (error: unknown) => {
    const nextErrors = (error as { response?: { data?: { errors?: ValidationErrors } } }).response?.data?.errors ?? {}
    setErrors(nextErrors)
    toast.error(Object.keys(nextErrors).length ? 'Vui lòng kiểm tra các trường được đánh dấu.' : 'Không thể lưu nội dung. Vui lòng thử lại.')
  }

  const upload = async (slot: 'hero' | 'consultation', file?: File) => {
    if (!file) return
    const form = new FormData()
    form.set('slot', slot)
    form.set('image', file)
    try { await apiClient.post(`/admin/catalog/content/${pageKey}/images`, form); toast.success('Đã tải ảnh.'); await detail.refetch() } catch (error) { setApiErrors(error) }
  }
  const removeImage = async (slot: 'hero' | 'consultation') => {
    try { await apiClient.delete(`/admin/catalog/content/${pageKey}/images`, { data: { slot } }); toast.success('Đã xóa ảnh.'); await detail.refetch() } catch (error) { setApiErrors(error) }
  }
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!content) return
    try { await apiClient.put(`/admin/catalog/content/${pageKey}`, content); toast.success('Đã lưu nội dung trang sản phẩm.'); await detail.refetch() } catch (error) { setApiErrors(error) }
  }

  if (detail.isLoading || !content) return <div className="card p-8">Đang tải nội dung...</div>

  return <form onSubmit={save} noValidate>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">{isHairGuide ? 'Nội dung Dịch vụ chăm sóc tóc' : 'Nội dung trang sản phẩm'}</h1><p className="muted">Quản trị hero, nội dung biên tập, tư vấn và SEO của catalog.</p></div><a className="btn-secondary" href={publicPath} target="_blank" rel="noreferrer"><ExternalLink size={17} />Mở trang public</a></div>

    <section className="card p-5"><label><span className="label">Trang cần chỉnh</span><select className="input max-w-md" value={pageKey} onChange={(event) => setPageKey(event.target.value)}><option value="products">Trang tổng /san-pham</option><option value="hair-guide">Dịch vụ chăm sóc tóc — /dich-vu-cham-soc</option>{index.data?.categories.map((item) => <option key={item.id} value={`category-${item.id}`}>Danh mục: {item.name}</option>)}</select></label></section>

    <section className="card mt-5 p-5"><h2 className="text-xl font-black">Hero</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="label">Eyebrow</span><input className="input" value={content.eyebrow ?? ''} onChange={(event) => update('eyebrow', event.target.value)} /></label><label><span className="label">Badge</span><input className="input" value={content.settings_json?.hero_badge ?? ''} onChange={(event) => updateSettings({ hero_badge: event.target.value })} /></label><label><span className="label">Tiêu đề</span><input className="input" value={content.title ?? ''} onChange={(event) => update('title', event.target.value)} /></label><label><span className="label">Alt ảnh hero</span><input className="input" value={content.hero_image_alt ?? ''} onChange={(event) => update('hero_image_alt', event.target.value)} /></label><label className="md:col-span-2"><span className="label">Subtitle</span><textarea className="input min-h-24" value={content.subtitle ?? ''} onChange={(event) => update('subtitle', event.target.value)} /></label></div><div className="mt-4 flex flex-wrap items-center gap-3"><label className="btn-secondary cursor-pointer"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload('hero', event.target.files?.[0])} />Tải ảnh hero</label>{content.hero_image_path && <><a className="text-sm underline" href={content.hero_image_path} target="_blank" rel="noreferrer">Xem ảnh hiện tại</a><button type="button" className="btn-secondary" onClick={() => removeImage('hero')}>Xóa ảnh</button></>}</div>{content.hero_image_path && <img className="mt-4 max-h-64 rounded-2xl border object-cover" src={content.hero_image_path} alt={content.hero_image_alt ?? ''} />}</section>

    <section className="card mt-5 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Điểm tin cậy</h2><p className="muted text-sm">Tối đa 4 điểm hiển thị dưới hero.</p></div><button type="button" className="btn-secondary" disabled={trustItems.length >= 4} onClick={() => updateSettings({ trust_items: [...trustItems, blankTrust()] })}><Plus size={16} />Thêm điểm</button></div><div className="mt-4 grid gap-3">{trustItems.map((item, itemIndex) => <div key={`${item.title}-${itemIndex}`} className="grid gap-3 rounded-2xl border border-[var(--color-border)] p-4 md:grid-cols-[1fr_1.5fr_auto]"><label><span className="label">Tiêu đề</span><input className="input" value={item.title} onChange={(event) => updateSettings({ trust_items: trustItems.map((value, index) => index === itemIndex ? { ...value, title: event.target.value } : value) })} /></label><label><span className="label">Mô tả</span><input className="input" value={item.description ?? ''} onChange={(event) => updateSettings({ trust_items: trustItems.map((value, index) => index === itemIndex ? { ...value, description: event.target.value } : value) })} /></label><div className="flex items-end gap-2"><button className="btn-secondary px-3" type="button" aria-label={`Di chuyển điểm tin cậy ${itemIndex + 1} lên`} disabled={itemIndex === 0} onClick={() => updateSettings({ trust_items: move(trustItems, itemIndex, -1) })}><ChevronUp size={16} /></button><button className="btn-secondary px-3" type="button" aria-label={`Di chuyển điểm tin cậy ${itemIndex + 1} xuống`} disabled={itemIndex === trustItems.length - 1} onClick={() => updateSettings({ trust_items: move(trustItems, itemIndex, 1) })}><ChevronDown size={16} /></button><button className="btn-secondary px-3 text-red-700" type="button" aria-label={`Xóa điểm tin cậy ${itemIndex + 1}`} onClick={() => updateSettings({ trust_items: trustItems.filter((_, index) => index !== itemIndex) })}><Trash2 size={16} /></button></div></div>)}</div></section>

    {isHairGuide && <section className="card mt-5 p-5"><div><h2 className="text-xl font-black">Danh sách sản phẩm hướng dẫn</h2><p className="muted mt-1 text-sm">Chỉ chọn và sắp xếp Product hiện có; tên, ảnh và giá tiếp tục quản lý ở Product Admin.</p></div><div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="label">Tiêu đề grid</span><input className="input" value={content.settings_json?.guide_grid_title ?? ''} onChange={(event) => updateSettings({ guide_grid_title: event.target.value })} /></label><label><span className="label">Tìm sản phẩm theo tên/SKU</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} /><input className="input pl-10" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Nhập tên hoặc SKU" /></span></label><label className="md:col-span-2"><span className="label">Giới thiệu grid</span><textarea className="input min-h-20" value={content.settings_json?.guide_grid_intro ?? ''} onChange={(event) => updateSettings({ guide_grid_intro: event.target.value })} /></label></div><div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background-muted)] p-4"><label><span className="label">Thêm sản phẩm ({guideProducts.length}/12)</span><select className="input" value="" disabled={guideProducts.length >= 12} onChange={(event) => { const productId = Number(event.target.value); if (productId) updateSettings({ guide_products: [...guideProducts, { product_id: productId, badge: '', note: '' }] }) }}><option value="">Chọn sản phẩm hiện có</option>{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.base_sku}</option>)}</select></label><p className="mt-2 text-sm text-[var(--color-text-muted)]">Gợi ý chọn 6 hoặc 9 sản phẩm để lưới desktop cân đối.</p></div><div className="mt-4 grid gap-3">{guideProducts.map((item, itemIndex) => { const product = productOptions.find((value) => value.id === item.product_id); return <article key={`${item.product_id}-${itemIndex}`} className="grid gap-4 rounded-2xl border border-[var(--color-border)] p-4 lg:grid-cols-[88px_1fr_1fr_auto]"><div className="h-[88px] overflow-hidden rounded-xl bg-[var(--color-brand-pale)]">{product?.image_path ? <img className="h-full w-full object-cover" src={product.image_path} alt="" /> : <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">Chưa có ảnh</div>}</div><div><strong>{product?.name ?? `Sản phẩm #${item.product_id}`}</strong><p className="mt-1 text-sm text-[var(--color-text-muted)]">{product ? `${product.base_sku} · ${product.category?.name ?? 'Chưa phân loại'} · ${product.status}` : 'Sản phẩm không còn khả dụng'}</p>{product && <Link className="mt-2 inline-block text-sm font-bold text-[var(--color-brand-deep)] underline" to={`/admin/products/${product.id}/edit`}>Sửa sản phẩm</Link>}</div><div className="grid gap-3"><label><span className="label">Badge</span><input className="input" maxLength={80} value={item.badge ?? ''} onChange={(event) => updateSettings({ guide_products: guideProducts.map((value, index) => index === itemIndex ? { ...value, badge: event.target.value } : value) })} /></label><label><span className="label">Note</span><textarea className="input min-h-20" maxLength={240} value={item.note ?? ''} onChange={(event) => updateSettings({ guide_products: guideProducts.map((value, index) => index === itemIndex ? { ...value, note: event.target.value } : value) })} /></label></div><div className="flex items-start gap-2 lg:flex-col"><button className="btn-secondary px-3" type="button" aria-label={`Di chuyển sản phẩm ${itemIndex + 1} lên`} disabled={itemIndex === 0} onClick={() => updateSettings({ guide_products: move(guideProducts, itemIndex, -1) })}><ChevronUp size={16} /></button><button className="btn-secondary px-3" type="button" aria-label={`Di chuyển sản phẩm ${itemIndex + 1} xuống`} disabled={itemIndex === guideProducts.length - 1} onClick={() => updateSettings({ guide_products: move(guideProducts, itemIndex, 1) })}><ChevronDown size={16} /></button><button className="btn-secondary px-3 text-red-700" type="button" aria-label={`Bỏ sản phẩm ${itemIndex + 1}`} onClick={() => updateSettings({ guide_products: guideProducts.filter((_, index) => index !== itemIndex) })}><Trash2 size={16} /></button></div></article> })}</div><div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="label">CTA xem chi tiết</span><input className="input" maxLength={80} value={content.settings_json?.product_primary_cta_label ?? ''} onChange={(event) => updateSettings({ product_primary_cta_label: event.target.value })} /></label><label><span className="label">CTA nhận tư vấn</span><input className="input" maxLength={80} value={content.settings_json?.product_secondary_cta_label ?? ''} onChange={(event) => updateSettings({ product_secondary_cta_label: event.target.value })} /></label></div>{fieldError('settings_json.guide_products') && <p className="mt-3 text-sm font-bold text-red-700">{fieldError('settings_json.guide_products')}</p>}</section>}

    <section className="card mt-5 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">{isHairGuide ? 'Tiêu chí lựa chọn' : 'Nội dung biên tập'}</h2><p className="muted text-sm">{isHairGuide ? 'Từ 4 đến 6 mục cho Hair Guide.' : 'Các mục thông tin mở rộng của trang.'}</p></div><button type="button" className="btn-secondary" disabled={sections.length >= (isHairGuide ? 6 : 8)} onClick={() => update('editorial_sections_json', [...sections, blankSection()])}><Plus size={16} />Thêm mục</button></div><div className="mt-4 grid gap-4"><label><span className="label">Tiêu đề phần</span><input className="input" value={content.editorial_title ?? ''} onChange={(event) => update('editorial_title', event.target.value)} /></label><label><span className="label">Giới thiệu</span><textarea className="input min-h-24" value={content.editorial_intro ?? ''} onChange={(event) => update('editorial_intro', event.target.value)} /></label>{sections.map((section, sectionIndex) => <article key={`${section.title}-${sectionIndex}`} className="rounded-2xl border border-[var(--color-border)] p-4"><div className="grid gap-3 md:grid-cols-[1fr_auto]"><label><span className="label">Tiêu đề mục {sectionIndex + 1}</span><input className="input" value={section.title} onChange={(event) => update('editorial_sections_json', sections.map((value, index) => index === sectionIndex ? { ...value, title: event.target.value } : value))} /></label><div className="flex items-end gap-2"><button className="btn-secondary px-3" type="button" aria-label={`Di chuyển mục ${sectionIndex + 1} lên`} disabled={sectionIndex === 0} onClick={() => update('editorial_sections_json', move(sections, sectionIndex, -1))}><ChevronUp size={16} /></button><button className="btn-secondary px-3" type="button" aria-label={`Di chuyển mục ${sectionIndex + 1} xuống`} disabled={sectionIndex === sections.length - 1} onClick={() => update('editorial_sections_json', move(sections, sectionIndex, 1))}><ChevronDown size={16} /></button><button className="btn-secondary px-3 text-red-700" type="button" aria-label={`Xóa mục ${sectionIndex + 1}`} disabled={isHairGuide && sections.length <= 4} onClick={() => update('editorial_sections_json', sections.filter((_, index) => index !== sectionIndex))}><Trash2 size={16} /></button></div></div><label className="mt-3 block"><span className="label">Nội dung</span><textarea className="input min-h-24" value={section.body} onChange={(event) => update('editorial_sections_json', sections.map((value, index) => index === sectionIndex ? { ...value, body: event.target.value } : value))} /></label></article>)}</div>{fieldError('editorial_sections_json') && <p className="mt-3 text-sm font-bold text-red-700">{fieldError('editorial_sections_json')}</p>}</section>

    <section className="card mt-5 p-5"><h2 className="text-xl font-black">Tư vấn</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="label">Tiêu đề</span><input className="input" value={content.consultation_title ?? ''} onChange={(event) => update('consultation_title', event.target.value)} /></label><label><span className="label">CTA</span><input className="input" value={content.consultation_cta_label ?? ''} onChange={(event) => update('consultation_cta_label', event.target.value)} /></label><label><span className="label">Alt ảnh tư vấn</span><input className="input" value={content.consultation_image_alt ?? ''} onChange={(event) => update('consultation_image_alt', event.target.value)} /></label><label><span className="label">Benefits, mỗi dòng một ý</span><textarea className="input" value={(content.settings_json?.consultation_benefits ?? []).join('\n')} onChange={(event) => updateSettings({ consultation_benefits: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /></label><label className="md:col-span-2"><span className="label">Nội dung</span><textarea className="input min-h-24" value={content.consultation_body ?? ''} onChange={(event) => update('consultation_body', event.target.value)} /></label></div><div className="mt-4 flex flex-wrap items-center gap-3"><label className="btn-secondary cursor-pointer"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload('consultation', event.target.files?.[0])} />Tải ảnh tư vấn</label>{content.consultation_image_path && <><a className="text-sm underline" href={content.consultation_image_path} target="_blank" rel="noreferrer">Xem ảnh hiện tại</a><button type="button" className="btn-secondary" onClick={() => removeImage('consultation')}>Xóa ảnh</button></>}</div></section>

    <section className="card mt-5 p-5"><h2 className="text-xl font-black">SEO</h2><div className="mt-4 grid gap-4"><label><span className="label">SEO title</span><input className="input" value={content.seo?.title ?? ''} onChange={(event) => update('seo', { ...content.seo, title: event.target.value })} /></label><label><span className="label">SEO description</span><textarea className="input" value={content.seo?.description ?? ''} onChange={(event) => update('seo', { ...content.seo, description: event.target.value })} /></label></div></section>
    <button className="btn-primary mt-5"><Save size={17} />Lưu thay đổi</button>
  </form>
}
