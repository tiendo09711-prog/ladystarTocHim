import { CalendarDays, ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { GitCompareArrows } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getHomePageContent } from '../api/contentApi'
import { getMenuCategories } from '../api/storeApi'
import { ConsultationDialog } from '../components/store/ConsultationDialog'
import { useAuth } from '../stores/AuthContext'
import { useCart } from '../stores/CartContext'
import { compareIds, rememberSearch, searchHistory } from '../features/products/productMemory'
import { usePublicSettings } from '../stores/CurrencyContext'

type NavItem = { label: string; path: string; children?: readonly (readonly [string, string])[] }

function AnnouncementBar() {
  const query = useQuery({ queryKey: ['home-page-content'], queryFn: getHomePageContent, staleTime: 5 * 60 * 1000 })
  const content = query.data
  const messages = content?.announcement_messages ?? []
  const enabled = content?.announcement_enabled ?? false
  const intervalSeconds = content?.announcement_interval_seconds ?? 5
  const [activeIndex, setActiveIndex] = useState(0)
  const messageKey = messages.join('\u0000')

  useEffect(() => setActiveIndex(0), [messageKey])
  useEffect(() => {
    if (!enabled || messages.length < 2) return
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % messages.length), intervalSeconds * 1000)
    return () => window.clearInterval(timer)
  }, [enabled, intervalSeconds, messageKey, messages.length])

  if (!enabled || messages.length === 0) return null

  return <div className="store-announcement" aria-label="Thông báo cửa hàng"><div className="store-announcement-viewport"><div className="store-announcement-track" style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}>{messages.map((message, index) => <div className="store-announcement-item" aria-hidden={index !== activeIndex} key={`${message}-${index}`}>{message}</div>)}</div></div></div>
}

