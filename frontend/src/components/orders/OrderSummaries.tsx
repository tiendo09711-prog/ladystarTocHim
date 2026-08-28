import type { Payment, PaymentMethods, Shipment } from '../../types'
import { formatPrice, statusLabel } from '../../utils/format'
import { resolveAssetUrl } from '../../utils/assetUrl'

export function PaymentSummary({ payment, method, status, methods }: { payment?: Payment | null; method: string; status: string; methods?: PaymentMethods }) {
  const bank = methods?.bank_transfer
  return <div className='grid gap-2 text-sm'><p><strong>Phương thức:</strong> {method === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}</p><p><strong>Trạng thái:</strong> {statusLabel[status] ?? status}</p>{payment && <p><strong>Số tiền:</strong> {formatPrice(payment.amount)}</p>}{payment?.transaction_code && <p><strong>Mã giao dịch:</strong> {payment.transaction_code}</p>}{payment?.paid_at && <p><strong>Ngày thanh toán:</strong> {new Date(payment.paid_at).toLocaleString('vi-VN')}</p>}{method === 'bank_transfer' && status === 'unpaid' && bank?.enabled && <div className='mt-2 rounded-xl bg-emerald-50 p-4'><p><strong>{bank.bank_name || 'Ngân hàng'}</strong></p><p>Số tài khoản: {bank.account_number || 'Đang cập nhật'}</p><p>Chủ tài khoản: {bank.account_name || 'Đang cập nhật'}</p>{bank.qr_path && <img className='mt-3 max-h-56 rounded-xl bg-white object-contain p-2' src={resolveAssetUrl(bank.qr_path)} alt='QR chuyển khoản ngân hàng' />}{bank.instruction && <p className='mt-2'>{bank.instruction}</p>}</div>}</div>
}

export function ShipmentSummary({ shipment }: { shipment?: Shipment | null }) {
  if (!shipment) return <p className='muted mt-3'>Đơn hàng chưa được bàn giao cho đơn vị vận chuyển.</p>
  return <div className='mt-3 grid gap-2 text-sm'><p><strong>Đơn vị:</strong> {shipment.carrier}</p><p><strong>Trạng thái:</strong> {statusLabel[shipment.status] ?? shipment.status}</p>{shipment.tracking_number && <p><strong>Mã vận đơn:</strong> {shipment.tracking_number}</p>}{shipment.shipped_at && <p><strong>Bàn giao lúc:</strong> {new Date(shipment.shipped_at).toLocaleString('vi-VN')}</p>}{shipment.delivered_at && <p><strong>Giao thành công:</strong> {new Date(shipment.delivered_at).toLocaleString('vi-VN')}</p>}{shipment.tracking_url && <a className='font-bold text-emerald-800 underline' href={shipment.tracking_url} target='_blank' rel='noreferrer'>Mở trang theo dõi vận đơn</a>}</div>
}
