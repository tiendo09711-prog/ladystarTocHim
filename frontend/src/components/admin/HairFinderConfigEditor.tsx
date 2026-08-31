import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

type Choice = { value: string; label: string }
type Field = { key: string; label: string; source: 'material' | 'base_type'; placeholder?: string }
type Question = {
  key: string
  type: 'single' | 'multiple' | 'budget' | 'select_group'
  title: string
  default_value?: unknown
  empty_label?: string
  choices?: Choice[]
  fields?: Field[]
}
type Config = {
  content: Record<string, string>
  actions: Record<string, string>
  format: { locale: string }
  questions: Question[]
  budget: { labels: string[]; minimum_step: number; rounding_step: number }
  scoring: Record<string, unknown> & { result_limit: number }
}

const blankConfig = (): Config => ({
  content: { eyebrow: '', title: '', description: '', result_title: '', empty_result: '', score_template: ':score%' },
  actions: { back: 'Quay lại', next: 'Tiếp tục', submit: 'Xem gợi ý', loading: 'Đang phân tích...', restart: 'Làm lại' },
  format: { locale: 'vi-VN' },
  questions: [],
  budget: { labels: ['Mặc định'], minimum_step: 1, rounding_step: 1 },
  scoring: { result_limit: 5 },
})

function normalize(value?: Record<string, unknown> | null): Config {
  const base = blankConfig()
  if (!value) return base

  return {
    ...base,
    ...value,
    content: { ...base.content, ...(value.content as Record<string, string> | undefined) },
    actions: { ...base.actions, ...(value.actions as Record<string, string> | undefined) },
    format: { ...base.format, ...(value.format as { locale?: string } | undefined) },
    questions: Array.isArray(value.questions) ? value.questions as Question[] : [],
    budget: { ...base.budget, ...(value.budget as Partial<Config['budget']> | undefined) },
    scoring: { ...base.scoring, ...(value.scoring as Record<string, unknown> | undefined) },
  }
}

const choiceText = (choices?: Choice[]) => (choices ?? []).map((item) => `${item.value}|${item.label}`).join('\n')
const parseChoices = (value: string): Choice[] => value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
  const [key, ...label] = line.split('|')
  return { value: key.trim(), label: (label.join('|') || key).trim() }
})
const fieldText = (fields?: Field[]) => (fields ?? []).map((item) => `${item.key}|${item.label}|${item.source}|${item.placeholder ?? ''}`).join('\n')
const parseFields = (value: string): Field[] => value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
  const [key, label, source, placeholder] = line.split('|')
  return { key: key.trim(), label: (label || key).trim(), source: source === 'base_type' ? 'base_type' : 'material', placeholder: placeholder?.trim() || undefined }
})

