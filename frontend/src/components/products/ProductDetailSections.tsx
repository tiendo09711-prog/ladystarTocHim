import { useState } from 'react'
import type { CatalogContent, Product } from '../../types'
import { ProductCard } from './ProductCard'

export function ProductDetailSections({ product, related, content, appointmentsEnabled, onConsult }: { product: Product; related: Product[]; content?: CatalogContent | null; appointmentsEnabled: boolean; onConsult: () => void }) {
  const [tab, setTab] = useState<'info' | 'guide' | 'reviews'>('info')
  return <>
    <section className='product-tabs'>
      <div role='tablist' aria-label='Thông tin sản phẩm'>{[['info', 'THÔNG TIN SẢN PHẨM'], ['guide', 'HƯỚNG DẪN SỬ DỤNG'], ['reviews', 'PHẢN HỒI KHÁCH HÀNG']].map(([id, label]) => <button type='button' role='tab' aria-selected={tab === id} key={id} onClick={() => setTab(id as typeof tab)}>{label}</button>)}</div>
      <div className='product-tab-panel' role='tabpanel'>
        {tab === 'info' && <div className='product-info-panel'><dl><div><dt>Tên sản phẩm</dt><dd>{product.name}</dd></div><div><dt>Mã sản phẩm</dt><dd>{product.base_sku}</dd></div>{product.origin && <div><dt>Xuất xứ</dt><dd>{product.origin}</dd></div>}{product.material && <div><dt>Chất liệu</dt><dd>{product.material}</dd></div>}{product.base_type && <div><dt>Loại đế</dt><dd>{product.base_type}</dd></div>}{product.estimated_lifespan && <div><dt>Tuổi thọ</dt><dd>{product.estimated_lifespan}</dd></div>}</dl><div className='product-rich-text'>{product.description}</div></div>}
        {tab === 'guide' && <div className='product-guide-panel'>{product.usage_instructions && <article><h3>Cách sử dụng</h3><p>{product.usage_instructions}</p></article>}{product.care_instructions && <article><h3>Chăm sóc sản phẩm</h3><p>{product.care_instructions}</p></article>}{product.warranty_information && <article><h3>Bảo hành</h3><p>{product.warranty_information}</p></article>}</div>}
        {tab === 'reviews' && <div className='product-review-list'>{product.reviews?.length ? product.reviews.map((review) => <article key={review.id}><div aria-label={review.rating + ' sao'}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>{review.title && <h3>{review.title}</h3>}{review.content && <p>{review.content}</p>}<small>{review.reviewer_name || 'Khách hàng'} · {new Date(review.created_at).toLocaleDateString('vi-VN')}</small></article>) : <p>Chưa có đánh giá cho sản phẩm này.</p>}</div>}
      </div>
    </section>
    {related.length > 0 && <section className='product-related'><h2>CÓ THỂ BẠN SẼ THÍCH</h2><div>{related.map((item) => <ProductCard product={item} key={item.id} />)}</div></section>}
    {appointmentsEnabled && content?.consultation_title && <section className='product-consultation'><div>{content.eyebrow && <p>{content.eyebrow}</p>}<h2>{content.consultation_title}</h2>{content.consultation_body && <span>{content.consultation_body}</span>}<button className='btn-primary' type='button' onClick={onConsult}>{content.consultation_cta_label || 'Đặt lịch tư vấn'}</button></div>{content.consultation_image_path && <img src={content.consultation_image_path} alt={content.consultation_image_alt || content.consultation_title} />}</section>}
  </>
}
