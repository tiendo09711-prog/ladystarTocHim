import { Heart, Minus, Plus, RotateCcw, ShoppingBag, Star } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GitCompareArrows, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { getProduct, getProducts } from '../../api/storeApi'
import { ConsultationDialog } from '../../components/store/ConsultationDialog'
import { ProductDetailSections } from '../../components/products/ProductDetailSections'
import { ProductDetailSkeleton } from '../../components/products/ProductDetailSkeleton'
import { ProductGallery } from '../../components/products/ProductGallery'
import { ProductOptionGroup } from '../../components/products/ProductOptionGroup'
import { RecentlyViewedProducts } from '../../components/products/RecentlyViewedProducts'
import { resolveProductVariant, type SelectedOptions } from '../../features/products/variantSelection'
import { addCompareProduct, rememberProduct } from '../../features/products/productMemory'
import { useAuth } from '../../stores/AuthContext'
import { useCart } from '../../stores/CartContext'
import { formatPrice } from '../../utils/format'
import { shareProduct } from '../../utils/browserActions'
import './ProductPage.css'

export function ProductPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { user } = useAuth()
  const query = useQuery({ queryKey: ['product', slug], queryFn: () => getProduct(slug) })
  const product = query.data
  const relatedQuery = useQuery({ queryKey: ['related-products', product?.id], enabled: Boolean(product?.category?.slug), queryFn: () => getProducts({ category: product?.category?.slug, per_page: 8 }) })
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({})
  const [quantity, setQuantity] = useState(1)
  const [missingOptionId, setMissingOptionId] = useState<number | null>(null)
  const [consultationOpen, setConsultationOpen] = useState(false)

  useEffect(() => { setSelectedOptions({}); setQuantity(1); setMissingOptionId(null) }, [product?.id])
  const optionGroups = product?.variant_options ?? []
  const requiredIds = optionGroups.map((option) => option.id)
  const selectedVariant = product ? resolveProductVariant(product.variants, selectedOptions, requiredIds) : null
  useEffect(() => setQuantity(1), [selectedVariant?.id])
  useEffect(() => { if (product?.id) rememberProduct(product.id, selectedVariant?.id) }, [product?.id, selectedVariant?.id])
  const related = useMemo(() => (relatedQuery.data?.data ?? []).filter((item) => item.id !== product?.id).slice(0, 8), [relatedQuery.data, product?.id])

  if (query.isLoading) return <div className='container-page product-detail-page'><ProductDetailSkeleton /></div>
  if (!product) return <div className='container-page py-16 text-center'>Không tìm thấy sản phẩm.</div>

  const chooseOption = (attributeId: number, valueId: number) => {
    setSelectedOptions((current) => ({ ...current, [attributeId]: valueId }))
    setMissingOptionId(null)
  }
  const reset = () => { setSelectedOptions({}); setQuantity(1); setMissingOptionId(null) }
  const buyNow = async () => {
    const missing = optionGroups.find((option) => !selectedOptions[option.id])
    if (missing) {
      setMissingOptionId(missing.id)
      document.querySelector('[data-option-group=' + String(missing.id) + ']')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!selectedVariant) { toast.error('Tổ hợp lựa chọn không hợp lệ. Vui lòng chọn lại.'); return }
    if (selectedVariant.stock < 1) { toast.error('Biến thể này đã hết hàng.'); return }
    await addItem(product, selectedVariant, quantity)
    toast.success('Thêm vào giỏ hàng thành công!')
    navigate('/thanh-toan')
  }
  const addWishlist = async () => {
    if (!user) { navigate('/dang-nhap', { state: { from: '/san-pham/' + product.slug } }); return }
    await apiClient.post('/account/wishlist/' + product.id, { product_variant_id: selectedVariant?.id ?? null })
    toast.success('Đã thêm vào danh sách yêu thích.')
  }
  const compare = () => {
    const result = addCompareProduct(product.id)
    if (result === 'limit') toast.error('Bạn chỉ có thể so sánh tối đa 4 sản phẩm.')
    else toast.success(result === 'exists' ? 'Sản phẩm đã có trong danh sách so sánh.' : 'Đã thêm vào so sánh.')
  }
  const share = async () => {
    try {
      const nativeShare = Boolean(navigator.share)
      await shareProduct(product)
      toast.success(nativeShare ? 'Đã mở chia sẻ sản phẩm.' : 'Đã sao chép liên kết sản phẩm.')
    } catch { return }
  }
  const priceLabel = selectedVariant ? formatPrice(selectedVariant.current_price) : product.price_min === product.price_max ? formatPrice(product.price_min ?? 0) : 'Từ ' + formatPrice(product.price_min ?? 0)

  return <div className='container-page product-detail-page'>
    <div className='product-breadcrumb'><Link to='/'>Trang chủ</Link><span>/</span><Link to='/san-pham'>Sản phẩm</Link><span>/</span><span>{product.name}</span></div>
    <div className='product-detail-top'>
      <ProductGallery images={product.images} productName={product.name} variantId={selectedVariant?.id ?? null} videoPath={product.video_path} />
      <section className='product-configurator'>
        <div className='product-rating-row'><span><Star size={17} fill='currentColor' />{product.rating_average || 'Mới'}</span><span>ĐÃ BÁN {product.sold_count ?? 0}</span><span>{product.reviews_count} Đánh giá</span></div>
        <h1>{product.name}</h1>
        <div className='product-sku'>{selectedVariant ? 'SKU: ' + selectedVariant.sku : 'MÃ SẢN PHẨM: ' + product.base_sku}</div>
        <div className='product-price-row'><strong>{priceLabel}</strong>{selectedVariant?.sale_price && <del>{formatPrice(selectedVariant.price)}</del>}</div>
        {product.short_description && <p className='product-summary'>{product.short_description}</p>}
        <button type='button' className='product-reset' onClick={reset}><RotateCcw size={16} />Chọn lại</button>
        <div className='product-option-groups'>{optionGroups.map((option) => <ProductOptionGroup key={option.id} option={option} variants={product.variants} selection={selectedOptions} error={missingOptionId === option.id} onSelect={chooseOption} />)}</div>
        <div className='product-quantity-row'><span>Số lượng</span><div><button type='button' aria-label='Giảm số lượng' onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={17} /></button><strong>{quantity}</strong><button type='button' aria-label='Tăng số lượng' disabled={!selectedVariant || quantity >= selectedVariant.stock} onClick={() => setQuantity(Math.min(selectedVariant?.stock ?? 1, quantity + 1))}><Plus size={17} /></button></div><small>{selectedVariant ? selectedVariant.stock > 0 ? 'Còn ' + selectedVariant.stock + ' sản phẩm' : 'Hết hàng' : 'Chọn đủ cấu hình để xem tồn kho'}</small></div>
        <div className='product-cta-row'><button type='button' className='btn-primary' onClick={buyNow}><ShoppingBag size={18} />ĐẶT MUA NGAY</button><button type='button' className='btn-secondary' onClick={() => setConsultationOpen(true)}>ĐẶT LỊCH TƯ VẤN</button><button type='button' className='product-wishlist' onClick={addWishlist} aria-label='Thêm vào yêu thích'><Heart size={20} /></button></div><div className='mt-3 flex flex-wrap gap-4'><button type='button' className='flex items-center gap-2 text-sm font-bold text-emerald-800' onClick={compare}><GitCompareArrows size={17} />Thêm vào so sánh</button><button type='button' className='flex items-center gap-2 text-sm font-bold text-emerald-800' onClick={() => void share()}><Share2 size={17} />Chia sẻ</button></div>
      </section>
    </div>
    <ProductDetailSections product={product} related={related} onConsult={() => setConsultationOpen(true)} />
    <RecentlyViewedProducts excludeProductId={product.id} />
    <ConsultationDialog open={consultationOpen} onClose={() => setConsultationOpen(false)} productId={product.id} context={selectedVariant?.attributes.map((item) => (item.attribute_name || '') + ': ' + item.value).join(' · ')} />
  </div>
}
