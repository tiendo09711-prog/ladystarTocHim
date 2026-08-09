import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getGuideArticle } from '../../api/contentApi'
import { LoadingState } from '../../components/common/LoadingState'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { NotFoundPage } from '../NotFoundPage'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function GuideDetailPage() {
  const { slug } = useParams()
  const query = useQuery({ queryKey: ['guide', slug], queryFn: () => getGuideArticle(slug!), enabled: Boolean(slug), retry: false })
  const article = query.data
  useDocumentMeta(article ? (article.seo_title || `${article.title} | LADYSTARS`) : null, article?.seo_description ?? article?.excerpt ?? null)

  if (query.isLoading) return <div className='container-page py-12'><LoadingState label='Đang tải bài hướng dẫn...' /></div>
  if (!article) return <NotFoundPage />

  const paragraphs = (article.content ?? '').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  return <article className='news-detail guide-detail container-page'>
    <Link to='/huong-dan' className='news-detail-back'><ArrowLeft size={17} /> Quay lại trang hướng dẫn</Link>
    <div className='news-card-meta'><span>Hướng dẫn</span>{article.published_at && <time dateTime={article.published_at}>{dateFormatter.format(new Date(article.published_at))}</time>}{article.author && <span>· {article.author.name}</span>}</div>
    <h1>{article.title}</h1>
    {article.cover_image_path && <img className='news-detail-cover' src={resolveAssetUrl(article.cover_image_path)} alt={article.cover_image_alt ?? article.title} />}
    <div className='news-detail-content'>{paragraphs.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}</div>
    <div className='news-detail-cta'><h2>Bạn cần tư vấn phù hợp với nhu cầu riêng?</h2><p>Đội ngũ LADYSTARS luôn sẵn sàng hỗ trợ thêm sau khi bạn tham khảo hướng dẫn.</p><div className='about-final-cta-actions'><Link to='/lien-he' className='btn-primary'>Nhận tư vấn <CalendarDays size={17} /></Link><Link to='/san-pham' className='btn-secondary'>Xem sản phẩm <ArrowRight size={17} /></Link></div></div>
  </article>
}
