import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '../../api/apiClient'
import { LoadingState } from '../../components/common/LoadingState'
import { ProductCard } from '../../components/products/ProductCard'
import type { ApiResponse, HairFinderChoice, HairFinderOptions, HairFinderQuestion, HairFinderRecommendation } from '../../types'

type AnswerValue = string | string[] | number | undefined
type HairFinderAnswers = Record<string, AnswerValue>

export function HairFinderPage() {
  const options = useQuery({ queryKey: ['hair-finder-options'], queryFn: async () => (await apiClient.get<ApiResponse<HairFinderOptions>>('/hair-finder/options')).data.data })
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<HairFinderAnswers>({})
  const [results, setResults] = useState<HairFinderRecommendation[]>([])
  const [loading, setLoading] = useState(false)

  if (options.isLoading || !options.data) return <div className='container-page py-12'><LoadingState /></div>

  const { actions, content, format, questions } = options.data
  const currentAnswers = Object.keys(answers).length ? answers : defaultAnswers(questions)
  const question = questions[step]
  const setAnswer = (key: string, value: AnswerValue) => setAnswers((current) => ({ ...(Object.keys(current).length ? current : defaultAnswers(questions)), [key]: value }))
  const setBudget = (minimum?: number, maximum?: number) => setAnswers((current) => ({ ...(Object.keys(current).length ? current : defaultAnswers(questions)), budget_min: minimum, budget_max: maximum }))
  const finish = async () => {
    setLoading(true)
    try {
      const response = await apiClient.post<ApiResponse<HairFinderRecommendation[]>>('/hair-finder/recommendations', currentAnswers)
      setResults(response.data.data)
      setStep(questions.length)
    } finally {
      setLoading(false)
    }
  }
  const restart = () => {
    setAnswers(defaultAnswers(questions))
    setResults([])
    setStep(0)
  }

  return <div className='container-page py-12'><div className='mx-auto max-w-4xl'>
    <div className='text-center'><p className='text-xs font-black uppercase tracking-[.2em] text-emerald-700'>{content.eyebrow}</p><h1 className='mt-2 text-4xl font-black'>{content.title}</h1><p className='muted mt-3'>{content.description}</p></div>
    {step < questions.length && question ? <div className='card mt-8 p-6 md:p-8'>
      <div className='mb-6 h-2 overflow-hidden rounded-full bg-slate-100'><div className='h-full bg-emerald-700 transition-all' style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
      <QuestionStep question={question} answers={currentAnswers} format={format} setAnswer={setAnswer} setBudget={setBudget} />
      <div className='mt-8 flex justify-between'><button className='btn-secondary' disabled={step === 0} onClick={() => setStep((current) => current - 1)}>{actions.back}</button>{step === questions.length - 1 ? <button className='btn-primary' disabled={loading} onClick={() => void finish()}>{loading ? actions.loading : actions.submit}</button> : <button className='btn-primary' onClick={() => setStep((current) => current + 1)}>{actions.next}</button>}</div>
    </div> : <section className='mt-10'>
      <div className='mb-5 flex items-center justify-between'><h2 className='text-2xl font-black'>{content.result_title}</h2><button className='btn-secondary' onClick={restart}>{actions.restart}</button></div>
      <div className='grid gap-5 md:grid-cols-2'>{results.map((result) => <article className='card overflow-hidden' key={result.product.id}><ProductCard product={result.product} /><div className='border-t p-4'><strong className='text-emerald-800'>{content.score_template.replace(':score', String(result.score))}</strong><ul className='mt-2 grid gap-1 text-sm text-slate-600'>{result.reasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul></div></article>)}</div>
      {!results.length && <p className='card p-8 text-center'>{content.empty_result}</p>}
    </section>}
  </div></div>
}

function QuestionStep({ question, answers, format, setAnswer, setBudget }: { question: HairFinderQuestion; answers: HairFinderAnswers; format: HairFinderOptions['format']; setAnswer: (key: string, value: AnswerValue) => void; setBudget: (minimum?: number, maximum?: number) => void }) {
  if (question.type === 'single') {
    return <ChoiceStep title={question.title} value={String(answers[question.key] ?? '')} choices={question.choices ?? []} onChange={(value) => setAnswer(question.key, value)} />
  }

  if (question.type === 'multiple') {
    const selected = Array.isArray(answers[question.key]) ? answers[question.key] as string[] : []
    return <section><h2 className='text-2xl font-black'>{question.title}</h2><div className='mt-5 grid gap-3 sm:grid-cols-2'>{(question.choices ?? []).map((choice) => <label className='flex cursor-pointer items-center gap-3 rounded-2xl border p-4' key={choice.value}><input type='checkbox' checked={selected.includes(choice.value)} onChange={() => setAnswer(question.key, selected.includes(choice.value) ? selected.filter((item) => item !== choice.value) : [...selected, choice.value])} />{choice.label}</label>)}</div></section>
  }

  if (question.type === 'budget') {
    const choices = question.choices ?? []
    const selected = choices.find((choice) => choice.min === answers.budget_min && choice.max === answers.budget_max)?.value ?? ''
    const formatter = new Intl.NumberFormat(format.locale, { style: 'currency', currency: format.currency, maximumFractionDigits: 0 })
    const displayChoices = choices.map((choice) => ({ ...choice, label: `${choice.label}: ${formatter.format(choice.min ?? 0)} – ${formatter.format(choice.max ?? 0)}` }))
    if (question.empty_label) displayChoices.push({ value: '', label: question.empty_label })

    return <ChoiceStep title={question.title} value={selected} choices={displayChoices} onChange={(value) => {
      const budget = choices.find((choice) => choice.value === value)
      setBudget(budget?.min, budget?.max)
    }} />
  }

  return <section><h2 className='text-2xl font-black'>{question.title}</h2><div className='mt-5 grid gap-4 sm:grid-cols-2'>{(question.fields ?? []).map((field) => <label key={field.key}><span className='label'>{field.label}</span><select className='input' value={String(answers[field.key] ?? '')} onChange={(event) => setAnswer(field.key, event.target.value)}><option value=''>{field.placeholder}</option>{field.choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>)}</div></section>
}

function ChoiceStep({ title, value, choices, onChange }: { title: string; value: string; choices: HairFinderChoice[]; onChange: (value: string) => void }) {
  return <section><h2 className='text-2xl font-black'>{title}</h2><div className='mt-5 grid gap-3 sm:grid-cols-2'>{choices.map((choice) => <button type='button' className={`rounded-2xl border p-4 text-left font-bold ${value === choice.value ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'hover:border-emerald-300'}`} key={choice.value || 'none'} onClick={() => onChange(choice.value)}>{choice.label}</button>)}</div></section>
}

function defaultAnswers(questions: HairFinderQuestion[]): HairFinderAnswers {
  return questions.reduce<HairFinderAnswers>((result, question) => {
    if (question.type === 'select_group') {
      for (const field of question.fields ?? []) result[field.key] = ''
    } else if (question.type !== 'budget') {
      result[question.key] = question.default_value ?? (question.type === 'multiple' ? [] : '')
    }

    return result
  }, {})
}
