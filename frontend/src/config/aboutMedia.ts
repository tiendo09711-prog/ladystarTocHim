import type { ImageCropPreset } from './homeMedia'

export const ABOUT_MEDIA = {
  hero: { width: 1200, height: 1200, label: '1:1' },
  rich_text_image: { width: 1200, height: 1200, label: '1:1' },
  showcase: { width: 1600, height: 600, label: '8:3' },
} as const satisfies Record<string, ImageCropPreset>

export type AboutImageSectionType = keyof typeof ABOUT_MEDIA