export function HairFinderConfigEditor({ initialConfig, editable }: { initialConfig?: Record<string, unknown> | null; editable: boolean }) {
  const [enabled, setEnabled] = useState(Boolean(initialConfig))
  const [config, setConfig] = useState<Config>(() => normalize(initialConfig))
  const [mappingText, setMappingText] = useState('{}')

  useEffect(() => {
    const next = normalize(initialConfig)
    setEnabled(Boolean(initialConfig))
    setConfig(next)
    setMappingText(JSON.stringify({
      base: next.scoring.base ?? {},
      budget: next.scoring.budget ?? {},
      field_matches: next.scoring.field_matches ?? {},
      length: next.scoring.length ?? {},
      choice_rules: next.scoring.choice_rules ?? {},
      rating: next.scoring.rating ?? {},
    }, null, 2))
  }, [initialConfig])

  const updateContent = (key: string, value: string) => setConfig((current) => ({ ...current, content: { ...current.content, [key]: value } }))
  const updateAction = (key: string, value: string) => setConfig((current) => ({ ...current, actions: { ...current.actions, [key]: value } }))
  const updateQuestion = (index: number, patch: Partial<Question>) => setConfig((current) => ({ ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }))
  const removeQuestion = (index: number) => setConfig((current) => ({ ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== index) }))
  const addQuestion = () => setConfig((current) => ({ ...current, questions: [...current.questions, { key: `question_${current.questions.length + 1}`, type: 'single', title: '', choices: [] }] }))
  const updateScoringNumber = (key: string, value: number) => setConfig((current) => ({ ...current, scoring: { ...current.scoring, [key]: value } }))
  const updateMappings = (value: string, element: HTMLTextAreaElement) => {
    setMappingText(value)
    try {
      const mappings = JSON.parse(value) as Record<string, unknown>
      setConfig((current) => ({ ...current, scoring: { ...current.scoring, ...mappings } }))
      element.setCustomValidity('')
    } catch {
      element.setCustomValidity('JSON mapping không hợp lệ.')
    }
  }

  return <section className='card p-6'>
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <div><h2 className='text-xl font-black'>Hair Finder</h2><p className='muted mt-1 text-sm'>Quản lý nội dung, câu hỏi, lựa chọn, ngân sách và quy tắc gợi ý đang dùng ở public runtime.</p></div>
      <label className='flex items-center gap-2 font-bold'><input type='checkbox' checked={enabled} disabled={!editable} onChange={(event) => setEnabled(event.target.checked)} /> Bật Hair Finder</label>
    </div>
    <input type='hidden' name='hair_finder_config' value={enabled ? JSON.stringify(config) : ''} />
    {enabled && <div className='mt-6 grid gap-6'>
      <div><h3 className='font-black'>Nội dung và CTA</h3><div className='mt-3 grid gap-3 md:grid-cols-2'>
        {['eyebrow', 'title', 'description', 'result_title', 'empty_result', 'score_template'].map((key) => <label key={key}><span className='label'>{key}</span><input className='input' value={config.content[key] ?? ''} disabled={!editable} onChange={(event) => updateContent(key, event.target.value)} /></label>)}
        {['back', 'next', 'submit', 'loading', 'restart'].map((key) => <label key={key}><span className='label'>CTA {key}</span><input className='input' value={config.actions[key] ?? ''} disabled={!editable} onChange={(event) => updateAction(key, event.target.value)} /></label>)}
        <label><span className='label'>Locale</span><input className='input' value={config.format.locale} disabled={!editable} onChange={(event) => setConfig((current) => ({ ...current, format: { locale: event.target.value } }))} /></label>
      </div></div>
      <div>
        <div className='flex items-center justify-between'><h3 className='font-black'>Câu hỏi và lựa chọn</h3>{editable && <button className='btn-secondary px-3' type='button' onClick={addQuestion}><Plus size={16} />Thêm câu hỏi</button>}</div>
        <div className='mt-3 grid gap-4'>{config.questions.map((item, index) => <article className='rounded-2xl border p-4' key={`${item.key}-${index}`}>
          <div className='grid gap-3 md:grid-cols-3'>
            <label><span className='label'>Key kỹ thuật</span><input className='input' value={item.key} disabled={!editable} onChange={(event) => updateQuestion(index, { key: event.target.value })} /></label>
            <label><span className='label'>Loại</span><select className='input' value={item.type} disabled={!editable} onChange={(event) => updateQuestion(index, { type: event.target.value as Question['type'] })}><option value='single'>Một lựa chọn</option><option value='multiple'>Nhiều lựa chọn</option><option value='budget'>Khoảng giá</option><option value='select_group'>Nhóm thuộc tính</option></select></label>
            <label><span className='label'>Tiêu đề</span><input className='input' value={item.title} disabled={!editable} onChange={(event) => updateQuestion(index, { title: event.target.value })} /></label>
          </div>
          {['single', 'multiple'].includes(item.type) && <label className='mt-3 block'><span className='label'>Lựa chọn — mỗi dòng value|label</span><textarea className='input min-h-28 font-mono text-xs' value={choiceText(item.choices)} disabled={!editable} onChange={(event) => updateQuestion(index, { choices: parseChoices(event.target.value) })} /></label>}
          {item.type === 'select_group' && <label className='mt-3 block'><span className='label'>Fields — key|label|material/base_type|placeholder</span><textarea className='input min-h-24 font-mono text-xs' value={fieldText(item.fields)} disabled={!editable} onChange={(event) => updateQuestion(index, { fields: parseFields(event.target.value) })} /></label>}
          {editable && <button className='btn-secondary mt-3 px-3 text-red-700' type='button' onClick={() => removeQuestion(index)}><Trash2 size={15} />Xóa câu hỏi</button>}
        </article>)}</div>
      </div>
      <div><h3 className='font-black'>Ngân sách và scoring</h3><div className='mt-3 grid gap-3 md:grid-cols-3'>
        <label><span className='label'>Nhãn ngân sách, phân cách dấu phẩy</span><input className='input' value={config.budget.labels.join(', ')} disabled={!editable} onChange={(event) => setConfig((current) => ({ ...current, budget: { ...current.budget, labels: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) } }))} /></label>
        <label><span className='label'>Bước tối thiểu</span><input className='input' type='number' min='1' value={config.budget.minimum_step} disabled={!editable} onChange={(event) => setConfig((current) => ({ ...current, budget: { ...current.budget, minimum_step: Number(event.target.value) } }))} /></label>
        <label><span className='label'>Bước làm tròn</span><input className='input' type='number' min='1' value={config.budget.rounding_step} disabled={!editable} onChange={(event) => setConfig((current) => ({ ...current, budget: { ...current.budget, rounding_step: Number(event.target.value) } }))} /></label>
        {['result_limit', 'max_score'].map((key) => <label key={key}><span className='label'>{key}</span><input className='input' type='number' min='1' value={Number(config.scoring[key] ?? (key === 'result_limit' ? 5 : 100))} disabled={!editable} onChange={(event) => updateScoringNumber(key, Number(event.target.value))} /></label>)}
      </div><label className='mt-3 block'><span className='label'>Recommendation mappings nâng cao (JSON)</span><textarea className='input min-h-64 font-mono text-xs' value={mappingText} disabled={!editable} onChange={(event) => updateMappings(event.target.value, event.currentTarget)} /></label></div>
    </div>}
  </section>
}
