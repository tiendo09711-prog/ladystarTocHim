import { useQuery } from '@tanstack/react-query'
import type { ComponentType } from 'react'
import { getAboutPage } from '../../api/contentApi'
import { AboutCommitments, AboutFinalCta, AboutGoals, AboutHero, AboutShowcase, AboutStoryBlock, AboutTestimonials, AboutTimeline } from '../../components/about/AboutSections'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import type { AboutSection, AboutSectionType } from '../../types'

const sectionRenderers: Record<AboutSectionType, ComponentType<{ section: AboutSection }>> = {
  hero: AboutHero,
  rich_text_image: AboutStoryBlock,
  timeline: AboutTimeline,
  showcase: AboutShowcase,
  cards: AboutCommitments,
  goals: AboutGoals,
  testimonials: AboutTestimonials,
  cta: AboutFinalCta,
}

export function AboutPage() {
  const query = useQuery({ queryKey: ['about-page'], queryFn: getAboutPage, staleTime: 60_000, retry: 1 })
  const sections = (query.data?.sections ?? [])
    .filter((section) => section.section_type in sectionRenderers)
    .sort((a, b) => a.sort_order - b.sort_order)
  useDocumentMeta(query.data?.seo?.title ?? null, query.data?.seo?.description ?? null)

  if (query.isLoading) return <div className="container-page py-12"><LoadingState label="Đang tải câu chuyện LADYSTARS..." /></div>
  if (!sections.length) return <div className="container-page py-12"><EmptyState title="Chưa có nội dung giới thiệu" description="Nội dung sẽ xuất hiện sau khi được cấu hình trong trang quản trị." /></div>

  return <div className="about-page">
    {sections.map((section) => {
      const Renderer = sectionRenderers[section.section_type]
      return <Renderer key={section.section_key} section={section} />
    })}
  </div>
}
