import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, CalendarDays } from 'lucide-react'
import { useEffect, useRef, type RefObject } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getGuidesPage } from '../../api/contentApi'
import { EmptyState } from '../../components/common/EmptyState'
import { NewsImage } from '../../components/news/NewsImage'
import { NewsPageCta } from '../../components/news/NewsPageCta'
import { NewsPagination } from '../../components/news/NewsPagination'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import type { NewsArticleSummary, NewsPageData } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const pageNumber = (value: string | null) => Math.max(1, Number.parseInt(value ?? '1', 10) || 1)

export function GuidePage() {
  const [params, setParams] = useSearchParams()
  const page = pageNumber(params.get('page'))
  const listRef = useRef<HTMLElement>(null)
  const previousPage = useRef(page)
  const query = useQuery({ queryKey: ['guides-page', page], queryFn: () => getGuidesPage({ page }) })
  const content = query.data?.content
  useDocumentMeta(query.data?.seo?.title ?? content?.title ?? 'Hướng dẫn', query.data?.seo?.description ?? content?.description)

  useEffect(() => {
    if (previousPage.current !== page) listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    previousPage.current = page
  }, [page])

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(params)
    if (nextPage <= 1) next.delete('page'); else next.set('page', String(nextPage))
    setParams(next)
  }

  return <main className='guide-journal container-page'>
    <nav className='news-page-breadcrumb' aria-label='Breadcrumb'><Link to='/'>Trang chủ</Link><span aria-hidden='true'>/</span><span aria-current='page'>Hướng dẫn</span></nav>
    {query.isLoading ? <GuideSkeleton /> : query.isError ? <div className='news-page-feedback card'><h2>Không tải được trang hướng dẫn</h2><p>Vui lòng thử lại sau ít phút.</p><button className='btn-primary' type='button' onClick={() => query.refetch()}>Thử lại</button></div> : query.data && <GuideBody data={query.data} listRef={listRef} changePage={changePage} />}
  </main>
}

function GuideBody({ data, listRef, changePage }: { data: NewsPageData; listRef: RefObject<HTMLElement | null>; changePage: (page: number) => void }) {
  const content = data.content ?? ({} as NewsPageData['content'])
  const featured = data.featured ?? null
  const articles = data.articles ?? { data: [], current_page: 1, last_page: 1, per_page: 9, total: 0 }
  return <>
    <header className={`guide-journal-hero ${content.hero_image_path ? 'has-image' : ''}`} style={content.hero_image_path ? { backgroundImage: `url(${resolveAssetUrl(content.hero_image_path)})` } : undefined}>
      <span className='guide-journal-hero-scrim' aria-hidden='true' />
      <div className='guide-journal-hero-copy'>{content.eyebrow && <p className='news-page-kicker'><BookOpen size={15} />{content.eyebrow}</p>}<h1>{content.title || 'Hướng dẫn'}</h1>{content.description && <p>{content.description}</p>}</div>
    </header>
    {featured && <GuideFeatured article={featured} badge={content.featured_badge_label} />}
    <section className='news-list-section guide-journal-list' ref={listRef} aria-labelledby='guide-list-title'>
      <div className='news-list-heading'>{content.list_eyebrow && <p className='news-page-kicker'>{content.list_eyebrow}</p>}<h2 id='guide-list-title'>{content.list_title || 'Bài hướng dẫn'}</h2>{content.list_description && <p>{content.list_description}</p>}</div>
      {articles.data.length ? <><div className='news-grid guide-journal-grid'>{articles.data.map((article) => <GuideCard article={article} key={article.id} />)}</div><NewsPagination currentPage={articles.current_page} lastPage={articles.last_page} onPageChange={changePage} /></> : <EmptyState title='Chưa có bài hướng dẫn' description='Bài viết sẽ xuất hiện tại đây sau khi được tạo và xuất bản từ trang quản trị.' />}
    </section>
    <NewsPageCta content={content} />
  </>
}

function GuideFeatured({ article, badge }: { article: NewsArticleSummary; badge?: string | null }) {
  return <Link className='guide-featured' to={`/huong-dan/${article.slug}`}><NewsImage article={article} className='guide-featured-image' priority /><span className='guide-featured-scrim' aria-hidden='true' /><span className='guide-featured-copy'><span className='guide-featured-meta'><strong>{badge || 'Hướng dẫn nổi bật'}</strong>{article.published_at && <time dateTime={article.published_at}><CalendarDays size={15} />{dateFormatter.format(new Date(article.published_at))}</time>}</span><h2>{article.title}</h2>{article.excerpt && <p>{article.excerpt}</p>}<span className='guide-featured-link'>Khám phá hướng dẫn <ArrowRight size={18} /></span></span></Link>
}

function GuideCard({ article }: { article: NewsArticleSummary }) {
  return <Link className='news-card guide-card' to={`/huong-dan/${article.slug}`}><span className='news-article-image-wrap'><NewsImage article={article} className='news-article-image' /></span><span className='news-card-body'><span className='news-list-meta'><strong>Hướng dẫn</strong>{article.published_at && <time dateTime={article.published_at}>{dateFormatter.format(new Date(article.published_at))}</time>}</span><h3>{article.title}</h3>{article.excerpt && <p>{article.excerpt}</p>}<span className='news-card-link'>Xem chi tiết <ArrowRight size={16} /></span></span></Link>
}

function GuideSkeleton() {
  return <div className='news-skeleton' role='status' aria-label='Đang tải trang hướng dẫn'><div className='guide-journal-hero news-skeleton-heading' /><div className='news-list-section'><div className='news-skeleton-heading' /><div className='news-grid'>{Array.from({ length: 3 }, (_, index) => <div className='news-skeleton-card' key={index} />)}</div></div></div>
}
