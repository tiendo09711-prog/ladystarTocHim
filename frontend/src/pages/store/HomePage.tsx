import { useQuery } from '@tanstack/react-query'
import { getHomePageContent } from '../../api/contentApi'
import { BrandStory, ContactAndInsights, FloatingContactDock, HomeFinalCta, ServiceProcess, SolutionsAndStyles, Testimonials } from '../../components/home/HomeContentSections'
import { HomeHero, QuickConsultation } from '../../components/home/HomeHero'
import { ProductDiscovery } from '../../components/home/ProductDiscovery'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'

export function HomePage() {
  const query = useQuery({ queryKey: ['home-page-content'], queryFn: getHomePageContent, staleTime: 5 * 60 * 1000 })
  const content = query.data
  if (query.isLoading) return <div className="container-page py-12"><LoadingState label="Đang tải trang chủ..." /></div>
  if (!content?.sections) return <div className="container-page py-12"><EmptyState title="Trang chủ chưa được cấu hình" description="Nội dung sẽ xuất hiện sau khi được thiết lập trong trang quản trị." /></div>
  const sections = content.sections

  return <>
    <HomeHero content={sections.hero} imagePath={content?.hero_image_path} imageAlt={content?.hero_image_alt} />
    <QuickConsultation content={sections.consultation} />
    <ProductDiscovery content={sections.products} />
    <BrandStory content={sections.brand_story} imagePath={content?.brand_story_image_path} />
    <SolutionsAndStyles solutions={sections.solutions} styles={sections.styles} />
    <ServiceProcess content={sections.process} />
    <Testimonials content={sections.testimonials} />
    <ContactAndInsights contact={sections.contact} insights={sections.insights} />
    <HomeFinalCta content={sections.final_cta} />
    <FloatingContactDock content={sections.floating_contact} />
  </>
}
