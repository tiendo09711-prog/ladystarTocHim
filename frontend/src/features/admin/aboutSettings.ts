import type { AboutSection, AboutSectionItem, AboutSectionSettings } from '../../types'

export interface AboutSettingsFormValues {
  secondaryCtaLabel: string
  secondaryCtaUrl: string
  imageBadge: string
  layout: 'image-left' | 'image-right'
  quote: string
  captionTitle: string
  captionSubtitle: string
  trustItems: string
  pills: string
  floatingCardTitle: string
  floatingCardSubtitle: string
}

const listSectionTypes = new Set(['timeline', 'showcase', 'cards', 'goals', 'testimonials'])

function setOptionalText(settings: AboutSectionSettings, key: keyof AboutSectionSettings, value: string) {
  const normalized = value.trim()
  if (normalized) {
    Object.assign(settings, { [key]: normalized })
  } else {
    delete settings[key]
  }
}

export function parseSettingsList(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

export function buildAboutSectionSettings(
  section: AboutSection,
  values: AboutSettingsFormValues,
  items: AboutSectionItem[],
  steps: AboutSectionItem[],
) {
  const settings: AboutSectionSettings = { ...section.settings }

  setOptionalText(settings, 'secondary_cta_label', values.secondaryCtaLabel)
  setOptionalText(settings, 'secondary_cta_url', values.secondaryCtaUrl)

  if (section.section_type === 'hero') {
    setOptionalText(settings, 'image_badge', values.imageBadge)
    settings.trust_items = parseSettingsList(values.trustItems)
  }

  if (section.section_type === 'rich_text_image') {
    settings.layout = values.layout
    setOptionalText(settings, 'quote', values.quote)
    settings.pills = parseSettingsList(values.pills)
    settings.steps = steps

    const floatingCardTitle = values.floatingCardTitle.trim()
    const floatingCardSubtitle = values.floatingCardSubtitle.trim()
    if (floatingCardTitle || floatingCardSubtitle) {
      settings.floating_card = { title: floatingCardTitle || undefined, subtitle: floatingCardSubtitle || undefined }
    } else {
      delete settings.floating_card
    }
  }

  if (section.section_type === 'showcase') {
    setOptionalText(settings, 'caption_title', values.captionTitle)
    setOptionalText(settings, 'caption_subtitle', values.captionSubtitle)
  }

  if (listSectionTypes.has(section.section_type)) {
    settings.items = items
  }

  return settings
}
