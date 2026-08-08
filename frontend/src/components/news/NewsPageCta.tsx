import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NewsPageContent } from '../../types'
import { resolveAssetUrl } from '../../utils/assetUrl'

function CtaLink({ label, url, primary = false }: { label?: string | null; url?: string | null; primary?: boolean }) {
  if (!label || !url) return null
  const className = primary ? 'btn-primary' : 'btn-secondary'
  if (url.startsWith('/')) return <Link className={className} to={url}>{label}{primary && <ArrowRight size={17} />}</Link>
  return <a className={className} href={url} target="_blank" rel="noopener noreferrer">{label}{primary && <ArrowRight size={17} />}</a>
}

export function NewsPageCta({ content }: { content: NewsPageContent }) {
  if (!content.show_cta) return null
  const hasImage = Boolean(content.cta_image_path)
  return <section className={`news-cta ${hasImage ? 'news-cta-with-image' : ''}`}><div className="news-cta-copy">{content.cta_eyebrow && <p className="news-page-kicker">{content.cta_eyebrow}</p>}<h2>{content.cta_title}</h2>{content.cta_description && <p>{content.cta_description}</p>}<div className="news-cta-actions"><CtaLink label={content.cta_primary_label} url={content.cta_primary_url} primary /><CtaLink label={content.cta_secondary_label} url={content.cta_secondary_url} /></div></div>{hasImage && <img className="news-cta-image" src={resolveAssetUrl(content.cta_image_path)} alt={content.cta_image_alt ?? ''} />}</section>
}
