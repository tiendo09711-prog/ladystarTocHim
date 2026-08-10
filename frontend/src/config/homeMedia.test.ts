import { describe, expect, it } from 'vitest'
import { HOME_MEDIA, homeMediaStyle } from './homeMedia'

describe('HOME_MEDIA', () => {
  it('keeps public and admin target ratios deterministic', () => {
    expect(HOME_MEDIA.hero.width / HOME_MEDIA.hero.height).toBe(16 / 9)
    expect(HOME_MEDIA.product.width / HOME_MEDIA.product.height).toBe(1)
    expect(HOME_MEDIA.brandStory.width / HOME_MEDIA.brandStory.height).toBe(1)
    expect(HOME_MEDIA.solution.width / HOME_MEDIA.solution.height).toBe(6 / 5)
    expect(HOME_MEDIA.inspiration.width / HOME_MEDIA.inspiration.height).toBe(4 / 3)
    expect(HOME_MEDIA.process.width / HOME_MEDIA.process.height).toBe(16 / 9)
    expect(HOME_MEDIA.testimonial.width / HOME_MEDIA.testimonial.height).toBe(16 / 9)
  })

  it('provides safe center-crop defaults', () => {
    expect(homeMediaStyle('inspiration')).toMatchObject({
      '--media-ratio': '1200 / 900',
      '--media-x': '50%',
      '--media-y': '50%',
    })
  })
})
