import { ArrowRight, BadgeCheck, Headphones, RefreshCcw, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getCategories, getProducts } from '../../api/storeApi'
import { ProductCard } from '../../components/products/ProductCard'
import { LoadingState } from '../../components/common/LoadingState'

function ProductSection({ title, queryKey, params }: { title: string; queryKey: string; params: Record<string, string | number | boolean> }) {
  const query = useQuery({ queryKey: ['products', queryKey], queryFn: () => getProducts({ ...params, per_page: 8 }) })
  return <section className="container-page py-10">
    <div className="mb-6 flex items-end justify-between"><div><div className="text-sm font-bold uppercase tracking-[.18em] text-emerald-700">Nam Hair tuyển chọn</div><h2 className="section-title mt-1">{title}</h2></div><Link className="hidden items-center gap-2 font-bold text-emerald-800 sm:flex" to="/san-pham">Xem tất cả <ArrowRight size={18} /></Link></div>
    {query.isLoading ? <LoadingState /> : <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-5">{query.data?.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
  </section>
}

export function HomePage() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  return <>
    <section className="overflow-hidden bg-[#e7efe9]"><div className="container-page grid min-h-[520px] items-center gap-8 py-12 lg:grid-cols-2">
      <div><div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-emerald-800">Tóc giả nam · Toupee · Hair system</div><h1 className="text-4xl font-black leading-tight tracking-[-.045em] text-[#183c2d] sm:text-6xl">Tự tin với mái tóc phù hợp riêng bạn.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Khám phá sản phẩm theo chất liệu tóc, loại đế, màu sắc và kích thước. Thông tin rõ ràng, dễ so sánh và dễ lựa chọn.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/san-pham" className="btn-primary">Khám phá sản phẩm <ArrowRight size={18} /></Link><Link to="/huong-dan-chon-toc" className="btn-secondary">Hướng dẫn chọn tóc</Link></div></div>
      <div className="relative mx-auto aspect-square w-full max-w-[500px] rounded-[40px] bg-[#ccded1] p-8"><img src="/images/product-placeholder.svg" alt="Hair system Nam Hair" className="h-full w-full rounded-[30px] object-cover" /><div className="absolute bottom-6 left-3 rounded-2xl bg-white p-4 shadow-xl"><div className="text-sm text-slate-500">Tư vấn theo nhu cầu</div><div className="font-black">Đế · Màu · Mật độ · Kích thước</div></div></div>
    </div></section>
    <section className="container-page py-10"><div className="mb-6"><div className="text-sm font-bold uppercase tracking-[.18em] text-emerald-700">Tìm nhanh</div><h2 className="section-title">Danh mục nổi bật</h2></div>{categories.isLoading ? <LoadingState /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{categories.data?.slice(0, 6).map((category, index) => <Link key={category.id} to={`/danh-muc/${category.slug}`} className="card p-5 text-center hover:border-emerald-400"><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-xl font-black text-emerald-800">{String(index + 1).padStart(2, '0')}</div><h3 className="font-bold">{category.name}</h3></Link>)}</div>}</section>
    <ProductSection title="Sản phẩm nổi bật" queryKey="featured" params={{ is_featured: true }} />
    <ProductSection title="Sản phẩm mới" queryKey="new" params={{ is_new: true }} />
    <ProductSection title="Đang ưu đãi" queryKey="sale" params={{ on_sale: true }} />
    <section className="container-page py-10"><div className="card grid gap-7 bg-[#214d39] p-8 text-white lg:grid-cols-[1.2fr_.8fr]"><div><div className="text-sm font-bold uppercase tracking-[.18em] text-emerald-200">Chọn đúng ngay từ đầu</div><h2 className="mt-2 text-3xl font-black">Bạn chưa biết nên chọn loại tóc nào?</h2><p className="mt-3 max-w-2xl text-emerald-50">Hướng dẫn của Nam Hair giúp bạn hiểu sự khác nhau giữa đế PU, lace, mono, tóc thật và tóc tổng hợp.</p></div><div className="flex items-center lg:justify-end"><Link className="btn-secondary" to="/huong-dan-chon-toc">Xem hướng dẫn chi tiết <ArrowRight size={18} /></Link></div></div></section>
    <section className="container-page py-10"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[[BadgeCheck, 'Kiểm tra trước khi giao'], [Headphones, 'Tư vấn lựa chọn'], [RefreshCcw, 'Đổi trả rõ ràng'], [ShieldCheck, 'Bảo mật thông tin']].map(([Icon, label]) => { const IconComponent = Icon; return <div key={label as string} className="card flex items-center gap-4 p-5"><IconComponent className="text-emerald-700" /><span className="font-bold">{label as string}</span></div> })}</div></section>
  </>
}
