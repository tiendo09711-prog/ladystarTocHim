import { ChevronLeft, ChevronRight } from 'lucide-react'

const pageItems = (current: number, last: number) => {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1)
  const pages = [...new Set([1, last, current - 1, current, current + 1].filter((page) => page > 0 && page <= last))].sort((left, right) => left - right)
  return pages.flatMap((page, index) => index && page - pages[index - 1] > 1 ? ['…', page] : [page])
}

export function NewsPagination({ currentPage, lastPage, onPageChange }: { currentPage: number; lastPage: number; onPageChange: (page: number) => void }) {
  if (lastPage <= 1) return null
  return <nav className="news-pagination" aria-label="Phân trang bài viết"><button className="btn-secondary news-pagination-button" type="button" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Trang trước"><ChevronLeft size={18} /></button>{pageItems(currentPage, lastPage).map((item, index) => item === '…' ? <span key={`ellipsis-${index}`} className="news-pagination-ellipsis">…</span> : <button key={item} type="button" className={item === currentPage ? 'btn-primary news-pagination-button' : 'btn-secondary news-pagination-button'} onClick={() => onPageChange(item as number)} aria-current={item === currentPage ? 'page' : undefined}>{item}</button>)}<button className="btn-secondary news-pagination-button" type="button" disabled={currentPage >= lastPage} onClick={() => onPageChange(currentPage + 1)} aria-label="Trang sau"><ChevronRight size={18} /></button></nav>
}
