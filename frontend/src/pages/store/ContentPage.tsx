import { CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../api/apiClient'
import type { ApiResponse, Order, PaymentMethods } from '../../types'
import type { ContentPage as ContentPageData } from '../../types'
import { EmptyState } from '../../components/common/EmptyState'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { useFormatPrice } from '../../utils/format'

export function ContentPage({ page }: { page?: string }) {
  const params = useParams(); const [searchParams] = useSearchParams(); const contentPage = page ?? params.page ?? 'gioi-thieu'
  if (contentPage === 'lien-he' && ['ha-noi', 'ho-chi-minh'].includes(searchParams.get('location') ?? '')) return <Navigate to="/he-thong-cua-hang" replace />
  const query = useQuery({ queryKey: ['content-page', contentPage], queryFn: async () => (await apiClient.get<ApiResponse<ContentPageData | null>>(`/content-pages/${contentPage}`)).data.data })
  if (query.isLoading) return <div className="container-page py-12"><div className="card mx-auto max-w-3xl p-10 text-center">Đang tải nội dung...</div></div>
  if (query.isError) return <div className="container-page py-12"><EmptyState title="Chưa thể tải nội dung" description="Vui lòng thử lại sau ít phút." /></div>
  const item = query.data
  if (!item) return <div className="container-page py-12"><EmptyState title="Nội dung đang được cập nhật" description="Trang này chưa được cấu hình trong hệ thống." /></div>
  const sections = item.content?.sections ?? []
  return <div className="container-page py-12"><div className="card mx-auto max-w-3xl p-7 sm:p-10"><h1 className="section-title">{item.title}</h1>{item.summary && <p className="mt-4 text-lg leading-8 text-slate-600">{item.summary}</p>}{item.content?.intro && <p className="mt-4 leading-8 text-slate-600">{item.content.intro}</p>}<div className="mt-7 grid gap-6">{sections.map((section) => <section key={section.title}><h2 className="text-xl font-black">{section.title}</h2>{section.body && <p className="mt-2 whitespace-pre-line leading-7 text-slate-600">{section.body}</p>}{section.items?.length ? <div className="mt-3 grid gap-3">{section.items.map((point) => <div key={point} className="flex gap-3 rounded-xl bg-emerald-50 p-4"><CheckCircle2 className="shrink-0 text-emerald-700" /><span>{point}</span></div>)}</div> : null}</section>)}</div><Link className="btn-primary mt-8" to="/san-pham">Xem sản phẩm</Link></div></div>
}

export function OrderSuccessPage() {
  const formatPrice = useFormatPrice()
  const { orderNumber = '' } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const state = location.state as { order?: Order; paymentMethods?: PaymentMethods } | null
  const paymentMethod = state?.order?.payment_method ?? searchParams.get('payment_method') ?? 'cod'
  const methods = useQuery({ queryKey: ['payment-methods'], initialData: state?.paymentMethods, queryFn: async () => (await apiClient.get<ApiResponse<PaymentMethods>>('/payment-methods')).data.data })
  const bank = methods.data?.bank_transfer
  return <div className='container-page py-16'><div className='card mx-auto max-w-2xl p-8 text-center sm:p-10'><CheckCircle2 className='mx-auto text-emerald-700' size={64} /><h1 className='mt-5 text-3xl font-black'>Đặt hàng thành công</h1><p className='muted mt-3'>Mã đơn hàng của bạn là <strong className='text-slate-900'>{orderNumber}</strong>.</p>{paymentMethod === 'bank_transfer' && bank?.enabled && <div className='mt-7 rounded-2xl bg-emerald-50 p-6 text-left'><h2 className='text-xl font-black'>Thông tin chuyển khoản</h2>{state?.order && <p className='mt-3'><strong>Số tiền:</strong> {formatPrice(state.order.total_amount)}</p>}<p><strong>Ngân hàng:</strong> {bank.bank_name || 'Đang cập nhật'}</p><p><strong>Số tài khoản:</strong> {bank.account_number || 'Đang cập nhật'}</p><p><strong>Chủ tài khoản:</strong> {bank.account_name || 'Đang cập nhật'}</p><p><strong>Nội dung chuyển khoản:</strong> {orderNumber}</p>{bank.qr_path && <img className='mx-auto mt-4 max-h-72 rounded-xl bg-white object-contain p-3' src={resolveAssetUrl(bank.qr_path)} alt='QR chuyển khoản ngân hàng' />}{bank.instruction && <p className='mt-3'>{bank.instruction}</p>}<p className='mt-3 text-sm font-semibold text-amber-800'>Thanh toán vẫn ở trạng thái chờ đến khi quản trị viên xác nhận.</p></div>}<div className='mt-7 flex flex-wrap justify-center gap-3'><Link className='btn-secondary' to='/san-pham'>Tiếp tục mua</Link><Link className='btn-primary' to={`/tra-cuu-don-hang?order=${encodeURIComponent(orderNumber)}`}>Tra cứu đơn hàng</Link></div></div></div>
}
