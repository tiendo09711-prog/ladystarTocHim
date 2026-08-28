import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../api/apiClient'
import { LoadingState } from '../../components/common/LoadingState'
import type { ApiResponse, Permission, StaffRole } from '../../types'

export function StaffRolesPage() {
  const client = useQueryClient()
  const [editing, setEditing] = useState<StaffRole | 'create' | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const roles = useQuery({ queryKey: ['staff-roles'], queryFn: async () => (await apiClient.get<ApiResponse<StaffRole[]>>('/admin/staff-roles')).data.data })
  const permissions = useQuery({ queryKey: ['permissions'], queryFn: async () => (await apiClient.get<ApiResponse<Permission[]>>('/admin/permissions')).data.data })
  const groups = useMemo(() => (permissions.data ?? []).reduce<Record<string, Permission[]>>((result, permission) => {
    result[permission.group_name] = [...(result[permission.group_name] ?? []), permission]
    return result
  }, {}), [permissions.data])
  const open = (role: StaffRole | 'create') => { setEditing(role); setSelected(role === 'create' ? [] : role.permissions.map((permission) => permission.id)) }
  const refresh = () => client.invalidateQueries({ queryKey: ['staff-roles'] })

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = { name: form.get('name'), slug: form.get('slug'), description: String(form.get('description') ?? '') || null }
    try {
      if (editing === 'create') await apiClient.post('/admin/staff-roles', { ...payload, permission_ids: selected })
      else if (editing) { await apiClient.put(`/admin/staff-roles/${editing.id}`, payload); await apiClient.put(`/admin/staff-roles/${editing.id}/permissions`, { permission_ids: selected }) }
      await refresh(); setEditing(null); toast.success('Đã lưu vai trò và quyền.')
    } catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể lưu vai trò.' : 'Không thể lưu vai trò.') }
  }

  const remove = async (role: StaffRole) => {
    if (!confirm(`Xóa vai trò ${role.name}?`)) return
    try { await apiClient.delete(`/admin/staff-roles/${role.id}`); await refresh(); toast.success('Đã xóa vai trò.') }
    catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể xóa vai trò.' : 'Không thể xóa vai trò.') }
  }

  const toggleGroup = (groupPermissions: Permission[], checked: boolean) => {
    const ids = groupPermissions.map((permission) => permission.id)
    setSelected((current) => checked ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id)))
  }

  return <div><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Vai trò & quyền</h1><p className="muted">Permission là catalog hệ thống; vai trò có thể gom nhiều permission chức năng.</p></div><button className="btn-primary" onClick={() => open('create')}><Plus size={18} />Tạo vai trò</button></div>{roles.isLoading ? <LoadingState /> : <div className="table-wrap"><table className="table"><thead><tr><th>Vai trò</th><th>Loại</th><th>Nhân viên</th><th>Permissions</th><th>Hành động</th></tr></thead><tbody>{roles.data?.map((role) => <tr key={role.id}><td><strong>{role.name}</strong><div className="text-sm text-slate-500">{role.slug}</div><div className="text-sm text-slate-500">{role.description}</div></td><td>{role.is_system ? 'Hệ thống' : 'Tùy chỉnh'}</td><td>{role.users_count ?? 0}</td><td>{role.permissions_count ?? role.permissions.length}</td><td><div className="flex gap-2"><button className="btn-secondary px-3" onClick={() => open(role)}><Pencil size={16} /></button>{!role.is_system && <button className="btn-secondary px-3 text-red-700" onClick={() => void remove(role)}><Trash2 size={16} /></button>}</div></td></tr>)}</tbody></table></div>}{editing && <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/50 p-4"><form key={editing === 'create' ? 'create' : editing.id} className="card mx-auto my-6 max-w-5xl p-6" onSubmit={save}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">{editing === 'create' ? 'Tạo vai trò' : `Quyền: ${editing.name}`}</h2><p className="muted text-sm">Staff không thể truy cập API quản lý nhân viên hoặc role dù được chỉnh request.</p></div><button className="btn-secondary" type="button" onClick={() => setEditing(null)}>Đóng</button></div><div className="mt-5 grid gap-4 md:grid-cols-3"><label><span className="label">Tên vai trò</span><input className="input" name="name" defaultValue={editing === 'create' ? '' : editing.name} required /></label><label><span className="label">Slug</span><input className="input" name="slug" defaultValue={editing === 'create' ? '' : editing.slug} required /></label><label><span className="label">Mô tả</span><input className="input" name="description" defaultValue={editing === 'create' ? '' : editing.description ?? ''} /></label></div><div className="mt-5 grid gap-4 lg:grid-cols-2">{Object.entries(groups).map(([group, groupPermissions]) => { const list = groupPermissions ?? []; const all = list.every((permission) => selected.includes(permission.id)); return <fieldset className="rounded-xl border p-4" key={group}><div className="mb-3 flex items-center justify-between gap-3"><legend className="font-black">{group}</legend><div className="flex gap-2"><button className="text-sm font-bold text-emerald-800" type="button" onClick={() => toggleGroup(list, true)}>Chọn nhóm</button><button className="text-sm font-bold text-slate-500" type="button" onClick={() => toggleGroup(list, false)}>Bỏ nhóm</button></div></div><div className="grid gap-2">{list.map((permission) => <label className="flex items-start gap-2" key={permission.id}><input className="mt-1" type="checkbox" checked={selected.includes(permission.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, permission.id] : current.filter((id) => id !== permission.id))} /><span><strong className="block text-sm">{permission.key}</strong><span className="text-xs text-slate-500">{permission.label}</span></span></label>)}</div>{all && <div className="mt-2 text-xs font-bold text-emerald-700">Đã chọn toàn bộ nhóm</div>}</fieldset> })}</div><button className="btn-primary mt-5" disabled={selected.length === 0}>Lưu vai trò</button></form></div>}</div>
}
