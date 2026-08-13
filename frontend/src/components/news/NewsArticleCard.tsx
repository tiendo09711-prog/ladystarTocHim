import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NewsArticleSummary } from '../../types'
import { NewsImage } from './NewsImage'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function NewsArticleCard({ article, detailBasePath = '/tin-tuc' }: { article: NewsArticleSummary; detailBasePath?: string }) {
  const linkLabel = detailBasePath === '/uu-dai' ? 'Xem ưu đãi' : 'Đọc bài viết'
  return <Link to={`${detailBasePath}/${article.slug}`} className="news-card news-article-card"><span className="news-article-image-wrap"><NewsImage article={article} className="news-article-image" /></span><span className="news-card-body"><span className="news-list-meta">{article.promotion_badge ? <strong>{article.promotion_badge}</strong> : article.category && <strong>{article.category}</strong>}{article.published_at && <time dateTime={article.published_at}>{dateFormatter.format(new Date(article.published_at))}</time>}</span><h3>{article.title}</h3>{article.excerpt && <p>{article.excerpt}</p>}<span className="news-card-link">{linkLabel} <ArrowRight size={16} /></span></span></Link>
}
