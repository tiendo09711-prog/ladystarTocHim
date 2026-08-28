import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import type { Address, ApiResponse } from '../../types'

type AddressDraft = Partial<Address>

function errorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback
  const response = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
  return Object.values(response?.errors ?? {})[0]?.[0] ?? response?.message ?? fallback
}

export function AddressesPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['addresses'], queryFn: async () => (await apiClient.get<ApiResponse<Address[]>>('/account/addresses')).data.data })
  const [draft, setDraft] = useState<AddressDraft | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const refresh = () => client.invalidateQueries({ queryKey: ['addresses'] })
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = { recipient_name: String(form.get('recipient_name') ?? ''), phone: String(form.get('phone') ?? ''), province: String(form.get('province') ?? ''), district: String(form.get('district') ?? ''), ward: String(form.get('ward') ?? ''), address_line: String(form.get('address_line') ?? ''), postal_code: String(form.get('postal_code') ?? '') || null, is_default: form.get('is_default') === 'on' }
    setPendingAction('save')
    try {
      if (draft?.id) await apiClient.put(`/account/addresses/${draft.id}`, payload)
      else await apiClient.post('/account/addresses', payload)
      await refresh(); setDraft(null); toast.success(draft?.id ? 'Đã cập nhật địa chỉ.' : 'Đã thêm địa chỉ.')
    } catch (error) { toast.error(errorMessage(error, 'Thông tin địa chỉ chưa hợp lệ.')) }
    finally { setPendingAction(null) }
  }
  const remove = async (address: Address) => {
    if (!confirm(`Xóa địa chỉ của ${address.recipient_name}?`)) return
    setPendingAction(`delete-${address.id}`)
    try { await apiClient.delete(`/account/addresses/${address.id}`); await refresh(); toast.success('Đã xóa địa chỉ.') }
    catch (error) { toast.error(errorMessage(error, 'Không thể xóa địa chỉ.')) }
    finally { setPendingAction(null) }
  }
  const setDefault = async (address: Address) => {
    setPendingAction(`default-${address.id}`)
    try { await apiClient.patch(`/account/addresses/${address.id}/default`); await refresh(); toast.success('Đã đặt địa chỉ mặc định.') }
    catch (error) { toast.error(errorMessage(error, 'Không thể đặt địa chỉ mặc định.')) }
    finally { setPendingAction(null) }
  }
  const fields = [['recipient_name', 'Người nhận'], ['phone', 'Số điện thoại'], ['province', 'Tỉnh / thành'], ['district', 'Quận / huyện'], ['ward', 'Phường / xã'], ['address_line', 'Địa chỉ cụ thể'], ['postal_code', 'Mã bưu chính']] as const
  return <div className='card p-6'>
    <div className='flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-2xl font-black'>Địa chỉ nhận hàng</h1><p className='muted mt-1'>Quản lý địa chỉ dùng khi thanh toán.</p></div><button className='btn-primary' onClick={() => setDraft({ is_default: !query.data?.length })}>Thêm địa chỉ</button></div>
    {draft && <form key={draft.id ?? 'new'} className='mt-6 grid gap-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2' onSubmit={submit}>{fields.map(([name, label]) => <label key={name} className={name === 'address_line' ? 'sm:col-span-2' : ''}><span className='label'>{label}</span><input className='input' name={name} defaultValue={String(draft[name] ?? '')} required={name !== 'postal_code'} /></label>)}<label className='flex items-center gap-2'><input type='checkbox' name='is_default' defaultChecked={draft.is_default ?? false} /> Đặt làm mặc định</label><div className='flex flex-wrap gap-2 sm:col-span-2'><button className='btn-primary' disabled={pendingAction === 'save'}>{pendingAction === 'save' ? 'Đang lưu...' : 'Lưu địa chỉ'}</button><button type='button' className='btn-secondary' onClick={() => setDraft(null)} disabled={pendingAction === 'save'}>Hủy</button></div></form>}
    {query.isLoading ? <div className='mt-6'><LoadingState /></div> : query.data?.length ? <div className='mt-6 grid gap-4'>{query.data.map((address) => <article key={address.id} className='rounded-2xl border p-5'><div className='flex flex-wrap items-center gap-2'><strong>{address.recipient_name}</strong><span>{address.phone}</span>{address.is_default && <span className='rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800'>Mặc định</span>}</div><p className='muted mt-2'>{address.address_line}, {address.ward}, {address.district}, {address.province}{address.postal_code ? ` · ${address.postal_code}` : ''}</p><div className='mt-4 flex flex-wrap gap-2'><button className='btn-secondary px-3' onClick={() => setDraft(address)}>Sửa</button>{!address.is_default && <button className='btn-secondary px-3' disabled={pendingAction === `default-${address.id}`} onClick={() => void setDefault(address)}>{pendingAction === `default-${address.id}` ? 'Đang đặt...' : 'Đặt mặc định'}</button>}<button className='btn-secondary px-3 text-red-700' disabled={pendingAction === `delete-${address.id}`} onClick={() => void remove(address)}>{pendingAction === `delete-${address.id}` ? 'Đang xóa...' : 'Xóa'}</button></div></article>)}</div> : <div className='mt-6'><EmptyState title='Chưa có địa chỉ' description='Thêm địa chỉ để thanh toán nhanh hơn.' /></div>}
  </div>
}
