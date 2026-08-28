import { CalendarDays, Heart, LockKeyhole, MapPin, Package, RotateCcw, ShieldCheck, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const links = [['Hồ sơ', '/tai-khoan/ho-so', UserRound], ['Bảo mật', '/tai-khoan/bao-mat', LockKeyhole], ['Địa chỉ', '/tai-khoan/dia-chi', MapPin], ['Đơn hàng', '/tai-khoan/don-hang', Package], ['Yêu thích', '/tai-khoan/yeu-thich', Heart], ['Đổi / Trả', '/tai-khoan/doi-tra', RotateCcw], ['Bảo hành', '/tai-khoan/bao-hanh', ShieldCheck], ['Lịch hẹn', '/tai-khoan/lich-hen', CalendarDays]] as const

export function AccountLayout() {
  return <div className="container-page py-10"><div className="grid gap-6 lg:grid-cols-[240px_1fr]">
    <aside className="card h-fit p-3"><h1 className="px-3 py-3 text-lg font-black">Tài khoản của tôi</h1>{links.map(([label, to, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 font-semibold ${isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={19} />{label}</NavLink>)}</aside>
    <section><Outlet /></section>
  </div></div>
}
