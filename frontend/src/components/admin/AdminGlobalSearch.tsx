import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/apiClient'
import type { ApiResponse } from '../../types'

type SearchItem = { id: number; title: string; subtitle?: string | null; url: string }
type SearchResult = Record<string, SearchItem[]>

const labels: Record<string, string> = { orders: 'Đơn hàng', customers: 'Khách hàng', products: 'Sản phẩm', variants: 'Biến thể', appointments: 'Lịch hẹn' }

export function AdminGlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(true) }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.focus(), 0) }, [open])
  const result = useQuery({ queryKey: ['admin-global-search', term], enabled: open && term.length >= 2, queryFn: async () => (await apiClient.get<ApiResponse<SearchResult>>('/admin/global-search', { params: { q: term } })).data.data })
  const flat = useMemo(() => Object.entries(result.data ?? {}).flatMap(([group, items]) => items.map((item) => ({ ...item, group }))), [result.data])
  useEffect(() => setActiveIndex(0), [term])
  const openItem = (item: SearchItem) => { setOpen(false); setQuery(''); navigate(item.url) }

  return <div className='relative hidden w-full max-w-xl md:block'><button type='button' aria-label='Mở tra cứu toàn cục' className='flex w-full items-center gap-3 rounded-xl border bg-slate-50 px-4 py-2 text-left text-sm text-slate-500' onClick={() => setOpen(true)}><Search size={17} />Tìm đơn hàng, khách hàng, sản phẩm...<kbd className='ml-auto rounded border bg-white px-2 py-0.5 text-xs'>Ctrl K</kbd></button>{open && <div className='fixed inset-0 z-[70] bg-black/30 p-4' onMouseDown={() => setOpen(false)}><div className='mx-auto mt-[10vh] max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl' onMouseDown={(event) => event.stopPropagation()}><div className='flex items-center gap-3 border-b p-4'><Search size={20} /><input ref={inputRef} className='w-full outline-none' value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Nhập ít nhất 2 ký tự...' onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((current) => Math.min(flat.length - 1, current + 1)) } if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((current) => Math.max(0, current - 1)) } if (event.key === 'Enter' && flat[activeIndex]) openItem(flat[activeIndex]) }} /><button aria-label='Đóng tìm kiếm' onClick={() => setOpen(false)}><X size={19} /></button></div><div className='max-h-[60vh] overflow-y-auto p-3'>{result.isFetching ? <p className='p-4 text-center text-sm text-slate-500'>Đang tìm...</p> : term.length < 2 ? <p className='p-4 text-center text-sm text-slate-500'>Tìm theo mã đơn, tên, điện thoại, SKU hoặc barcode.</p> : flat.length ? Object.entries(result.data ?? {}).map(([group, items]) => items.length > 0 && <section className='mb-3' key={group}><h2 className='px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-400'>{labels[group] ?? group}</h2>{items.map((item) => { const index = flat.findIndex((candidate) => candidate.group === group && candidate.id === item.id); return <button className={`block w-full rounded-xl px-3 py-3 text-left ${index === activeIndex ? 'bg-emerald-50' : 'hover:bg-slate-50'}`} key={item.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => openItem(item)}><strong>{item.title}</strong><span className='mt-1 block text-sm text-slate-500'>{item.subtitle}</span></button> })}</section>) : <p className='p-6 text-center text-sm text-slate-500'>Không tìm thấy kết quả.</p>}</div></div></div>}</div>
}
