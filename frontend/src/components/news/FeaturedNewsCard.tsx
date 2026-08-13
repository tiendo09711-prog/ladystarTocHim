import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NewsArticleSummary } from '../../types'
import { NewsImage } from './NewsImage'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function FeaturedNewsCard({ article, badge, detailBasePath = '/tin-tuc' }: { article: NewsArticleSummary; badge?: string | null; detailBasePath?: string }) {
  const linkLabel = detailBasePath === '/uu-dai' ? 'Xem ưu đãi' : 'Đọc bài viết'
  return <Link className="news-featured-card" to={`${detailBasePath}/${article.slug}`}>
    <NewsImage article={article} className="news-featured-image" priority />
    <span className="news-featured-scrim" aria-hidden="true" />
    <span className="news-featured-content"><span className="news-featured-meta"><strong>{article.promotion_badge || badge || 'Bài viết nổi bật'}</strong>{article.category && <span>{article.category}</span>}{article.published_at && <time dateTime={article.published_at}>{dateFormatter.format(new Date(article.published_at))}</time>}</span><h2>{article.title}</h2>{article.excerpt && <p>{article.excerpt}</p>}<span className="news-featured-link">{linkLabel} <ArrowRight size={17} /></span></span>
  </Link>
}
