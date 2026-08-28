import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../types'
import { AdminProtectedRoute } from './AdminProtectedRoute'
import { PermissionProtectedRoute } from './PermissionProtectedRoute'
import { UserProtectedRoute } from './UserProtectedRoute'

const auth = vi.hoisted(() => ({ user: null as User | null, loading: false }))
vi.mock('../stores/AuthContext', () => ({ useAuth: () => auth }))

const customer = { id: 1, name: 'Customer', email: 'customer@test.local', role: 'user', status: 'active' } as User
const staff = { ...customer, id: 2, name: 'Staff', email: 'staff@test.local', role: 'staff', permissions: ['products.view'] } as User
const admin = { ...customer, id: 3, name: 'Admin', email: 'admin@test.local', role: 'admin', permissions: [] } as User

describe('route guards', () => {
  beforeEach(() => { auth.user = null; auth.loading = false })

  it('chuyển Customer khỏi route Admin', () => {
    auth.user = customer
    render(<MemoryRouter initialEntries={['/admin']}><Routes><Route element={<AdminProtectedRoute />}><Route path="/admin" element={<div>Dashboard</div>} /></Route><Route path="/admin/login" element={<div>Admin login</div>} /></Routes></MemoryRouter>)
    expect(screen.getByText('Admin login')).toBeInTheDocument()
  })

  it('cho Staff vào Admin shell', () => {
    auth.user = staff
    render(<MemoryRouter initialEntries={['/admin']}><Routes><Route element={<AdminProtectedRoute />}><Route path="/admin" element={<div>Backoffice</div>} /></Route></Routes></MemoryRouter>)
    expect(screen.getByText('Backoffice')).toBeInTheDocument()
  })

  it('trả Forbidden khi Staff thiếu permission route', () => {
    auth.user = staff
    render(<MemoryRouter initialEntries={['/admin/settings']}><Routes><Route path="/admin/settings" element={<PermissionProtectedRoute><div>Settings</div></PermissionProtectedRoute>} /></Routes></MemoryRouter>)
    expect(screen.getByText(/không có quyền truy cập/i)).toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('khóa URL tạo sản phẩm với Staff chỉ có quyền xem', () => {
    auth.user = staff
    render(<MemoryRouter initialEntries={['/admin/products/create']}><Routes><Route path="/admin/products/create" element={<PermissionProtectedRoute><div>Create product</div></PermissionProtectedRoute>} /></Routes></MemoryRouter>)
    expect(screen.getByText(/không có quyền truy cập/i)).toBeInTheDocument()
    expect(screen.queryByText('Create product')).not.toBeInTheDocument()
  })

  it('cho Super Admin bypass permission route', () => {
    auth.user = admin
    render(<MemoryRouter initialEntries={['/admin/settings']}><Routes><Route path="/admin/settings" element={<PermissionProtectedRoute><div>Settings</div></PermissionProtectedRoute>} /></Routes></MemoryRouter>)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('chuyển Staff khỏi Customer Account', () => {
    auth.user = staff
    render(<MemoryRouter initialEntries={['/tai-khoan']}><Routes><Route element={<UserProtectedRoute />}><Route path="/tai-khoan" element={<div>Customer account</div>} /></Route><Route path="/admin" element={<div>Admin index</div>} /></Routes></MemoryRouter>)
    expect(screen.getByText('Admin index')).toBeInTheDocument()
  })
})
