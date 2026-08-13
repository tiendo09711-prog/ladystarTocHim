import { useQuery } from '@tanstack/react-query'
import { Gift, Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPromotionsPage } from '../../api/contentApi'
import { EmptyState } from '../../components/common/EmptyState'
import { FeaturedNewsCard } from '../../components/news/FeaturedNewsCard'
import { NewsArticleCard } from '../../components/news/NewsArticleCard'
import { NewsPageCta } from '../../components/news/NewsPageCta'
import { NewsPagination } from '../../components/news/NewsPagination'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'

const pageNumber = (value: string | null) => Math.max(1, Number.parseInt(value ?? '1', 10) || 1)

export function PromotionsPage() {
  const [params, setParams] = useSearchParams()
  const page = pageNumber(params.get('page'))
  const listHeadingRef = useRef<HTMLDivElement>(null)
  const previousPage = useRef(page)
  const query = useQuery({ queryKey: ['promotions-page', page], queryFn: () => getPromotionsPage({ page }) })
  const content = query.data?.content
  const articles = query.data?.articles.data ?? []
  useDocumentMeta(query.data?.seo.title ?? content?.title ?? null, query.data?.seo.description ?? content?.description)

  useEffect(() => {
    if (previousPage.current !== page) listHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    previousPage.current = page
  }, [page])

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(params)
    if (nextPage <= 1) next.delete('page'); else next.set('page', String(nextPage))
    setParams(next)
  }

  return <main className='promotions-page news-page container-page'>
    <nav className='news-page-breadcrumb' aria-label='Breadcrumb'><Link to='/'>Trang chủ</Link><span aria-hidden='true'>/</span><span aria-current='page'>Ưu đãi</span></nav>
    {query.isLoading ? <PromotionsSkeleton /> : query.isError ? <div className='news-page-feedback card'><h2>Không tải được ưu đãi</h2><p>Vui lòng thử lại sau ít phút.</p><button className='btn-primary' type='button' onClick={() => query.refetch()}>Thử lại</button></div> : content && <>
      <header className='news-page-heading promotions-page-heading'>
        {content.eyebrow && <p className='news-page-kicker'><Sparkles size={14} />{content.eyebrow}</p>}
        <h1>{content.title}</h1>
        {content.description && <p>{content.description}</p>}
        <div className='promotions-assurance' aria-label='Cam kết ưu đãi'><span><Gift size={17} />Đặc quyền rõ ràng</span><i>•</i><span>Cập nhật thường xuyên</span><i>•</i><span>Tư vấn riêng tư</span></div>
      </header>
      {query.data?.featured && <FeaturedNewsCard article={query.data.featured} badge={content.featured_badge_label} detailBasePath='/uu-dai' />}
      <section className='news-list-section' ref={listHeadingRef} aria-labelledby='promotions-list-heading'>
        <div className='news-list-heading'>{content.list_eyebrow && <p className='news-page-kicker'>{content.list_eyebrow}</p>}<h2 id='promotions-list-heading'>{content.list_title}</h2>{content.list_description && <p>{content.list_description}</p>}</div>
        {articles.length ? <><div className='news-grid promotions-grid'>{articles.map((article) => <NewsArticleCard article={article} detailBasePath='/uu-dai' key={article.id} />)}</div>{query.data && query.data.articles.last_page > 1 && <NewsPagination currentPage={query.data.articles.current_page} lastPage={query.data.articles.last_page} onPageChange={changePage} />}</> : <EmptyState title='Chưa có ưu đãi' description='Các chương trình ưu đãi sẽ hiển thị tại đây sau khi được tạo và xuất bản từ trang quản trị.' />}
      </section>
      <NewsPageCta content={content} />
    </>}
  </main>
}

function PromotionsSkeleton() {
  return <div className='news-skeleton' aria-label='Đang tải ưu đãi' role='status'><div className='news-skeleton-heading' /><div className='news-list-section'><div className='news-skeleton-heading' /><div className='news-grid'>{Array.from({ length: 3 }, (_, index) => <div className='news-skeleton-card' key={index} />)}</div></div></div>
}
