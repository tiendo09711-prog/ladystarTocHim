import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getGuideArticle } from '../../api/contentApi'
import { LoadingState } from '../../components/common/LoadingState'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { guideVideoSource } from '../../utils/guideVideo'
import { NotFoundPage } from '../NotFoundPage'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function GuideDetailPage() {
  const { slug } = useParams()
  const query = useQuery({ queryKey: ['guide', slug], queryFn: () => getGuideArticle(slug!), enabled: Boolean(slug), retry: false })
  const article = query.data
  useDocumentMeta(article ? (article.seo_title || article.title) : null, article?.seo_description ?? article?.excerpt ?? null)

  if (query.isLoading) return <div className='container-page py-12'><LoadingState label='Đang tải bài hướng dẫn...' /></div>
  if (!article) return <NotFoundPage />

  const paragraphs = (article.content ?? '').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  const video = guideVideoSource(article.video_path ? resolveAssetUrl(article.video_path) : article.video_url)
  return <article className='news-detail guide-detail container-page'>
    <Link to='/huong-dan' className='news-detail-back'><ArrowLeft size={17} /> Quay lại trang hướng dẫn</Link>
    <div className='news-card-meta'><span>Hướng dẫn</span>{article.published_at && <time dateTime={article.published_at}>{dateFormatter.format(new Date(article.published_at))}</time>}{article.author && <span>· {article.author.name}</span>}</div>
    <h1>{article.title}</h1>
    {article.cover_image_path && <img className='news-detail-cover' src={resolveAssetUrl(article.cover_image_path)} alt={article.cover_image_alt ?? article.title} />}
    <div className='news-detail-content'>{paragraphs.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}</div>
    {article.content_image_path && <figure className='guide-detail-media'><img src={resolveAssetUrl(article.content_image_path)} alt={article.content_image_alt ?? article.title} loading='lazy' /></figure>}
    {video && <section className='guide-detail-video' aria-labelledby='guide-video-title'><h2 id='guide-video-title'>{article.video_title || 'Video hướng dẫn'}</h2><div className='guide-detail-video-frame'>{video.type === 'embed' ? <iframe src={video.src} title={article.video_title || `Video hướng dẫn ${article.title}`} allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowFullScreen /> : <video src={video.src} controls preload='metadata'>Trình duyệt của bạn không hỗ trợ phát video.</video>}</div></section>}
  </article>
}
