export function ProductDetailSkeleton() {
  return <div className='product-detail-skeleton' aria-label='Đang tải sản phẩm'>
    <div className='product-detail-skeleton-gallery'><span /><span /><span /><span /></div>
    <div className='product-detail-skeleton-copy'><span className='wide' /><span className='title' /><span className='price' /><span /><span /><span className='options' /><span className='options' /><span className='cta' /></div>
  </div>
}
