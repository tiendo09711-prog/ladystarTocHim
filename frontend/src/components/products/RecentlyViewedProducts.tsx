import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getProducts } from '../../api/storeApi'
import { recentlyViewedIds } from '../../features/products/productMemory'
import { ProductCard } from './ProductCard'

export function RecentlyViewedProducts({ excludeProductId }: { excludeProductId?: number }) {
  const [ids, setIds] = useState(() => recentlyViewedIds(excludeProductId))
  useEffect(() => {
    const refresh = () => setIds(recentlyViewedIds(excludeProductId))
    refresh()
    window.addEventListener('ladystars:recently-viewed', refresh)
    return () => window.removeEventListener('ladystars:recently-viewed', refresh)
  }, [excludeProductId])
  const query = useQuery({ queryKey: ['recently-viewed', ids.join(',')], enabled: ids.length > 0, queryFn: () => getProducts({ ids: ids.join(','), per_page: 10 }) })
  const products = [...(query.data?.data ?? [])].sort((left, right) => ids.indexOf(left.id) - ids.indexOf(right.id))
  if (!products.length) return null

  return <section className='mt-14'><div className='mb-5 flex items-end justify-between gap-3'><div><p className='text-xs font-black uppercase tracking-[.18em] text-emerald-700'>Gợi nhớ lựa chọn</p><h2 className='mt-1 text-2xl font-black'>Sản phẩm bạn vừa xem</h2></div></div><div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>{products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
}
