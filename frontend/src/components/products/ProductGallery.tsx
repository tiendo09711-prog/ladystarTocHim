import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProductImage } from '../../types'

const imageMediaId = (image: ProductImage) => `image-${image.id}`

export function ProductGallery({ images, productName, variantId, videoPath }: { images: ProductImage[]; productName: string; variantId: number | null; videoPath?: string | null }) {
  const gallery = useMemo(() => {
    const sortImages = (items: ProductImage[]) => [...items].sort((left, right) => Number(right.is_primary) - Number(left.is_primary) || (left.sort_order ?? 0) - (right.sort_order ?? 0))
    const shared = sortImages(images.filter((image) => !image.product_variant_id))
    const selected = sortImages(variantId ? images.filter((image) => image.product_variant_id === variantId) : [])
    const result = [...selected, ...shared]
    return result.length ? result : sortImages(images)
  }, [images, variantId])
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activeMediaId, setActiveMediaId] = useState(videoPath ? 'video' : gallery[0] ? imageMediaId(gallery[0]) : null)

  useEffect(() => {
    setActiveMediaId(videoPath ? 'video' : gallery[0] ? imageMediaId(gallery[0]) : null)
  }, [videoPath])
  useEffect(() => {
    setActiveMediaId((current) => current === 'video' ? current : gallery[0] ? imageMediaId(gallery[0]) : null)
  }, [gallery, variantId])
  useEffect(() => {
    if (activeMediaId !== 'video' || !videoRef.current) return
    videoRef.current.currentTime = 0
    void videoRef.current.play().catch(() => undefined)
  }, [activeMediaId])

  const activeImage = gallery.find((image) => imageMediaId(image) === activeMediaId) ?? gallery[0]
  const selectImage = (image: ProductImage) => {
    videoRef.current?.pause()
    setActiveMediaId(imageMediaId(image))
  }
  const selectVideo = () => {
    if (activeMediaId === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0
      void videoRef.current.play().catch(() => undefined)
      return
    }
    setActiveMediaId('video')
  }

  return <section className='product-gallery' aria-label='Thư viện media sản phẩm'>
    <div className='product-gallery-thumbs'>
      {videoPath && <button type='button' aria-label='Xem video sản phẩm' aria-pressed={activeMediaId === 'video'} onClick={selectVideo}><span className='product-gallery-video-thumb' aria-hidden='true'>▶</span></button>}
      {gallery.map((image, index) => <button type='button' key={image.id} aria-label={'Xem ảnh ' + (index + 1)} aria-pressed={imageMediaId(image) === activeMediaId} onClick={() => selectImage(image)}><img src={image.image_path} alt='' /></button>)}
    </div>
    <div className='product-gallery-main'>
      {videoPath && activeMediaId === 'video'
        ? <video ref={videoRef} src={videoPath} aria-label={`Video sản phẩm ${productName}`} autoPlay muted playsInline controls onEnded={() => setActiveMediaId(activeImage ? imageMediaId(activeImage) : null)} />
        : <img src={activeImage?.image_path || '/images/product-placeholder.svg'} alt={activeImage?.alt_text || productName} />}
    </div>
  </section>
}
