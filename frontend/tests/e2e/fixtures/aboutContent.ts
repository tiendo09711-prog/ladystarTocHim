import type { AboutSection } from '../../../src/types'

export const aboutSectionsFixture: AboutSection[] = [
  { section_key: 'hero', section_type: 'hero', sort_order: 1, eyebrow: 'GIỚI THIỆU', title: 'Câu chuyện thương hiệu', subtitle: 'Fixture giới thiệu.', image_path: '/images/brand/ladystars-hero.svg', image_alt: 'Fixture', settings: { trust_items: ['Fixture'] } },
  { section_key: 'story', section_type: 'rich_text_image', sort_order: 2, eyebrow: 'CÂU CHUYỆN', title: 'Bắt đầu từ sự lắng nghe', subtitle: 'Fixture câu chuyện.', image_path: '/images/brand/ladystars-hero.svg', image_alt: 'Fixture', settings: { layout: 'image-left' } },
  { section_key: 'showcase', section_type: 'showcase', sort_order: 3, eyebrow: 'ĐỊNH HƯỚNG', title: 'Định hướng thương hiệu', subtitle: 'Fixture định hướng.', image_path: '/images/brand/ladystars-hero.svg', image_alt: 'Fixture', settings: { caption_title: 'Fixture', caption_subtitle: 'Fixture', items: [] } },
]
