import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'

const emptyForm = { current_password: '', password: '', password_confirmation: '' }

export function SecurityPage() {
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const confirmationError = form.password_confirmation && form.password_confirmation !== form.password ? 'Xác nhận mật khẩu mới không khớp.' : ''
  const change = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (confirmationError) return setError(confirmationError)
    setSubmitting(true); setError('')
    try {
      await apiClient.put('/account/password', form)
      setForm(emptyForm); toast.success('Đổi mật khẩu thành công.')
    } catch (caughtError) {
      const response = axios.isAxiosError(caughtError) ? caughtError.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined : undefined
      const message = response?.errors?.current_password?.[0] ?? response?.errors?.password?.[0] ?? response?.message ?? 'Không thể đổi mật khẩu.'
      setError(message); toast.error(message)
    } finally { setSubmitting(false) }
  }
  return <div className='card p-6'><h1 className='text-2xl font-black'>Bảo mật</h1><p className='muted mt-2'>Đổi mật khẩu thường xuyên để bảo vệ tài khoản.</p><form className='mt-6 grid max-w-xl gap-4' onSubmit={submit}>
    <label><span className='label'>Mật khẩu hiện tại</span><input className='input' type='password' value={form.current_password} onChange={(event) => change('current_password', event.target.value)} required /></label>
    <label><span className='label'>Mật khẩu mới</span><input className='input' type='password' value={form.password} onChange={(event) => change('password', event.target.value)} required /></label>
    <label><span className='label'>Xác nhận mật khẩu mới</span><input className='input' type='password' value={form.password_confirmation} onChange={(event) => change('password_confirmation', event.target.value)} required />{confirmationError && <span className='mt-1 block text-sm font-semibold text-red-600'>{confirmationError}</span>}</label>
    {error && <div className='rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700' role='alert'>{error}</div>}
    <button className='btn-primary w-fit' disabled={submitting || Boolean(confirmationError)}>{submitting ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}</button>
  </form></div>
}
