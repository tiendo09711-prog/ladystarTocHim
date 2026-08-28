import { CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../api/apiClient'
import type { ApiResponse, Order, PaymentMethods } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { formatPrice } from '../../utils/format'

const content: Record<string, { title: string; intro: string; points: string[] }> = {
  'gioi-thieu': { title: 'Giới thiệu LADYSTARS', intro: 'LADYSTARS hướng đến trải nghiệm lựa chọn tóc rõ ràng, dễ hiểu và tôn trọng nhu cầu riêng của từng khách hàng.', points: ['Thông tin sản phẩm minh bạch', 'Tư vấn dựa trên nhu cầu thực tế', 'Chính sách mua hàng rõ ràng'] },
  'lien-he': { title: 'Liên hệ', intro: 'Đội ngũ LADYSTARS sẵn sàng hỗ trợ từ 8:00 đến 20:00 mỗi ngày.', points: ['Hotline: 028 7300 8899', 'Email: hello@ladystars.local', 'Địa chỉ mẫu: 123 Đường Mẫu, Quận 3, TP. Hồ Chí Minh'] },
  'dich-vu-cham-soc': { title: 'Dịch vụ chăm sóc tóc', intro: 'Hãy bắt đầu từ vùng tóc cần che, thời gian sử dụng mỗi ngày và mức độ tự nhiên mong muốn.', points: ['Đế PU dễ vệ sinh và bám chắc', 'Đế lace thoáng, đường chân tóc tự nhiên', 'Tóc thật tạo kiểu linh hoạt', 'Chọn màu gần màu tóc thật', 'Đo kích thước vùng cần che trước khi mua'] },
  'chinh-sach-giao-hang': { title: 'Chính sách giao hàng', intro: 'Đơn hàng được kiểm tra trước khi bàn giao cho đơn vị vận chuyển.', points: ['Miễn phí từ 1.000.000đ', 'Phí tiêu chuẩn 30.000đ', 'Theo dõi trạng thái trong tài khoản'] },
  'chinh-sach-doi-tra': { title: 'Chính sách đổi trả', intro: 'LADYSTARS tiếp nhận yêu cầu đổi trả theo tình trạng sản phẩm và thời hạn công bố.', points: ['Giữ nguyên phụ kiện và bao bì', 'Không áp dụng với sản phẩm đã cắt hoặc tạo kiểu', 'Liên hệ trước khi gửi trả'] },
  'chinh-sach-bao-mat': { title: 'Chính sách bảo mật', intro: 'Thông tin cá nhân chỉ được sử dụng để xử lý đơn hàng và chăm sóc khách hàng.', points: ['Không bán dữ liệu khách hàng', 'Mật khẩu được mã hóa', 'Phiên đăng nhập dùng cookie HttpOnly'] },
}

export function ContentPage({ page }: { page?: string }) {
  const params = useParams(); const [searchParams] = useSearchParams(); const contentPage = page ?? params.page ?? 'gioi-thieu'
  if (contentPage === 'lien-he' && ['ha-noi', 'ho-chi-minh'].includes(searchParams.get('location') ?? '')) return <Navigate to="/he-thong-cua-hang" replace />
  const item = content[contentPage] ?? content['gioi-thieu']
  return <div className="container-page py-12"><div className="card mx-auto max-w-3xl p-7 sm:p-10"><h1 className="section-title">{item.title}</h1><p className="mt-4 text-lg leading-8 text-slate-600">{item.intro}</p><div className="mt-7 grid gap-4">{item.points.map((point) => <div key={point} className="flex gap-3 rounded-xl bg-emerald-50 p-4"><CheckCircle2 className="shrink-0 text-emerald-700" /><span>{point}</span></div>)}</div><Link className="btn-primary mt-8" to="/san-pham">Xem sản phẩm</Link></div></div>
}

export function OrderSuccessPage() {
  const { orderNumber = '' } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const state = location.state as { order?: Order; paymentMethods?: PaymentMethods } | null
  const paymentMethod = state?.order?.payment_method ?? searchParams.get('payment_method') ?? 'cod'
  const methods = useQuery({ queryKey: ['payment-methods'], initialData: state?.paymentMethods, queryFn: async () => (await apiClient.get<ApiResponse<PaymentMethods>>('/payment-methods')).data.data })
  const bank = methods.data?.bank_transfer
  return <div className='container-page py-16'><div className='card mx-auto max-w-2xl p-8 text-center sm:p-10'><CheckCircle2 className='mx-auto text-emerald-700' size={64} /><h1 className='mt-5 text-3xl font-black'>Đặt hàng thành công</h1><p className='muted mt-3'>Mã đơn hàng của bạn là <strong className='text-slate-900'>{orderNumber}</strong>.</p>{paymentMethod === 'bank_transfer' && bank?.enabled && <div className='mt-7 rounded-2xl bg-emerald-50 p-6 text-left'><h2 className='text-xl font-black'>Thông tin chuyển khoản</h2>{state?.order && <p className='mt-3'><strong>Số tiền:</strong> {formatPrice(state.order.total_amount)}</p>}<p><strong>Ngân hàng:</strong> {bank.bank_name || 'Đang cập nhật'}</p><p><strong>Số tài khoản:</strong> {bank.account_number || 'Đang cập nhật'}</p><p><strong>Chủ tài khoản:</strong> {bank.account_name || 'Đang cập nhật'}</p><p><strong>Nội dung chuyển khoản:</strong> {orderNumber}</p>{bank.qr_path && <img className='mx-auto mt-4 max-h-72 rounded-xl bg-white object-contain p-3' src={resolveAssetUrl(bank.qr_path)} alt='QR chuyển khoản ngân hàng' />}{bank.instruction && <p className='mt-3'>{bank.instruction}</p>}<p className='mt-3 text-sm font-semibold text-amber-800'>Thanh toán vẫn ở trạng thái chờ đến khi quản trị viên xác nhận.</p></div>}<div className='mt-7 flex flex-wrap justify-center gap-3'><Link className='btn-secondary' to='/san-pham'>Tiếp tục mua</Link><Link className='btn-primary' to={`/tra-cuu-don-hang?order=${encodeURIComponent(orderNumber)}`}>Tra cứu đơn hàng</Link></div></div></div>
}
