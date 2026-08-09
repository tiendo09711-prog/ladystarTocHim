import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Edit3, ExternalLink, Plus, Trash2 } from 'lucide-react'
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

export function GuidesAdminPage() {
  const client = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['admin-guides', status, search, page],
    queryFn: async () => (await apiClient.get<ApiResponse<Pagination<NewsArticle>>>('/admin/guides', { params: { status: status || undefined, search: search || undefined, page } })).data.data,
  })
  const refresh = () => client.invalidateQueries({ queryKey: ['admin-guides'] })

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearch(String(new FormData(event.currentTarget).get('search') ?? ''))
    setPage(1)
  }

  const changeStatus = async (article: NewsArticle, nextStatus: NewsStatus) => {
    try {
      await apiClient.patch(`/admin/guides/${article.id}/status`, { status: nextStatus })
      await refresh()
      toast.success(`Đã chuyển bài hướng dẫn sang ${statusLabels[nextStatus].toLowerCase()}.`)
    } catch { toast.error('Không thể đổi trạng thái bài hướng dẫn.') }
  }

  const remove = async (article: NewsArticle) => {
    if (!window.confirm(`Xóa vĩnh viễn bài hướng dẫn '${article.title}'?`)) return
    try { await apiClient.delete(`/admin/guides/${article.id}`); await refresh(); toast.success('Đã xóa bài hướng dẫn.') }
    catch { toast.error('Không thể xóa bài hướng dẫn.') }
  }

  return <div>
    <div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-3xl font-black'>Hướng dẫn</h1><p className='muted'>Quản lý bài viết và hình ảnh hiển thị tại /huong-dan.</p></div><div className='flex flex-wrap gap-2'><a className='btn-secondary' href='/huong-dan' target='_blank' rel='noreferrer'>Xem trang <ExternalLink size={16} /></a><Link className='btn-secondary' to='/admin/guides/settings'>Thiết lập trang</Link><Link className='btn-primary' to='/admin/guides/create'><Plus size={18} />Tạo bài hướng dẫn</Link></div></div>
    <div className='mb-4 flex flex-wrap items-center gap-3'><form onSubmit={submitSearch} className='flex gap-2'><input className='input w-64' name='search' placeholder='Tìm theo tiêu đề hoặc slug' defaultValue={search} /><button className='btn-secondary'>Tìm</button></form><select className='input w-48' value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} aria-label='Lọc theo trạng thái'><option value=''>Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {query.isLoading ? <LoadingState /> : !query.data?.data.length ? <EmptyState title='Chưa có bài hướng dẫn' description='Tạo bài đầu tiên, thêm ảnh bìa rồi xuất bản khi sẵn sàng.' /> : <GuideTable articles={query.data.data} changeStatus={changeStatus} remove={remove} />}
    {query.data && query.data.last_page > 1 && <div className='mt-4 flex justify-end gap-2'><button className='btn-secondary' disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</button><span className='px-3 py-2'>Trang {page}/{query.data.last_page}</span><button className='btn-secondary' disabled={page >= query.data.last_page} onClick={() => setPage(page + 1)}>Trang sau</button></div>}
  </div>
}

function GuideTable({ articles, changeStatus, remove }: { articles: NewsArticle[]; changeStatus: (article: NewsArticle, status: NewsStatus) => void; remove: (article: NewsArticle) => void }) {
  return <div className='table-wrap'><table className='table'><thead><tr><th>Bài hướng dẫn</th><th>Trạng thái</th><th>Ngày đăng</th><th>Hành động</th></tr></thead><tbody>{articles.map((article) => <tr key={article.id}><td><div className='flex items-center gap-3'>{article.cover_image_path ? <img src={resolveAssetUrl(article.cover_image_path)} alt='' className='h-12 w-16 rounded-xl object-cover' /> : <span className='grid h-12 w-16 place-items-center rounded-xl bg-rose-50 text-rose-500'><BookOpen size={18} /></span>}<div><strong className='block'>{article.title}</strong><span className='text-sm text-slate-500'>{article.slug}</span></div></div></td><td><select className='input min-w-36' value={article.status} onChange={(event) => changeStatus(article, event.target.value as NewsStatus)} aria-label={`Trạng thái ${article.title}`}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td>{article.published_at ? dateFormatter.format(new Date(article.published_at)) : '—'}</td><td><div className='flex gap-2'><Link className='btn-secondary px-3' to={`/admin/guides/${article.id}/edit`} aria-label={`Sửa ${article.title}`}><Edit3 size={16} /></Link><button className='btn-secondary px-3 text-red-700' onClick={() => remove(article)} aria-label={`Xóa ${article.title}`}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
}
