import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, ExternalLink, Gift, Plus, Trash2 } from 'lucide-react'
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

export function PromotionsAdminPage() {
  const client = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['admin-promotions', status, search, page],
    queryFn: async () => (await apiClient.get<ApiResponse<Pagination<NewsArticle>>>('/admin/promotions', { params: { status: status || undefined, search: search || undefined, page } })).data.data,
  })
  const refresh = () => client.invalidateQueries({ queryKey: ['admin-promotions'] })

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearch(String(new FormData(event.currentTarget).get('search') ?? ''))
    setPage(1)
  }

  const changeStatus = async (article: NewsArticle, nextStatus: NewsStatus) => {
    try {
      await apiClient.patch(`/admin/promotions/${article.id}/status`, { status: nextStatus })
      await refresh()
      toast.success(`Đã chuyển ưu đãi sang trạng thái ${statusLabels[nextStatus].toLowerCase()}.`)
    } catch (error: any) { toast.error(error.response?.data?.message ?? 'Không thể đổi trạng thái ưu đãi.') }
  }

  const remove = async (article: NewsArticle) => {
    if (!window.confirm(`Xóa vĩnh viễn ưu đãi '${article.title}'? Hành động này không thể hoàn tác.`)) return
    try {
      await apiClient.delete(`/admin/promotions/${article.id}`)
      await refresh()
      toast.success('Đã xóa ưu đãi.')
    } catch { toast.error('Không thể xóa ưu đãi.') }
  }

  return <div>
    <div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-3xl font-black'>Ưu đãi</h1><p className='muted'>Quản lý nội dung và hình ảnh hiển thị tại /uu-dai.</p></div><div className='flex flex-wrap gap-2'><a className='btn-secondary' href='/uu-dai' target='_blank' rel='noreferrer'>Xem trang <ExternalLink size={16} /></a><Link className='btn-secondary' to='/admin/promotions/settings'>Thiết lập trang</Link><Link className='btn-primary' to='/admin/promotions/create'><Plus size={18} />Tạo ưu đãi</Link></div></div>
    <div className='mb-4 flex flex-wrap items-center gap-3'><form onSubmit={submitSearch} className='flex gap-2'><input className='input w-64' name='search' placeholder='Tìm theo tiêu đề hoặc slug' defaultValue={search} /><button className='btn-secondary'>Tìm</button></form><select className='input w-48' value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} aria-label='Lọc theo trạng thái'><option value=''>Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {query.isLoading ? <LoadingState /> : !query.data?.data.length ? <EmptyState title='Chưa có ưu đãi' description='Tạo ưu đãi đầu tiên, thêm ảnh bìa rồi xuất bản khi sẵn sàng.' /> : <><div className='table-wrap'><table className='table'><thead><tr><th>Ưu đãi</th><th>Áp dụng</th><th>Thời hạn</th><th>Trạng thái</th><th>Người tạo</th><th>Hành động</th></tr></thead><tbody>{query.data.data.map((article) => <tr key={article.id}><td><div className='flex items-center gap-3'>{article.cover_image_path ? <img src={resolveAssetUrl(article.cover_image_path)} alt='' className='h-12 w-16 rounded-xl object-cover' /> : <span className='grid h-12 w-16 place-items-center rounded-xl bg-rose-50 text-rose-400'><Gift size={18} /></span>}<div className='min-w-0'><strong className='block'>{article.title}</strong><small className='text-slate-500'>{article.promotion_badge || article.slug}</small></div></div></td><td className='text-sm font-semibold'>{article.products_count ?? 0} sản phẩm</td><td className='text-sm'>{article.promotion_starts_at || article.promotion_ends_at ? <div className='grid gap-1'><span>{article.promotion_starts_at ? `Từ ${dateFormatter.format(new Date(article.promotion_starts_at))}` : 'Áp dụng ngay'}</span><span>{article.promotion_ends_at ? `Đến ${dateFormatter.format(new Date(article.promotion_ends_at))}` : 'Không giới hạn'}</span></div> : 'Không giới hạn'}</td><td><span className={`rounded-full px-3 py-1 text-xs font-bold ${article.status === 'published' ? 'bg-emerald-50 text-emerald-800' : article.status === 'archived' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-800'}`}>{statusLabels[article.status]}</span></td><td className='text-sm'>{article.author?.name ?? '—'}</td><td><div className='flex flex-wrap gap-2'><Link className='btn-secondary px-3' to={`/admin/promotions/${article.id}/edit`} aria-label={`Sửa ${article.title}`}><Edit3 size={16} /></Link>{article.status !== 'published' ? <button className='btn-secondary px-3' onClick={() => changeStatus(article, 'published')}>Xuất bản</button> : <button className='btn-secondary px-3' onClick={() => changeStatus(article, 'draft')}>Ẩn bài</button>}{article.status !== 'archived' && <button className='btn-secondary px-3' onClick={() => changeStatus(article, 'archived')}>Lưu trữ</button>}<button className='btn-secondary px-3 text-red-700' onClick={() => remove(article)} aria-label={`Xóa ${article.title}`}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>{query.data.last_page > 1 && <nav className='news-pagination' aria-label='Phân trang ưu đãi admin'>{Array.from({ length: query.data.last_page }).map((_, index) => <button key={index} type='button' className={page === index + 1 ? 'btn-primary' : 'btn-secondary'} onClick={() => setPage(index + 1)}>{index + 1}</button>)}</nav>}</>}
  </div>
}
