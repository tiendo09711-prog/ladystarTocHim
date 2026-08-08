import { CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

const content: Record<string, { title: string; intro: string; points: string[] }> = {
  'gioi-thieu': { title: 'Giới thiệu Nam Hair', intro: 'Nam Hair hướng đến trải nghiệm mua tóc giả nam rõ ràng, dễ hiểu và tôn trọng nhu cầu riêng của từng khách hàng.', points: ['Thông tin sản phẩm minh bạch', 'Tư vấn dựa trên nhu cầu thực tế', 'Chính sách mua hàng rõ ràng'] },
  'lien-he': { title: 'Liên hệ', intro: 'Đội ngũ Nam Hair sẵn sàng hỗ trợ từ 8:00 đến 20:00 mỗi ngày.', points: ['Hotline: 028 7300 8899', 'Email: hello@namhair.local', 'Địa chỉ mẫu: 123 Đường Mẫu, Quận 3, TP. Hồ Chí Minh'] },
  'dich-vu-cham-soc': { title: 'Dịch vụ chăm sóc tóc', intro: 'Hãy bắt đầu từ vùng tóc cần che, thời gian sử dụng mỗi ngày và mức độ tự nhiên mong muốn.', points: ['Đế PU dễ vệ sinh và bám chắc', 'Đế lace thoáng, đường chân tóc tự nhiên', 'Tóc thật tạo kiểu linh hoạt', 'Chọn màu gần màu tóc thật', 'Đo kích thước vùng cần che trước khi mua'] },
  'chinh-sach-giao-hang': { title: 'Chính sách giao hàng', intro: 'Đơn hàng được kiểm tra trước khi bàn giao cho đơn vị vận chuyển.', points: ['Miễn phí từ 1.000.000đ', 'Phí tiêu chuẩn 30.000đ', 'Theo dõi trạng thái trong tài khoản'] },
  'chinh-sach-doi-tra': { title: 'Chính sách đổi trả', intro: 'Nam Hair tiếp nhận yêu cầu đổi trả theo tình trạng sản phẩm và thời hạn công bố.', points: ['Giữ nguyên phụ kiện và bao bì', 'Không áp dụng với sản phẩm đã cắt hoặc tạo kiểu', 'Liên hệ trước khi gửi trả'] },
  'chinh-sach-bao-mat': { title: 'Chính sách bảo mật', intro: 'Thông tin cá nhân chỉ được sử dụng để xử lý đơn hàng và chăm sóc khách hàng.', points: ['Không bán dữ liệu khách hàng', 'Mật khẩu được mã hóa', 'Phiên đăng nhập dùng cookie HttpOnly'] },
}

export function ContentPage({ page }: { page?: string }) {
  const params = useParams(); const item = content[page ?? params.page ?? 'gioi-thieu'] ?? content['gioi-thieu']
  return <div className="container-page py-12"><div className="card mx-auto max-w-3xl p-7 sm:p-10"><h1 className="section-title">{item.title}</h1><p className="mt-4 text-lg leading-8 text-slate-600">{item.intro}</p><div className="mt-7 grid gap-4">{item.points.map((point) => <div key={point} className="flex gap-3 rounded-xl bg-emerald-50 p-4"><CheckCircle2 className="shrink-0 text-emerald-700" /><span>{point}</span></div>)}</div><Link className="btn-primary mt-8" to="/san-pham">Xem sản phẩm</Link></div></div>
}

export function OrderSuccessPage() { const { orderNumber } = useParams(); return <div className="container-page py-16"><div className="card mx-auto max-w-xl p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-700" size={64} /><h1 className="mt-5 text-3xl font-black">Đặt hàng thành công</h1><p className="muted mt-3">Mã đơn hàng của bạn là <strong className="text-slate-900">{orderNumber}</strong>. Bạn có thể theo dõi trạng thái trong tài khoản.</p><div className="mt-7 flex justify-center gap-3"><Link className="btn-primary" to={`/tai-khoan/don-hang/${orderNumber}`}>Xem đơn hàng</Link><Link className="btn-secondary" to="/san-pham">Tiếp tục mua</Link></div></div></div> }
