import type { CSSProperties } from 'react'

export type ImageCropPreset = {
  readonly width: number
  readonly height: number
  readonly label: string
}

export const HOME_MEDIA = {
  hero: { width: 1600, height: 900, label: '16:9' },
  product: { width: 1000, height: 1000, label: '1:1' },
  catalogHero: { width: 1200, height: 1000, label: '6:5' },
  catalogConsultation: { width: 1200, height: 1000, label: '6:5' },
  guideHero: { width: 1200, height: 1000, label: '6:5' },
  guideConsultation: { width: 1200, height: 1000, label: '6:5' },
  guidesPageHero: { width: 1600, height: 900, label: '16:9' },
  guidesPageCta: { width: 1200, height: 900, label: '4:3' },
  guideCover: { width: 1600, height: 900, label: '16:9' },
  guideContent: { width: 1600, height: 900, label: '16:9' },
  newsCover: { width: 1600, height: 900, label: '16:9' },
  newsCta: { width: 1200, height: 900, label: '4:3' },
  promotionCover: { width: 1600, height: 900, label: '16:9' },
  promotionCta: { width: 1200, height: 900, label: '4:3' },
  brandStory: { width: 1200, height: 1200, label: '1:1' },
  solution: { width: 1200, height: 1000, label: '6:5' },
  inspiration: { width: 1200, height: 900, label: '4:3' },
  process: { width: 1600, height: 900, label: '16:9' },
  testimonial: { width: 1600, height: 900, label: '16:9' },
} as const

export type HomeMediaKey = keyof typeof HOME_MEDIA

export function homeMediaStyle(mediaKey: HomeMediaKey, positionX = 50, positionY = 50): CSSProperties {
  const media = HOME_MEDIA[mediaKey]

  return {
    '--media-ratio': `${media.width} / ${media.height}`,
    '--media-x': `${positionX}%`,
    '--media-y': `${positionY}%`,
  } as CSSProperties
}
