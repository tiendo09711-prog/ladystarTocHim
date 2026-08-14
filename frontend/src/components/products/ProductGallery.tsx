import { useEffect, useMemo, useState } from 'react'
import type { ProductImage } from '../../types'

export function ProductGallery({ images, productName, variantId }: { images: ProductImage[]; productName: string; variantId: number | null }) {
  const gallery = useMemo(() => {
    const sortImages = (items: ProductImage[]) => [...items].sort((left, right) => Number(right.is_primary) - Number(left.is_primary) || (left.sort_order ?? 0) - (right.sort_order ?? 0))
    const shared = sortImages(images.filter((image) => !image.product_variant_id))
    const selected = sortImages(variantId ? images.filter((image) => image.product_variant_id === variantId) : [])
    const result = [...selected, ...shared]
    return result.length ? result : images
  }, [images, variantId])
  const [activeId, setActiveId] = useState<number | null>(gallery[0]?.id ?? null)
  useEffect(() => setActiveId(gallery[0]?.id ?? null), [gallery])
  const active = gallery.find((image) => image.id === activeId) ?? gallery[0]

  return <section className='product-gallery' aria-label='Thư viện ảnh sản phẩm'>
    <div className='product-gallery-thumbs'>{gallery.map((image, index) => <button type='button' key={image.id} aria-label={'Xem ảnh ' + (index + 1)} aria-pressed={image.id === active?.id} onClick={() => setActiveId(image.id)}><img src={image.image_path} alt='' /></button>)}</div>
    <div className='product-gallery-main'><img src={active?.image_path || '/images/product-placeholder.svg'} alt={active?.alt_text || productName} /></div>
  </section>
}
