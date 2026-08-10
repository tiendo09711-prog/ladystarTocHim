import type { ImgHTMLAttributes, ReactNode } from 'react'
import { HOME_MEDIA, homeMediaStyle, type HomeMediaKey } from '../../config/homeMedia'
import { resolveAssetUrl } from '../../utils/assetUrl'

type FixedMediaFrameProps = {
  mediaKey: HomeMediaKey
  src?: string | null
  alt?: string
  fallback?: string
  className?: string
  imageClassName?: string
  positionX?: number
  positionY?: number
  children?: ReactNode
  loading?: ImgHTMLAttributes<HTMLImageElement>['loading']
  decoding?: ImgHTMLAttributes<HTMLImageElement>['decoding']
  fetchPriority?: ImgHTMLAttributes<HTMLImageElement>['fetchPriority']
}

export function FixedMediaFrame({ mediaKey, src, alt = '', fallback, className = '', imageClassName = '', positionX = 50, positionY = 50, children, loading = 'lazy', decoding = 'async', fetchPriority }: FixedMediaFrameProps) {
  const imageSource = src || fallback ? resolveAssetUrl(src, fallback) : null

  return <div className={`fixed-media-frame ${className}`.trim()} style={homeMediaStyle(mediaKey, positionX, positionY)} data-media-ratio={HOME_MEDIA[mediaKey].label}>
    {imageSource && <img
      src={imageSource}
      alt={alt}
      className={imageClassName}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      onError={fallback ? (event) => {
        const fallbackSource = resolveAssetUrl(fallback)
        if (event.currentTarget.src.endsWith(fallbackSource)) return
        event.currentTarget.src = fallbackSource
      } : undefined}
    />}
    {children}
  </div>
}
