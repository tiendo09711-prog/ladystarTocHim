import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, ExternalLink, Newspaper, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, NewsArticle, NewsStatus, Pagination } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

const statusLabels: Record<NewsStatus, string> = { draft: 'Bản nháp', published: 'Đã xuất bản', archived: 'Đã lưu trữ' }
const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function NewsAdminPage() {
  const client = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['admin-news', status, search, page],
    queryFn: async () => (await apiClient.get<ApiResponse<Pagination<NewsArticle>>>('/admin/news', { params: { status: status || undefined, search: search || undefined, page } })).data.data,
  })

  const refresh = () => client.invalidateQueries({ queryKey: ['admin-news'] })

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearch(String(new FormData(event.currentTarget).get('search') ?? ''))
    setPage(1)
  }

  const changeStatus = async (article: NewsArticle, nextStatus: NewsStatus) => {
    try {
      await apiClient.patch(`/admin/news/${article.id}/status`, { status: nextStatus })
      await refresh()
      toast.success(`Đã chuyển bài viết sang trạng thái ${statusLabels[nextStatus].toLowerCase()}.`)
    } catch (error: any) { toast.error(error.response?.data?.message ?? 'Không thể đổi trạng thái bài viết.') }
  }

  const remove = async (article: NewsArticle) => {
    if (!window.confirm(`Xóa vĩnh viễn bản tin "${article.title}"? Hành động này không thể hoàn tác.`)) return
    try {
      await apiClient.delete(`/admin/news/${article.id}`)
      await refresh()
      toast.success('Đã xóa bản tin.')
    } catch { toast.error('Không thể xóa bản tin.') }
  }

  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black">Bản tin</h1><p className="muted">Quản lý bài viết hiển thị tại /tin-tuc.</p></div>
      <div className="flex flex-wrap gap-2"><Link className="btn-secondary" to="/admin/news/settings">Thiết lập trang</Link><Link className="btn-primary" to="/admin/news/create"><Plus size={18} />Tạo bản tin</Link></div>
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <form onSubmit={submitSearch} className="flex gap-2"><input className="input w-64" name="search" placeholder="Tìm theo tiêu đề hoặc slug" defaultValue={search} /><button className="btn-secondary">Tìm</button></form>
      <select className="input w-48" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} aria-label="Lọc theo trạng thái">
        <option value="">Tất cả trạng thái</option>
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    {query.isLoading ? <LoadingState /> : !query.data?.data.length ? <EmptyState title="Chưa có bản tin" description="Tạo bản tin đầu tiên ở trạng thái nháp, sau đó xuất bản khi sẵn sàng." /> : <>
      <div className="table-wrap"><table className="table"><thead><tr><th>Bài viết</th><th>Slug</th><th>Chuyên mục</th><th>Trạng thái</th><th>Ngày đăng</th><th>Người tạo</th><th>Hành động</th></tr></thead><tbody>
        {query.data.data.map((article) => <tr key={article.id}>
          <td><div className="flex items-center gap-3">{article.cover_image_path ? <img src={resolveAssetUrl(article.cover_image_path)} alt="" className="h-12 w-16 rounded-xl object-cover" /> : <span className="grid h-12 w-16 place-items-center rounded-xl bg-slate-100 text-slate-400"><Newspaper size={18} /></span>}<strong>{article.title}</strong></div></td>
          <td className="text-sm">{article.slug}</td>
          <td>{article.category ?? '—'}</td>
          <td><span className={`rounded-full px-3 py-1 text-xs font-bold ${article.status === 'published' ? 'bg-emerald-50 text-emerald-800' : article.status === 'archived' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-800'}`}>{statusLabels[article.status]}</span></td>
          <td className="text-sm">{article.published_at ? dateFormatter.format(new Date(article.published_at)) : '—'}</td>
          <td className="text-sm">{article.author?.name ?? '—'}</td>
          <td><div className="flex flex-wrap gap-2">
            <Link className="btn-secondary px-3" to={`/admin/news/${article.id}/edit`} aria-label={`Sửa ${article.title}`}><Edit3 size={16} /></Link>
            {article.status !== 'published' ? <button className="btn-secondary px-3" onClick={() => changeStatus(article, 'published')}>Xuất bản</button> : <button className="btn-secondary px-3" onClick={() => changeStatus(article, 'draft')}>Ẩn bài</button>}
            {article.status !== 'archived' && <button className="btn-secondary px-3" onClick={() => changeStatus(article, 'archived')}>Lưu trữ</button>}
            {article.status === 'published' && <a className="btn-secondary px-3" href={`/tin-tuc/${article.slug}`} target="_blank" rel="noreferrer" aria-label={`Xem ${article.title}`}><ExternalLink size={16} /></a>}
            <button className="btn-secondary px-3 text-red-700" onClick={() => remove(article)} aria-label={`Xóa ${article.title}`}><Trash2 size={16} /></button>
          </div></td>
        </tr>)}
      </tbody></table></div>
      {query.data.last_page > 1 && <nav className="news-pagination" aria-label="Phân trang bản tin admin">{Array.from({ length: query.data.last_page }).map((_, index) => <button key={index} type="button" className={page === index + 1 ? 'btn-primary' : 'btn-secondary'} onClick={() => setPage(index + 1)}>{index + 1}</button>)}</nav>}
    </>}
  </div>
}
