export type GuideVideoSource = { type: 'embed' | 'video'; src: string }

export function guideVideoSource(value?: string | null): GuideVideoSource | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id ? { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` } : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2] : url.searchParams.get('v')
      return id ? { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` } : null
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean).reverse().find((part) => /^\d+$/.test(part))
      return id ? { type: 'embed', src: `https://player.vimeo.com/video/${id}` } : null
    }
    if (url.protocol === 'http:' || url.protocol === 'https:') return { type: 'video', src: url.toString() }
  } catch { return null }
  return null
}
