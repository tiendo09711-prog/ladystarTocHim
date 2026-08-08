import { BrandStory, ContactAndInsights, FloatingContactDock, HomeFinalCta, ServiceProcess, SolutionsAndStyles, Testimonials } from '../../components/home/HomeContentSections'
import { HomeHero, QuickConsultation } from '../../components/home/HomeHero'
import { ProductDiscovery } from '../../components/home/ProductDiscovery'

export function HomePage() {
  return <>
    <HomeHero />
    <QuickConsultation />
    <ProductDiscovery />
    <BrandStory />
    <SolutionsAndStyles />
    <ServiceProcess />
    <Testimonials />
    <ContactAndInsights />
    <HomeFinalCta />
    <FloatingContactDock />
  </>
}
