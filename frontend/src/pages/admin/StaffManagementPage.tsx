import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { KeyRound, Pencil, Plus, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, Pagination, StaffRole, StaffUser } from '../../types'

function message(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể thực hiện thao tác.' : 'Không thể thực hiện thao tác.'
}

export function StaffManagementPage() {
  const client = useQueryClient()
  const [filters, setFilters] = useState({ search: '', status: '', role: '' })
  const [editing, setEditing] = useState<StaffUser | 'create' | null>(null)
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null)
  const roles = useQuery({ queryKey: ['staff-roles'], queryFn: async () => (await apiClient.get<ApiResponse<StaffRole[]>>('/admin/staff-roles')).data.data })
  const staff = useQuery({ queryKey: ['staff', filters], queryFn: async () => (await apiClient.get<ApiResponse<Pagination<StaffUser>>>('/admin/staff', { params: filters })).data.data })
  const refresh = () => client.invalidateQueries({ queryKey: ['staff'] })

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const roleIds = form.getAll('role_ids').map(Number)
    const payload = {
      name: String(form.get('name') ?? ''), email: String(form.get('email') ?? ''), phone: String(form.get('phone') ?? '') || null,
    }
    try {
      if (editing === 'create') {
        await apiClient.post('/admin/staff', { ...payload, password: form.get('password'), password_confirmation: form.get('password_confirmation'), status: form.get('status'), role_ids: roleIds })
      } else if (editing) {
        await apiClient.put(`/admin/staff/${editing.id}`, payload)
        await apiClient.put(`/admin/staff/${editing.id}/roles`, { role_ids: roleIds })
        if (editing.status !== form.get('status')) await apiClient.patch(`/admin/staff/${editing.id}/status`, { status: form.get('status') })
      }
      await refresh(); setEditing(null); toast.success('Đã lưu thông tin nhân viên.')
    } catch (error) { toast.error(message(error)) }
  }

  const toggleStatus = async (row: StaffUser) => {
    try { await apiClient.patch(`/admin/staff/${row.id}/status`, { status: row.status === 'active' ? 'blocked' : 'active' }); await refresh(); toast.success(row.status === 'active' ? 'Đã khóa nhân viên.' : 'Đã mở khóa nhân viên.') }
    catch (error) { toast.error(message(error)) }
  }

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!resetTarget) return
    const form = new FormData(event.currentTarget)
    try { await apiClient.put(`/admin/staff/${resetTarget.id}/password`, { password: form.get('password'), password_confirmation: form.get('password_confirmation') }); setResetTarget(null); toast.success('Đã đặt lại mật khẩu.') }
    catch (error) { toast.error(message(error)) }
  }

  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Nhân viên</h1><p className="muted">Tạo tài khoản backoffice, khóa truy cập và gán nhiều vai trò.</p></div><button className="btn-primary" onClick={() => setEditing('create')}><Plus size={18} />Tạo nhân viên</button></div>
    <div className="card mb-5 grid gap-3 p-4 md:grid-cols-3"><input className="input" placeholder="Tìm tên, email, số điện thoại" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} /><select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="blocked">Đã khóa</option></select><select className="input" value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}><option value="">Tất cả vai trò</option>{roles.data?.map((role) => <option key={role.id} value={role.slug}>{role.name}</option>)}</select></div>
    {staff.isLoading ? <LoadingState /> : <div className="table-wrap"><table className="table"><thead><tr><th>Nhân viên</th><th>Điện thoại</th><th>Trạng thái</th><th>Vai trò</th><th>Ngày tạo</th><th>Hành động</th></tr></thead><tbody>{staff.data?.data.map((row) => <tr key={row.id}><td><strong>{row.name}</strong><div className="text-sm text-slate-500">{row.email}</div></td><td>{row.phone || '-'}</td><td><span className={row.status === 'active' ? 'font-bold text-emerald-700' : 'font-bold text-red-700'}>{row.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</span></td><td><div className="flex flex-wrap gap-1">{row.staff_roles.map((role) => <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold" key={role.id}>{role.name}</span>)}</div></td><td>{row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '-'}</td><td><div className="flex flex-wrap gap-2"><button className="btn-secondary px-3" title="Sửa và gán vai trò" onClick={() => setEditing(row)}><Pencil size={16} /></button><button className="btn-secondary px-3" title="Đặt lại mật khẩu" onClick={() => setResetTarget(row)}><KeyRound size={16} /></button><button className={row.status === 'active' ? 'btn-secondary text-red-700' : 'btn-primary'} onClick={() => void toggleStatus(row)}>{row.status === 'active' ? 'Khóa' : 'Mở khóa'}</button></div></td></tr>)}</tbody></table></div>}
    {editing && <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/50 p-4"><form key={editing === 'create' ? 'create' : editing.id} className="card my-8 w-full max-w-2xl p-6" onSubmit={save}><div className="flex items-center justify-between"><div><h2 className="text-2xl font-black">{editing === 'create' ? 'Tạo nhân viên' : 'Sửa nhân viên'}</h2><p className="muted text-sm">Tài khoản hoạt động phải có ít nhất một vai trò.</p></div><button className="btn-secondary" type="button" onClick={() => setEditing(null)}>Đóng</button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label><span className="label">Họ tên</span><input className="input" name="name" defaultValue={editing === 'create' ? '' : editing.name} required /></label><label><span className="label">Email</span><input className="input" name="email" type="email" defaultValue={editing === 'create' ? '' : editing.email} required /></label><label><span className="label">Điện thoại</span><input className="input" name="phone" defaultValue={editing === 'create' ? '' : editing.phone ?? ''} /></label><label><span className="label">Trạng thái</span><select className="input" name="status" defaultValue={editing === 'create' ? 'active' : editing.status}><option value="active">Hoạt động</option><option value="blocked">Đã khóa</option></select></label>{editing === 'create' && <><label><span className="label">Mật khẩu</span><input className="input" name="password" type="password" minLength={8} required /></label><label><span className="label">Xác nhận mật khẩu</span><input className="input" name="password_confirmation" type="password" minLength={8} required /></label></>}<fieldset className="md:col-span-2"><legend className="label">Vai trò</legend><div className="grid gap-2 rounded-xl border p-4 sm:grid-cols-2">{roles.data?.map((role) => <label className="flex items-center gap-2" key={role.id}><input name="role_ids" type="checkbox" value={role.id} defaultChecked={editing !== 'create' && editing.staff_roles.some((assigned) => assigned.id === role.id)} /><ShieldCheck size={16} />{role.name}</label>)}</div></fieldset></div><button className="btn-primary mt-5">Lưu nhân viên</button></form></div>}
    {resetTarget && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"><form className="card w-full max-w-md p-6" onSubmit={resetPassword}><h2 className="text-2xl font-black">Đặt lại mật khẩu</h2><p className="muted mt-1">{resetTarget.name} · {resetTarget.email}</p><label className="mt-4 block"><span className="label">Mật khẩu mới</span><input className="input" name="password" type="password" minLength={8} required /></label><label className="mt-4 block"><span className="label">Xác nhận mật khẩu</span><input className="input" name="password_confirmation" type="password" minLength={8} required /></label><div className="mt-5 flex gap-3"><button className="btn-primary">Đặt lại</button><button className="btn-secondary" type="button" onClick={() => setResetTarget(null)}>Hủy</button></div></form></div>}
  </div>
}