export function StoreLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [search, setSearch] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [compareCount, setCompareCount] = useState(() => compareIds().length)
  const [history, setHistory] = useState(searchHistory)
  const { user } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const categories = useQuery({ queryKey: ['menu-categories'], queryFn: getMenuCategories, staleTime: 5 * 60 * 1000 })
  const settings = usePublicSettings().data
  const storeName = settings?.store_name?.trim() ?? ''
  const appointmentsEnabled = settings?.appointments_enabled === true
  const categoryLinks = (categories.data ?? []).flatMap((category) => [
    [category.name, `/danh-muc/${category.slug}`] as const,
    ...(category.children ?? []).map((child) => [`— ${child.name}`, `/danh-muc/${child.slug}`] as const),
  ])
  const navItems: NavItem[] = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Câu chuyện thương hiệu', path: '/gioi-thieu' },
    { label: 'Sản phẩm', path: '/san-pham', children: [['Tất cả sản phẩm', '/san-pham'], ['Tìm mẫu tóc phù hợp', '/tim-mau-toc'], ['So sánh sản phẩm', '/so-sanh'], ...categoryLinks] },
    { label: 'Tin tức & ưu đãi', path: '/tin-tuc', children: [['Tin tức', '/tin-tuc'], ['Ưu đãi', '/uu-dai'], ['Hướng dẫn', '/huong-dan']] },
    { label: 'Hệ thống cửa hàng', path: '/he-thong-cua-hang' },
    { label: 'Liên hệ', path: '/lien-he' },
  ]

  useEffect(() => {
    document.body.classList.toggle('store-menu-open', menuOpen)
    return () => document.body.classList.remove('store-menu-open')
  }, [menuOpen])

  useEffect(() => {
    const handleScroll = () => {
      const nextIsScrolled = window.scrollY > 36
      setIsScrolled((current) => {
        if (current === nextIsScrolled) return current
        if (nextIsScrolled && window.matchMedia('(min-width: 901px)').matches) {
          setMenuOpen(false)
          setSearchOpen(false)
          setOpenDropdown(null)
        }
        return nextIsScrolled
      })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const refresh = () => setCompareCount(compareIds().length)
    window.addEventListener('ladystars:compare', refresh)
    return () => window.removeEventListener('ladystars:compare', refresh)
  }, [])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    if (!search.trim()) return
    rememberSearch(search)
    setHistory(searchHistory())
    setSearchOpen(false)
    setMenuOpen(false)
    setOpenDropdown(null)
    navigate(`/tim-kiem?search=${encodeURIComponent(search.trim())}`)
  }
  const accountPath = user ? '/tai-khoan' : '/dang-nhap'

  return <div className="store-shell">
    <AnnouncementBar />
    <header className={`store-header ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="container-page store-header-main">
        <div className="store-header-note">{storeName}</div>
        <div className="store-mobile-tools"><button type="button" className="store-icon-button" onClick={() => setMenuOpen((current) => !current)} aria-label="Mở menu" aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button><button type="button" className="store-icon-button" onClick={() => setSearchOpen((current) => !current)} aria-label="Mở tìm kiếm" aria-expanded={searchOpen}><Search /></button></div>
        <Link to="/" className="store-brand" aria-label={`${storeName || 'Trang chủ'} - Trang chủ`}><span>{storeName || 'Trang chủ'}</span></Link>
        <div className="store-header-actions"><button type="button" className="store-icon-button store-desktop-search" onClick={() => setSearchOpen((current) => !current)} aria-label="Mở tìm kiếm" aria-expanded={searchOpen}><Search size={21} /></button><Link to='/so-sanh' className='store-icon-button store-cart-button' aria-label={`So sánh ${compareCount} sản phẩm`}><GitCompareArrows size={21} />{compareCount > 0 && <span>{compareCount}</span>}</Link><Link to={accountPath} className="store-icon-button" aria-label={user ? 'Tài khoản của bạn' : 'Đăng nhập'}><UserRound size={21} /></Link><Link to="/gio-hang" className="store-icon-button store-cart-button" aria-label={`Giỏ hàng có ${count} sản phẩm`}><ShoppingBag size={21} />{count > 0 && <span>{count}</span>}</Link>{appointmentsEnabled && <button type="button" className="store-booking-link" onClick={() => setBookingOpen(true)}><CalendarDays size={18} /><span>Đặt lịch tư vấn</span></button>}</div>
      </div>
      <form className={`store-search-panel ${searchOpen ? 'is-open' : ''}`} onSubmit={submitSearch} role="search"><div className="container-page"><label className="store-search-field"><Search size={20} /><input autoFocus={searchOpen} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." aria-label="Tìm kiếm sản phẩm" /><button type="button" onClick={() => setSearchOpen(false)} aria-label="Đóng tìm kiếm"><X size={19} /></button></label>{history.length > 0 && <div className='mt-2 flex flex-wrap gap-2 pb-3'>{history.map((term) => <button type='button' className='rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800' key={term} onClick={() => { setSearch(term); navigate(`/tim-kiem?search=${encodeURIComponent(term)}`); setSearchOpen(false) }}>{term}</button>)}</div>}</div></form>
<nav className={`store-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="Điều hướng chính"><div className="container-page">{navItems.map((item) => <div className={`store-nav-item ${item.children ? 'has-dropdown' : ''} ${openDropdown === item.label ? 'is-dropdown-open' : ''}`} key={item.label}>{item.children ? <button type="button" className="store-nav-trigger" aria-expanded={openDropdown === item.label} onClick={() => setOpenDropdown((current) => current === item.label ? null : item.label)}>{item.label}<ChevronDown size={16} /></button> : <NavLink onClick={() => setMenuOpen(false)} to={item.path} end={item.path === '/'} className={({ isActive }) => isActive ? 'is-active' : ''}>{item.label}</NavLink>}{item.children && <div className="store-dropdown">{item.children.map(([label, path]) => <NavLink key={label} onClick={() => { setMenuOpen(false); setOpenDropdown(null) }} to={path}>{label}</NavLink>)}</div>}</div>)}</div></nav>
    </header>
    {appointmentsEnabled && <ConsultationDialog open={bookingOpen} onClose={() => setBookingOpen(false)} />}
    <main><Outlet /></main>
    <footer className="store-footer"><div className="container-page store-footer-grid"><div className="store-footer-brand">{storeName && <strong>{storeName}</strong>}{appointmentsEnabled && <Link to="/lien-he">Đặt lịch tư vấn <CalendarDays size={17} /></Link>}{settings?.support_phone && <a href={`tel:${settings.support_phone}`}>{settings.support_phone}</a>}{settings?.support_email && <a href={`mailto:${settings.support_email}`}>{settings.support_email}</a>}{settings?.store_address && <span>{settings.store_address}</span>}</div><div><h2>Mua sắm</h2><Link to="/san-pham">Tất cả sản phẩm</Link>{categoryLinks.map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}<Link to="/gio-hang">Giỏ hàng</Link></div><div><h2>Hỗ trợ</h2><Link to="/chinh-sach-giao-hang">Chính sách giao hàng</Link><Link to="/chinh-sach-doi-tra">Chính sách đổi trả</Link><Link to="/chinh-sach-bao-mat">Chính sách bảo mật</Link></div><div><h2>Kết nối</h2><Link to="/gioi-thieu">Câu chuyện thương hiệu</Link><Link to="/lien-he">Liên hệ</Link></div></div><div className="container-page store-footer-bottom"><span>© {new Date().getFullYear()} {storeName}</span><span>{settings?.configured ? settings.currency : ''}</span></div></footer>
  </div>
}
