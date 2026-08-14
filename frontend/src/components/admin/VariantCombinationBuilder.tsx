import { useState } from 'react'
import type { AdminAttribute } from '../../types'

export function VariantCombinationBuilder({ attributes, onGenerate }: { attributes: AdminAttribute[]; onGenerate: (combinations: number[][]) => void }) {
  const [selected, setSelected] = useState<Record<number, number[]>>({})
  const toggle = (attributeId: number, valueId: number) => setSelected((current) => ({ ...current, [attributeId]: current[attributeId]?.includes(valueId) ? current[attributeId].filter((id) => id !== valueId) : [...(current[attributeId] ?? []), valueId] }))
  const generate = () => {
    const groups = attributes.map((attribute) => selected[attribute.id] ?? []).filter((values) => values.length)
    if (!groups.length || groups.length !== attributes.length) return
    onGenerate(groups.reduce<number[][]>((result, values) => result.flatMap((combination) => values.map((valueId) => [...combination, valueId])), [[]]))
  }
  return <div className='mb-5 rounded-2xl border border-dashed p-4'><h3 className='font-black'>Tạo các tổ hợp còn thiếu</h3><p className='muted text-sm'>Chọn value theo từng nhóm. Các biến thể hiện có được giữ nguyên.</p><div className='mt-4 grid gap-4 md:grid-cols-3'>{attributes.map((attribute) => <fieldset key={attribute.id}><legend className='label'>{attribute.name}</legend><div className='grid gap-2'>{attribute.values.filter((value) => value.is_active).map((value) => <label className='flex items-center gap-2 text-sm' key={value.id}><input type='checkbox' checked={selected[attribute.id]?.includes(value.id) ?? false} onChange={() => toggle(attribute.id, value.id)} />{value.display_value}</label>)}</div></fieldset>)}</div><button type='button' className='btn-secondary mt-4' onClick={generate}>Tạo các tổ hợp còn thiếu</button></div>
}
