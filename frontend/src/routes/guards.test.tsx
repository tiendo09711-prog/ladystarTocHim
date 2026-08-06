import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AdminProtectedRoute } from './AdminProtectedRoute'

vi.mock('../stores/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, name: 'User', email: 'u@test.local', role: 'user', status: 'active' }, loading: false }) }))

describe('route guard', () => {
  it('chuyển user thường khỏi route admin', () => {
    render(<MemoryRouter initialEntries={['/admin']}><Routes><Route element={<AdminProtectedRoute />}><Route path="/admin" element={<div>Dashboard</div>} /></Route><Route path="/admin/login" element={<div>Admin login</div>} /></Routes></MemoryRouter>)
    expect(screen.getByText('Admin login')).toBeInTheDocument()
  })
})
