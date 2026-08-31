import type { NewsArticleSummary } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

export function NewsImage({ article, className = '', priority = false }: { article: Pick<NewsArticleSummary, 'cover_image_path' | 'cover_image_alt' | 'title'>; className?: string; priority?: boolean }) {
  if (!article.cover_image_path) return <span className={`news-image-placeholder ${className}`} role="img" aria-label={`Ảnh minh họa cho ${article.title}`}><strong>Ảnh</strong></span>
  return <img className={className} src={resolveAssetUrl(article.cover_image_path)} alt={article.cover_image_alt ?? article.title} loading={priority ? 'eager' : 'lazy'} />
}
