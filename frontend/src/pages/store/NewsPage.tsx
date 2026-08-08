import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getNewsPage } from '../../api/contentApi'
import { EmptyState } from '../../components/common/EmptyState'
import { FeaturedNewsCard } from '../../components/news/FeaturedNewsCard'
import { NewsArticleCard } from '../../components/news/NewsArticleCard'
import { NewsPageCta } from '../../components/news/NewsPageCta'
import { NewsPagination } from '../../components/news/NewsPagination'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'

const pageNumber = (value: string | null) => Math.max(1, Number.parseInt(value ?? '1', 10) || 1)

export function NewsPage() {
  const [params, setParams] = useSearchParams()
  const page = pageNumber(params.get('page'))
  const listHeadingRef = useRef<HTMLDivElement>(null)
  const previousPage = useRef(page)
  const query = useQuery({ queryKey: ['news-page', page], queryFn: () => getNewsPage({ page }) })
  const content = query.data?.content
  useDocumentMeta(query.data?.seo.title ?? content?.title ?? 'Bản tin LADYSTARS', query.data?.seo.description ?? content?.description)

  useEffect(() => {
    if (previousPage.current !== page) listHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    previousPage.current = page
  }, [page])

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(params)
    if (nextPage <= 1) next.delete('page'); else next.set('page', String(nextPage))
    setParams(next)
  }

  return <main className="news-page container-page">
    <nav className="news-page-breadcrumb" aria-label="Breadcrumb"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">Tin tức</span></nav>
    <header className="news-page-heading">{content?.eyebrow && <p className="news-page-kicker">{content.eyebrow}</p>}<h1>{content?.title ?? 'Bản tin LADYSTARS'}</h1><p>{content?.description ?? 'Cẩm nang lựa chọn và chăm sóc tóc, câu chuyện thương hiệu cùng những cập nhật mới nhất từ LADYSTARS.'}</p></header>
    {query.isLoading ? <NewsSkeleton /> : query.isError ? <div className="news-page-feedback card"><h2>Không tải được bản tin</h2><p>Vui lòng thử lại sau ít phút.</p><button className="btn-primary" type="button" onClick={() => query.refetch()}>Thử lại</button></div> : <>
      {query.data?.featured && <FeaturedNewsCard article={query.data.featured} badge={content?.featured_badge_label} />}
      <section className="news-list-section" ref={listHeadingRef} aria-labelledby="news-list-heading"><div className="news-list-heading">{content?.list_eyebrow && <p className="news-page-kicker">{content.list_eyebrow}</p>}<h2 id="news-list-heading">{content?.list_title ?? 'Bài viết mới nhất'}</h2>{content?.list_description && <p>{content.list_description}</p>}</div>{query.data?.articles.data.length ? <><div className="news-grid">{query.data.articles.data.map((article) => <NewsArticleCard article={article} key={article.id} />)}</div><NewsPagination currentPage={query.data.articles.current_page} lastPage={query.data.articles.last_page} onPageChange={changePage} /></> : <EmptyState title="Chưa có bài viết" description="Những bài viết đầu tiên đang được chuẩn bị. Hãy quay lại sau nhé." />}</section>
      {content && <NewsPageCta content={content} />}
    </>}
  </main>
}

function NewsSkeleton() {
  return <div className="news-skeleton" aria-label="Đang tải bản tin" role="status"><div className="news-skeleton-featured" /> <div className="news-list-section"><div className="news-skeleton-heading" /><div className="news-grid">{Array.from({ length: 3 }, (_, index) => <div className="news-skeleton-card" key={index} />)}</div></div></div>
}
