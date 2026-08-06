import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/AuthContext'
import { useCart } from '../stores/CartContext'

const navItems = [['Sản phẩm', '/san-pham'], ['Hair system', '/danh-muc/hair-system-nam'], ['Toupee', '/danh-muc/toupee-nam'], ['Hướng dẫn', '/huong-dan-chon-toc'], ['Liên hệ', '/lien-he']]

export function StoreLayout() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { user } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const submit = (event: FormEvent) => { event.preventDefault(); if (search.trim()) navigate(`/tim-kiem?search=${encodeURIComponent(search.trim())}`) }

  return <div className="min-h-screen bg-[#f7f8f6]">
    <div className="bg-[#1f4f3a] py-2 text-center text-sm text-white">Miễn phí giao hàng cho đơn từ 1.000.000đ · Tư vấn lựa chọn phù hợp</div>
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-18 items-center gap-5">
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Mở menu">{open ? <X /> : <Menu />}</button>
        <Link to="/" className="shrink-0 text-2xl font-black tracking-tight text-[#245c43]">NAM HAIR</Link>
        <form onSubmit={submit} className="hidden flex-1 sm:flex"><div className="relative w-full"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input className="input pl-12" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm hair system, toupee, phụ kiện..." aria-label="Tìm kiếm sản phẩm" /></div></form>
        <div className="ml-auto flex items-center gap-2">
          <Link to={user ? '/tai-khoan' : '/dang-nhap'} className="btn-secondary px-3" aria-label="Tài khoản"><UserRound size={20} /><span className="hidden lg:inline">{user?.name ?? 'Đăng nhập'}</span></Link>
          <Link to="/gio-hang" className="btn-secondary relative px-3" aria-label={`Giỏ hàng có ${count} sản phẩm`}><ShoppingBag size={20} /><span className="hidden lg:inline">Giỏ hàng</span>{count > 0 && <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1 text-xs text-white">{count}</span>}</Link>
        </div>
      </div>
      <nav className={`${open ? 'block' : 'hidden'} border-t border-slate-100 md:block`}>
        <div className="container-page flex flex-col gap-1 py-3 md:flex-row md:items-center md:gap-7">
          {navItems.map(([label, path]) => <NavLink key={path} onClick={() => setOpen(false)} to={path} className={({ isActive }) => `rounded-lg px-2 py-2 text-sm font-bold ${isActive ? 'text-emerald-800' : 'text-slate-600 hover:text-emerald-800'}`}>{label}</NavLink>)}
          {user?.role === 'admin' && <Link to="/admin" className="md:ml-auto text-sm font-bold text-amber-700">Quản trị</Link>}
        </div>
      </nav>
    </header>
    <main><Outlet /></main>
    <footer className="mt-16 bg-[#183c2d] py-12 text-slate-200">
      <div className="container-page grid gap-8 md:grid-cols-4">
        <div><div className="text-2xl font-black text-white">NAM HAIR</div><p className="mt-3 text-sm leading-6">Cửa hàng chuyên tóc giả nam, toupee và hair system với thông tin minh bạch, hỗ trợ lựa chọn dễ hiểu.</p></div>
        <div><h3 className="font-bold text-white">Mua sắm</h3><div className="mt-3 grid gap-2 text-sm"><Link to="/san-pham">Tất cả sản phẩm</Link><Link to="/gio-hang">Giỏ hàng</Link><Link to="/tai-khoan/don-hang">Theo dõi đơn</Link></div></div>
        <div><h3 className="font-bold text-white">Hỗ trợ</h3><div className="mt-3 grid gap-2 text-sm"><Link to="/huong-dan-chon-toc">Hướng dẫn chọn tóc</Link><Link to="/chinh-sach-giao-hang">Chính sách giao hàng</Link><Link to="/chinh-sach-doi-tra">Đổi trả</Link></div></div>
        <div><h3 className="font-bold text-white">Liên hệ</h3><p className="mt-3 text-sm leading-6">Hotline: 028 7300 8899<br />Email: hello@namhair.local<br />Thứ 2 - Chủ nhật: 8:00 - 20:00</p></div>
      </div>
    </footer>
  </div>
}
