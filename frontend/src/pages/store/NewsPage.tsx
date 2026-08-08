import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getNewsArticles } from '../../api/contentApi'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { resolveAssetUrl } from '../../utils/assetUrl'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function NewsPage() {
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['news', page], queryFn: () => getNewsArticles({ page }) })
  useDocumentMeta('Bản tin LADYSTARS', 'Cập nhật tin tức, cẩm nang chăm sóc và câu chuyện thương hiệu từ LADYSTARS.')

  return <div className="news-page container-page">
    <div className="news-page-heading">
      <p className="home-kicker">TIN TỨC & CẨM NANG</p>
      <h1>Bản tin LADYSTARS</h1>
      <p>Cẩm nang lựa chọn và chăm sóc tóc, câu chuyện thương hiệu cùng những cập nhật mới nhất từ LADYSTARS.</p>
    </div>
    {query.isLoading ? <LoadingState /> : query.isError ? <EmptyState title="Không tải được bản tin" description="Vui lòng thử lại sau ít phút." /> : !query.data?.data.length ? <EmptyState title="Chưa có bản tin" description="Những bài viết đầu tiên đang được chuẩn bị. Hãy quay lại sau nhé." /> : <>
      <div className="news-grid">
        {query.data.data.map((article) => <Link to={`/tin-tuc/${article.slug}`} className="news-card" key={article.id}>
          <img src={resolveAssetUrl(article.cover_image_path)} alt={article.cover_image_alt ?? article.title} loading="lazy" />
          <div className="news-card-body">
            <div className="news-card-meta">{article.category && <span>{article.category}</span>}{article.published_at && <time dateTime={article.published_at}>{dateFormatter.format(new Date(article.published_at))}</time>}</div>
            <h2>{article.title}</h2>
            {article.excerpt && <p>{article.excerpt}</p>}
            <span className="news-card-link">Đọc tiếp <ArrowRight size={16} /></span>
          </div>
        </Link>)}
      </div>
      {query.data.last_page > 1 && <nav className="news-pagination" aria-label="Phân trang bản tin">
        {Array.from({ length: query.data.last_page }).map((_, index) => <button key={index} type="button" className={page === index + 1 ? 'btn-primary' : 'btn-secondary'} onClick={() => setPage(index + 1)} aria-current={page === index + 1 ? 'page' : undefined}>{index + 1}</button>)}
      </nav>}
    </>}
  </div>
}
