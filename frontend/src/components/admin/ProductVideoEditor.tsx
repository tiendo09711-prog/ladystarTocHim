import { Film, Trash2 } from 'lucide-react'
import type { ChangeEvent } from 'react'

interface ProductVideoEditorProps {
  currentPath?: string | null
  file: File | null
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}

export function ProductVideoEditor({ currentPath, file, onChange, onRemove }: ProductVideoEditorProps) {
  return <section className='card p-6'>
    <div><h2 className='text-xl font-black'>Video sản phẩm</h2><p className='muted mt-1 text-sm'>MP4 hoặc WebM, tối đa 50 MB. Mỗi sản phẩm dùng tối đa một video.</p></div>
    {currentPath && <video className='mt-4 max-h-96 w-full rounded-2xl bg-black object-contain' src={currentPath} controls />}
    {file && <p className='mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold'>Video sẽ tải lên khi lưu: {file.name}</p>}
    <div className='mt-4 flex flex-wrap gap-3'>
      <label className='btn-secondary'><Film size={17} />Chọn video<input className='hidden' type='file' accept='video/mp4,video/webm' onChange={onChange} /></label>
      {currentPath && <button type='button' className='btn-secondary text-red-700' onClick={onRemove}><Trash2 size={17} />Xóa video</button>}
    </div>
  </section>
}
