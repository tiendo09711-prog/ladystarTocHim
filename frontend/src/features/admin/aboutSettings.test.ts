import { describe, expect, it } from 'vitest'
import type { AboutSection } from '../../types'
import { buildAboutSectionSettings, type AboutSettingsFormValues } from './aboutSettings'

const emptyValues: AboutSettingsFormValues = {
  secondaryCtaLabel: '',
  secondaryCtaUrl: '',
  imageBadge: '',
  layout: 'image-left',
  quote: '',
  captionTitle: '',
  captionSubtitle: '',
  trustItems: '',
  pills: '',
  floatingCardTitle: '',
  floatingCardSubtitle: '',
}

describe('buildAboutSectionSettings', () => {
  it('giữ nguyên cấu hình hero khi chỉ lưu lại form', () => {
    const section: AboutSection = {
      section_key: 'hero',
      section_type: 'hero',
      sort_order: 1,
      settings: {
        secondary_cta_label: 'Tư vấn',
        secondary_cta_url: '/lien-he',
        image_badge: 'Hair system',
        trust_items: ['Tự nhiên', 'Cá nhân hóa'],
      },
    }

    const settings = buildAboutSectionSettings(section, {
      ...emptyValues,
      secondaryCtaLabel: 'Tư vấn',
      secondaryCtaUrl: '/lien-he',
      imageBadge: 'Hair system',
      trustItems: 'Tự nhiên\nCá nhân hóa',
    }, [], [])

    expect(settings).toEqual(section.settings)
  })

  it('cập nhật đầy đủ bố trí của section nội dung và giữ settings không liên quan', () => {
    const section: AboutSection = {
      section_key: 'story',
      section_type: 'rich_text_image',
      sort_order: 2,
      settings: { image_badge: 'Giữ lại', layout: 'image-left' },
    }
    const steps = [{ label: '01', title: 'Lắng nghe' }]

    const settings = buildAboutSectionSettings(section, {
      ...emptyValues,
      layout: 'image-right',
      quote: 'Một trích dẫn mới',
      pills: 'Tự nhiên\nThoải mái',
      floatingCardTitle: 'LADYSTARS',
      floatingCardSubtitle: 'Personalized hair experience',
    }, [], steps)

    expect(settings).toEqual({
      image_badge: 'Giữ lại',
      layout: 'image-right',
      quote: 'Một trích dẫn mới',
      pills: ['Tự nhiên', 'Thoải mái'],
      floating_card: { title: 'LADYSTARS', subtitle: 'Personalized hair experience' },
      steps,
    })
  })

  it('giữ rating testimonial và cập nhật caption showcase', () => {
    const items = [{ quote: 'Chia sẻ', name: 'Minh Anh', role: 'Stylist', rating: 4 }]
    const testimonial = buildAboutSectionSettings({ section_key: 'team', section_type: 'testimonials', sort_order: 3 }, emptyValues, items, [])
    const showcase = buildAboutSectionSettings({ section_key: 'direction', section_type: 'showcase', sort_order: 4 }, {
      ...emptyValues,
      captionTitle: 'Designed around you',
      captionSubtitle: 'Tự nhiên hơn mỗi ngày',
    }, [], [])

    expect(testimonial.items).toEqual(items)
    expect(showcase).toMatchObject({ caption_title: 'Designed around you', caption_subtitle: 'Tự nhiên hơn mỗi ngày' })
  })
})
