import { CreditCard, Headphones, RefreshCcw, Truck } from 'lucide-react'
import { useState } from 'react'
import type { Product } from '../../types'
import { ProductCard } from './ProductCard'

export function ProductDetailSections({ product, related, onConsult }: { product: Product; related: Product[]; onConsult: () => void }) {
  const [tab, setTab] = useState<'info' | 'guide' | 'reviews'>('info')
  return <>
    <section className='product-usp-grid' aria-label='Cam kết mua hàng'>
      <article><Truck /><div><strong>Giao hàng toàn quốc</strong><span>Đóng gói cẩn thận</span></div></article>
      <article><CreditCard /><div><strong>Thanh toán linh hoạt</strong><span>COD hoặc chuyển khoản</span></div></article>
      <article><RefreshCcw /><div><strong>Hỗ trợ đổi trả</strong><span>Theo chính sách LADYSTARS</span></div></article>
      <article><Headphones /><div><strong>Tư vấn tận tâm</strong><span>Đồng hành sau mua</span></div></article>
    </section>
    <section className='product-tabs'>
      <div role='tablist' aria-label='Thông tin sản phẩm'>{[['info', 'THÔNG TIN SẢN PHẨM'], ['guide', 'HƯỚNG DẪN SỬ DỤNG'], ['reviews', 'PHẢN HỒI KHÁCH HÀNG']].map(([id, label]) => <button type='button' role='tab' aria-selected={tab === id} key={id} onClick={() => setTab(id as typeof tab)}>{label}</button>)}</div>
      <div className='product-tab-panel' role='tabpanel'>
        {tab === 'info' && <div className='product-info-panel'><dl><div><dt>Tên sản phẩm</dt><dd>{product.name}</dd></div><div><dt>Mã sản phẩm</dt><dd>{product.base_sku}</dd></div>{product.origin && <div><dt>Xuất xứ</dt><dd>{product.origin}</dd></div>}{product.material && <div><dt>Chất liệu</dt><dd>{product.material}</dd></div>}{product.base_type && <div><dt>Loại đế</dt><dd>{product.base_type}</dd></div>}{product.estimated_lifespan && <div><dt>Tuổi thọ</dt><dd>{product.estimated_lifespan}</dd></div>}</dl><div className='product-rich-text'>{product.description}</div></div>}
        {tab === 'guide' && <div className='product-guide-panel'>{product.usage_instructions && <article><h3>Cách sử dụng</h3><p>{product.usage_instructions}</p></article>}{product.care_instructions && <article><h3>Chăm sóc sản phẩm</h3><p>{product.care_instructions}</p></article>}{product.warranty_information && <article><h3>Bảo hành</h3><p>{product.warranty_information}</p></article>}</div>}
        {tab === 'reviews' && <div className='product-review-list'>{product.reviews?.length ? product.reviews.map((review) => <article key={review.id}><div aria-label={review.rating + ' sao'}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>{review.title && <h3>{review.title}</h3>}{review.content && <p>{review.content}</p>}<small>{review.reviewer_name || 'Khách hàng'} · {new Date(review.created_at).toLocaleDateString('vi-VN')}</small></article>) : <p>Chưa có đánh giá cho sản phẩm này.</p>}</div>}
      </div>
    </section>
    {related.length > 0 && <section className='product-related'><h2>CÓ THỂ BẠN SẼ THÍCH</h2><div>{related.map((item) => <ProductCard product={item} key={item.id} />)}</div></section>}
    <section className='product-consultation'><div><p>LADYSTARS CARE</p><h2>Chọn giải pháp tóc phù hợp cùng chuyên viên</h2><span>Đặt lịch để được tư vấn riêng về kích thước, màu tóc và loại đế.</span><button className='btn-primary' type='button' onClick={onConsult}>Đặt lịch tư vấn</button></div><img src='/images/brand/ladystars-hero.svg' alt='Tư vấn sản phẩm tóc LADYSTARS' /></section>
  </>
}
