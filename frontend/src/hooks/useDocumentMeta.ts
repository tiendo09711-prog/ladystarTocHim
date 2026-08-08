import { useEffect } from 'react'

export function useDocumentMeta(title?: string | null, description?: string | null) {
  useEffect(() => {
    if (!title) return
    const previousTitle = document.title
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const previousDescription = meta?.content ?? null
    document.title = title
    if (meta && description) meta.content = description
    return () => {
      document.title = previousTitle
      if (meta && previousDescription !== null) meta.content = previousDescription
    }
  }, [title, description])
}
