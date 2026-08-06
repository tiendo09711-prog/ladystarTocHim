import { SlidersHorizontal } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useParams } from 'react-router-dom'
import { getBrands, getCategories, getProducts } from '../../api/storeApi'
import { ProductCard } from '../../components/products/ProductCard'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const route = useParams<{ slug?: string }>()
  const queryParams = Object.fromEntries(params.entries())
  if (route.slug) queryParams.category = route.slug
  const products = useQuery({ queryKey: ['products', queryParams], queryFn: () => getProducts(queryParams) })
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const brands = useQuery({ queryKey: ['brands'], queryFn: getBrands })
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.delete('page'); setParams(next) }
  const data = products.data

  return <div className="container-page py-10"><div className="mb-7"><div className="text-sm text-slate-500">Trang chủ / Sản phẩm</div><h1 className="section-title mt-2">{route.slug ? categories.data?.find((item) => item.slug === route.slug)?.name ?? 'Danh mục sản phẩm' : 'Tất cả sản phẩm'}</h1><p className="muted mt-2">{data?.meta.total ?? 0} kết quả phù hợp</p></div>
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      <aside className="card h-fit p-5"><div className="mb-5 flex items-center gap-2 text-lg font-black"><SlidersHorizontal size={20} />Bộ lọc</div><div className="grid gap-4">
        <label><span className="label">Danh mục</span><select className="input" value={route.slug ?? params.get('category') ?? ''} onChange={(event) => update('category', event.target.value)} disabled={Boolean(route.slug)}><option value="">Tất cả</option>{categories.data?.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
        <label><span className="label">Thương hiệu</span><select className="input" value={params.get('brand') ?? ''} onChange={(event) => update('brand', event.target.value)}><option value="">Tất cả</option>{brands.data?.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
        <label><span className="label">Chất liệu tóc</span><select className="input" value={params.get('material') ?? ''} onChange={(event) => update('material', event.target.value)}><option value="">Tất cả</option>{['Tóc người thật', 'Tóc Remy', 'Tóc tổng hợp', 'Tóc pha'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span className="label">Loại đế</span><select className="input" value={params.get('base_type') ?? ''} onChange={(event) => update('base_type', event.target.value)}><option value="">Tất cả</option>{['Đế da PU', 'Đế lace', 'Đế mono', 'Đế kết hợp lace và PU', 'Đế siêu mỏng'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2"><label><span className="label">Giá từ</span><input className="input" inputMode="numeric" value={params.get('min_price') ?? ''} onChange={(event) => update('min_price', event.target.value)} /></label><label><span className="label">Đến</span><input className="input" inputMode="numeric" value={params.get('max_price') ?? ''} onChange={(event) => update('max_price', event.target.value)} /></label></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={params.get('in_stock') === 'true'} onChange={(event) => update('in_stock', event.target.checked ? 'true' : '')} /> Chỉ hiển thị còn hàng</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={params.get('on_sale') === 'true'} onChange={(event) => update('on_sale', event.target.checked ? 'true' : '')} /> Đang giảm giá</label>
      </div></aside>
      <section><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><input className="input sm:max-w-sm" placeholder="Tìm trong sản phẩm..." value={params.get('search') ?? ''} onChange={(event) => update('search', event.target.value)} /><select className="input sm:w-52" value={params.get('sort') ?? 'newest'} onChange={(event) => update('sort', event.target.value)}><option value="newest">Mới nhất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option><option value="name_asc">Tên A-Z</option></select></div>
        {products.isLoading ? <LoadingState /> : data?.data.length ? <><div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">{data.data.map((product) => <ProductCard key={product.id} product={product} />)}</div><div className="mt-7 flex justify-center gap-2">{Array.from({ length: data.meta.last_page }, (_, index) => index + 1).slice(0, 8).map((page) => <button key={page} onClick={() => update('page', String(page))} className={Number(params.get('page') ?? 1) === page ? 'btn-primary px-4' : 'btn-secondary px-4'}>{page}</button>)}</div></> : <EmptyState title="Không tìm thấy sản phẩm" description="Hãy thử thay đổi từ khóa hoặc bộ lọc." />}
      </section>
    </div>
  </div>
}
