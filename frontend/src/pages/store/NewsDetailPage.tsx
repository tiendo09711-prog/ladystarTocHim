import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getNewsArticle } from '../../api/contentApi'
import { LoadingState } from '../../components/common/LoadingState'
import { NotFoundPage } from '../NotFoundPage'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { resolveAssetUrl } from '../../utils/assetUrl'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function NewsDetailPage() {
  const { slug } = useParams()
  const query = useQuery({ queryKey: ['news', slug], queryFn: () => getNewsArticle(slug!), enabled: Boolean(slug), retry: false })
  const article = query.data
  useDocumentMeta(article ? (article.seo_title || `${article.title} | LADYSTARS`) : null, article?.seo_description ?? article?.excerpt ?? null)

  if (query.isLoading) return <div className="container-page py-12"><LoadingState label="Đang tải bài viết..." /></div>
  if (!article) return <NotFoundPage />

  const paragraphs = (article.content ?? '').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  return <article className="news-detail container-page">
    <Link to="/tin-tuc" className="news-detail-back"><ArrowLeft size={17} /> Quay lại bản tin</Link>
    <div className="news-card-meta">{article.category && <span>{article.category}</span>}{article.published_at && <time dateTime={article.published_at}>{dateFormatter.format(new Date(article.published_at))}</time>}{article.author && <span>· {article.author.name}</span>}</div>
    <h1>{article.title}</h1>
    {article.cover_image_path && <img className="news-detail-cover" src={resolveAssetUrl(article.cover_image_path)} alt={article.cover_image_alt ?? article.title} />}
    <div className="news-detail-content">
      {paragraphs.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
    </div>
    <div className="news-detail-cta">
      <h2>Cần tư vấn lựa chọn phù hợp?</h2>
      <p>Đội ngũ LADYSTARS luôn sẵn sàng lắng nghe và đồng hành cùng bạn.</p>
      <div className="about-final-cta-actions">
        <Link to="/lien-he" className="btn-primary">Nhận tư vấn riêng <CalendarDays size={17} /></Link>
        <Link to="/san-pham" className="btn-secondary">Xem sản phẩm <ArrowRight size={17} /></Link>
      </div>
    </div>
  </article>
}
