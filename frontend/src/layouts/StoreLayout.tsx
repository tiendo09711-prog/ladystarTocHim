import { CalendarDays, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/AuthContext'
import { useCart } from '../stores/CartContext'

const navItems = [
  ['Trang chủ', '/'], ['Sản phẩm', '/san-pham'], ['Hair system', '/danh-muc/hair-system-nam'], ['Toupee', '/danh-muc/toupee-nam'], ['Câu chuyện LADYSTARS', '/gioi-thieu'], ['Hướng dẫn', '/huong-dan-chon-toc'], ['Liên hệ', '/lien-he'],
] as const

export function StoreLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { user } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.toggle('store-menu-open', menuOpen)
    return () => document.body.classList.remove('store-menu-open')
  }, [menuOpen])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    if (!search.trim()) return
    setSearchOpen(false)
    setMenuOpen(false)
    navigate(`/tim-kiem?search=${encodeURIComponent(search.trim())}`)
  }
  const accountPath = user ? '/tai-khoan' : '/dang-nhap'

  return <div className="store-shell">
    <div className="store-announcement">Miễn phí giao hàng cho đơn từ 1.000.000đ <span>·</span> Tư vấn lựa chọn theo phong cách riêng</div>
    <header className="store-header">
      <div className="container-page store-header-main">
        <div className="store-header-note">LADYSTARS CARE</div>
        <div className="store-mobile-tools"><button type="button" className="store-icon-button" onClick={() => setMenuOpen((current) => !current)} aria-label="Mở menu" aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button><button type="button" className="store-icon-button" onClick={() => setSearchOpen((current) => !current)} aria-label="Mở tìm kiếm" aria-expanded={searchOpen}><Search /></button></div>
        <Link to="/" className="store-brand" aria-label="LADYSTARS - Trang chủ"><img src="/images/brand/ladystars-wordmark.png" alt="LADYSTARS" /></Link>
        <div className="store-header-actions"><button type="button" className="store-icon-button store-desktop-search" onClick={() => setSearchOpen((current) => !current)} aria-label="Mở tìm kiếm" aria-expanded={searchOpen}><Search size={21} /></button><Link to={accountPath} className="store-icon-button" aria-label={user ? 'Tài khoản của bạn' : 'Đăng nhập'}><UserRound size={21} /></Link><Link to="/gio-hang" className="store-icon-button store-cart-button" aria-label={`Giỏ hàng có ${count} sản phẩm`}><ShoppingBag size={21} />{count > 0 && <span>{count}</span>}</Link><Link to="/lien-he" className="store-booking-link"><CalendarDays size={18} /><span>Đặt lịch tư vấn</span></Link></div>
      </div>
      <form className={`store-search-panel ${searchOpen ? 'is-open' : ''}`} onSubmit={submitSearch} role="search"><div className="container-page"><label className="store-search-field"><Search size={20} /><input autoFocus={searchOpen} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm, hair system, phụ kiện..." aria-label="Tìm kiếm sản phẩm" /><button type="button" onClick={() => setSearchOpen(false)} aria-label="Đóng tìm kiếm"><X size={19} /></button></label></div></form>
      <nav className={`store-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="Điều hướng chính"><div className="container-page">{navItems.map(([label, path]) => <NavLink key={path} onClick={() => setMenuOpen(false)} to={path} end={path === '/'} className={({ isActive }) => isActive ? 'is-active' : ''}>{label}</NavLink>)}<Link to="/lien-he" onClick={() => setMenuOpen(false)} className="store-mobile-booking"><CalendarDays size={18} /> Đặt lịch tư vấn</Link></div></nav>
    </header>
    <main><Outlet /></main>
    <footer className="store-footer"><div className="container-page store-footer-grid"><div className="store-footer-brand"><img src="/images/brand/ladystars-wordmark.png" alt="LADYSTARS" /><p>LADYSTARS đồng hành cùng bạn trên hành trình tìm ra diện mạo tự nhiên, mềm mại và tự tin hơn mỗi ngày.</p><Link to="/lien-he">Đặt lịch tư vấn <CalendarDays size={17} /></Link></div><div><h2>Mua sắm</h2><Link to="/san-pham">Tất cả sản phẩm</Link><Link to="/danh-muc/hair-system-nam">Hair system</Link><Link to="/danh-muc/toupee-nam">Toupee</Link><Link to="/gio-hang">Giỏ hàng</Link></div><div><h2>Hỗ trợ</h2><Link to="/huong-dan-chon-toc">Hướng dẫn lựa chọn</Link><Link to="/chinh-sach-giao-hang">Chính sách giao hàng</Link><Link to="/chinh-sach-doi-tra">Chính sách đổi trả</Link><Link to="/chinh-sach-bao-mat">Chính sách bảo mật</Link></div><div><h2>Kết nối</h2><p>Khi bạn cần trao đổi kỹ hơn, LADYSTARS luôn sẵn sàng lắng nghe.</p><Link to="/gioi-thieu">Câu chuyện LADYSTARS</Link><Link to="/lien-he">Liên hệ LADYSTARS</Link></div></div><div className="container-page store-footer-bottom"><span>© {new Date().getFullYear()} LADYSTARS. All rights reserved.</span><span>Beautifully made for your confidence.</span></div></footer>
  </div>
}
