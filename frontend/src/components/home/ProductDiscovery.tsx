import { ChevronRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getCategories, getProducts } from '../../api/storeApi'
import { EmptyState } from '../common/EmptyState'
import { LoadingState } from '../common/LoadingState'
import { ProductCard } from '../products/ProductCard'
import type { HomePageSections } from '../../types'

export function ProductDiscovery({ content }: { content: HomePageSections['products'] }) {
  const [activeCategory, setActiveCategory] = useState('all')
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const products = useQuery({
    queryKey: ['homepage-products', activeCategory],
    queryFn: () => getProducts(activeCategory === 'all' ? { is_featured: true, per_page: 8 } : { category: activeCategory, per_page: 8 }),
  })

  return <section className="container-page home-section" aria-labelledby="product-discovery-title">
    <div className="home-section-heading home-section-heading-center">
      <p className="home-kicker"><Sparkles size={15} /> {content.kicker}</p>
      <h2 id="product-discovery-title">{content.title}</h2>
      <p>{content.description}</p>
    </div>
    {categories.isLoading ? <LoadingState label="Đang tải danh mục..." /> : categories.isError ? <EmptyState title="Chưa thể tải danh mục" description="Vui lòng thử lại sau ít phút." /> : <>
      <div className="home-category-tabs" role="tablist" aria-label="Danh mục sản phẩm">
        <button type="button" role="tab" aria-selected={activeCategory === 'all'} className={activeCategory === 'all' ? 'is-active' : ''} onClick={() => setActiveCategory('all')}>{content.featured_label}</button>
        {categories.data?.slice(0, 5).map((category) => <button type="button" role="tab" aria-selected={activeCategory === category.slug} className={activeCategory === category.slug ? 'is-active' : ''} onClick={() => setActiveCategory(category.slug)} key={category.id}>{category.name}</button>)}
      </div>
      <div id="product-discovery-panel" role="tabpanel" className="home-product-panel">
        {products.isLoading ? <LoadingState label="Đang chọn những sản phẩm phù hợp..." /> : products.isError ? <EmptyState title="Chưa thể tải sản phẩm" description="Vui lòng thử lại sau ít phút." /> : products.data?.data.length ? <div className="home-product-grid">{products.data.data.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState title="Chưa có sản phẩm trong danh mục này" description="Bạn có thể khám phá thêm các danh mục sản phẩm khác." />}
      </div>
      <div className="home-center-action"><Link to={content.view_all_url} className="home-text-link">{content.view_all_label} <ChevronRight size={18} /></Link></div>
    </>}
  </section>
}
