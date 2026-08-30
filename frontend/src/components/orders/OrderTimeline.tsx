import type { OrderStatusHistory } from '../../types'
import { statusLabel } from '../../utils/format'

export function OrderTimeline({ histories = [] }: { histories?: OrderStatusHistory[] }) {
  if (!histories.length) return <p className='muted mt-3'>Chưa có lịch sử trạng thái.</p>
  return <ol className='mt-4 grid gap-4'>{histories.map((history) => <li className='relative border-l-2 border-emerald-200 pl-5' key={history.id}><span className='absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-emerald-700' /><strong>{statusLabel[history.to_status] ?? history.to_status}</strong><time className='muted mt-1 block text-sm'>{new Date(history.created_at).toLocaleString('vi-VN')}</time>{history.note && <p className='mt-1 text-sm text-slate-600'>{history.note}</p>}</li>)}</ol>
}
