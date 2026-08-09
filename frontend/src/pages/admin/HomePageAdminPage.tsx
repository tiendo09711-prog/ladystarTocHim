import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { getAdminHomePageContent, updateHomePageContent } from '../../api/contentApi'
import { LoadingState } from '../../components/common/LoadingState'

export function HomePageAdminPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-home-page'], queryFn: getAdminHomePageContent })
  const [messages, setMessages] = useState('')
  const [intervalSeconds, setIntervalSeconds] = useState(5)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (!query.data) return
    setMessages(query.data.announcement_messages.join('\n'))
    setIntervalSeconds(query.data.announcement_interval_seconds)
    setEnabled(query.data.announcement_enabled)
  }, [query.data])

  if (query.isLoading || !query.data) return <LoadingState />

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const announcementMessages = messages.split(/\r?\n/).map((message) => message.trim()).filter(Boolean)
    if (enabled && announcementMessages.length === 0) return toast.error('Vui lòng nhập ít nhất một dòng thông báo.')
    try {
      const content = await updateHomePageContent({
        announcement_messages: announcementMessages,
        announcement_interval_seconds: intervalSeconds,
        announcement_enabled: enabled,
      })
      client.setQueryData(['admin-home-page'], content)
      client.setQueryData(['home-page-content'], content)
      toast.success('Đã lưu nội dung trang chủ.')
    } catch {
      toast.error('Không thể lưu nội dung trang chủ. Vui lòng kiểm tra dữ liệu.')
    }
  }

  return <div>
    <div className="mb-6"><h1 className="text-3xl font-black">Chỉnh sửa trang chủ</h1><p className="muted">Quản lý nội dung thuộc trang chủ và các thành phần dùng chung đang liên kết với trang.</p></div>
    <form className="card grid gap-5 p-6" onSubmit={save}>
      <div><h2 className="text-xl font-black">Thanh thông báo đầu trang</h2><p className="muted mt-1">Thanh màu nâu nằm trên menu và hiển thị trên toàn bộ khu vực cửa hàng.</p></div>
      <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Hiển thị thanh thông báo</label>
      <label>
        <span className="label">Các dòng thông báo</span>
        <textarea className="input min-h-40" value={messages} onChange={(event) => setMessages(event.target.value)} placeholder={'Mỗi dòng là một thông báo\nVí dụ: Miễn phí giao hàng cho đơn từ 1.000.000đ'} disabled={!enabled} />
        <span className="muted mt-2 block text-sm">Mỗi dòng sẽ tự động trượt sang trái để hiển thị dòng kế tiếp.</span>
      </label>
      <label className="max-w-xs"><span className="label">Thời gian chuyển dòng (giây)</span><input className="input" type="number" min="3" max="30" value={intervalSeconds} onChange={(event) => setIntervalSeconds(Number(event.target.value))} required /></label>
      <button className="btn-primary justify-self-start"><Save size={18} />Lưu nội dung trang chủ</button>
    </form>
  </div>
}
