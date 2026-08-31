import { Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, ContentPage } from '../../types'

const pageOptions = [
  { key: 'chinh-sach-giao-hang', label: 'Chính sách giao hàng' },
  { key: 'chinh-sach-doi-tra', label: 'Chính sách đổi trả' },
  { key: 'chinh-sach-bao-mat', label: 'Chính sách bảo mật' },
]
type Section = { title: string; body?: string; items?: string[] }

export function PolicyPagesAdminPage() {
  const client = useQueryClient()
  const [selectedKey, setSelectedKey] = useState(pageOptions[0].key)
  const query = useQuery({ queryKey: ['admin-content-pages'], queryFn: async () => (await apiClient.get<ApiResponse<ContentPage[]>>('/admin/content-pages')).data.data })
  const page = query.data?.find((item) => item.page_key === selectedKey)
  const [draft, setDraft] = useState<ContentPage | null>(null)
  useEffect(() => setDraft(page ? structuredClone(page) : { page_key: selectedKey, title: pageOptions.find((item) => item.key === selectedKey)?.label ?? '', summary: '', content: { intro: '', sections: [] }, is_active: false }), [page, selectedKey])
  if (query.isLoading || !draft) return <LoadingState />
  const sections = draft.content?.sections ?? []
  const updateSection = (index: number, value: Partial<Section>) => setDraft((current) => current ? { ...current, content: { ...current.content, sections: (current.content?.sections ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item) } } : current)
  const save = async () => {
    try {
      await apiClient.put(`/admin/content-pages/${selectedKey}`, draft)
      await client.invalidateQueries({ queryKey: ['admin-content-pages'] })
      toast.success('Đã lưu nội dung chính sách.')
    } catch { toast.error('Không thể lưu nội dung chính sách.') }
  }
  return <div><div className="mb-6"><h1 className="text-3xl font-black">Chính sách website</h1><p className="muted">Nội dung lưu trong database. Dùng <code>{'{{shipping_fee}}'}</code> và các token policy để hiển thị giá trị hiện tại.</p></div><div className="mb-6 flex flex-wrap gap-2">{pageOptions.map((option) => <button key={option.key} className={selectedKey === option.key ? 'btn-primary' : 'btn-secondary'} onClick={() => setSelectedKey(option.key)}>{option.label}</button>)}</div>{!page && <EmptyState title="Chưa cấu hình trang này" description="Tạo nội dung rồi xuất bản để trang public hiển thị." />}{<div className="card grid gap-5 p-6"><label><span className="label">Tiêu đề</span><input className="input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label><span className="label">Tóm tắt</span><textarea className="input" value={draft.summary ?? ''} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label><label><span className="label">Mở đầu</span><textarea className="input min-h-28" value={draft.content?.intro ?? ''} onChange={(event) => setDraft({ ...draft, content: { ...draft.content, intro: event.target.value } })} /></label><div className="grid gap-4">{sections.map((section, index) => <div className="rounded-xl border p-4" key={`${index}-${section.title}`}><div className="grid gap-3 md:grid-cols-2"><input className="input" placeholder="Tiêu đề mục" value={section.title} onChange={(event) => updateSection(index, { title: event.target.value })} /><input className="input" placeholder="Các ý, mỗi dòng một ý" value={(section.items ?? []).join('\n')} onChange={(event) => updateSection(index, { items: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /><textarea className="input md:col-span-2" placeholder="Nội dung mục" value={section.body ?? ''} onChange={(event) => updateSection(index, { body: event.target.value })} /><button type="button" className="btn-secondary justify-self-start text-red-700" onClick={() => setDraft({ ...draft, content: { ...draft.content, sections: sections.filter((_, itemIndex) => itemIndex !== index) } })}><Trash2 size={16} />Xóa mục</button></div></div>)}</div><button type="button" className="btn-secondary justify-self-start" onClick={() => setDraft({ ...draft, content: { ...draft.content, sections: [...sections, { title: '', body: '', items: [] }] } })}><Plus size={17} />Thêm mục</button><label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} /> Xuất bản trang</label><div className="flex justify-end"><button type="button" className="btn-primary" onClick={() => void save()}><Save size={17} />Lưu chính sách</button></div></div>}</div>
}
