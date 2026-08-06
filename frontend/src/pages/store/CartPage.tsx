import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '../../components/common/EmptyState'
import { useAuth } from '../../stores/AuthContext'
import { useCart } from '../../stores/CartContext'
import { formatPrice } from '../../utils/format'

export function CartPage() {
  const { items, subtotal, updateItem, removeItem, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const checkout = () => { if (!user) { toast.info('Vui lòng đăng nhập để tiến hành đặt hàng.'); navigate('/dang-nhap', { state: { from: '/thanh-toan' } }); return } navigate('/thanh-toan') }
  return <div className="container-page py-10"><h1 className="section-title">Giỏ hàng</h1><p className="muted mt-2">Kiểm tra sản phẩm và số lượng trước khi thanh toán.</p>
    {!items.length ? <div className="mt-8"><EmptyState title="Giỏ hàng đang trống" description="Hãy chọn sản phẩm phù hợp để bắt đầu mua sắm." /><div className="mt-4 text-center"><Link to="/san-pham" className="btn-primary"><ShoppingBag size={18} />Xem sản phẩm</Link></div></div> : <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="grid gap-4">{items.map((item) => <article key={item.id} className="card flex gap-4 p-4"><img src={item.variant.product.images?.[0]?.image_path || '/images/product-placeholder.svg'} alt={item.variant.product.name} className="h-28 w-28 rounded-xl bg-slate-100 object-cover" /><div className="min-w-0 flex-1"><Link to={`/san-pham/${item.variant.product.slug}`} className="font-black hover:text-emerald-800">{item.variant.product.name}</Link><div className="mt-1 text-sm text-slate-500">{item.variant.attributes?.map((attr) => attr.value).join(' · ') || item.variant.sku}</div><div className="price mt-2">{formatPrice(item.unit_price)}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center rounded-xl border"><button className="p-2" onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}><Minus size={16} /></button><span className="w-10 text-center font-bold">{item.quantity}</span><button className="p-2" onClick={() => updateItem(item.id, item.quantity + 1)}><Plus size={16} /></button></div><button className="flex items-center gap-2 text-sm font-bold text-red-700" onClick={() => removeItem(item.id)}><Trash2 size={17} />Xóa</button></div></div></article>)}<button className="justify-self-start text-sm font-bold text-red-700" onClick={async () => { await clear(); toast.success('Đã xóa toàn bộ giỏ hàng.') }}>Xóa toàn bộ giỏ hàng</button></section>
      <aside className="card h-fit p-6"><h2 className="text-xl font-black">Tóm tắt đơn hàng</h2><div className="mt-5 flex justify-between"><span className="muted">Tạm tính</span><strong>{formatPrice(subtotal)}</strong></div><div className="mt-3 flex justify-between"><span className="muted">Phí giao hàng</span><span>Tính khi thanh toán</span></div><div className="mt-5 border-t pt-5"><div className="flex justify-between text-lg"><strong>Tổng dự kiến</strong><strong className="price">{formatPrice(subtotal)}</strong></div><button className="btn-primary mt-5 w-full" onClick={checkout}>Tiến hành thanh toán</button><Link to="/san-pham" className="btn-secondary mt-3 w-full">Tiếp tục mua sắm</Link></div></aside>
    </div>}
  </div>
}
