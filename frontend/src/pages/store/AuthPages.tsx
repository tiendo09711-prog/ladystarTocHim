import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { useAuth } from '../../stores/AuthContext'
import { apiClient } from '../../api/apiClient'
import { getFirstAllowedAdminPath } from '../../config/adminNavigation'
import { isBackofficeUser } from '../../features/auth/permissions'

const loginSchema = z.object({ email: z.email('Email không hợp lệ.'), password: z.string().min(1, 'Vui lòng nhập mật khẩu.') })
type LoginData = z.infer<typeof loginSchema>
const registerSchema = loginSchema.extend({ name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự.'), phone: z.string().optional(), password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'), password_confirmation: z.string() }).refine((value) => value.password === value.password_confirmation, { path: ['password_confirmation'], message: 'Xác nhận mật khẩu không khớp.' })
type RegisterData = z.infer<typeof registerSchema>

export function LoginPage({ admin = false }: { admin?: boolean }) {
  const { user, login, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({ resolver: zodResolver(loginSchema), defaultValues: admin ? { email: 'admin@namhair.local', password: 'Admin@123456' } : undefined })
  if (user && (!admin || isBackofficeUser(user))) return <Navigate to={admin ? getFirstAllowedAdminPath(user) ?? '/admin/forbidden' : '/tai-khoan'} replace />
  const submit = async (data: LoginData) => {
    try { const result = await login(data, admin); toast.success('Đăng nhập thành công.'); const from = (location.state as { from?: string } | null)?.from; navigate(from ?? (isBackofficeUser(result) ? getFirstAllowedAdminPath(result) ?? '/admin/forbidden' : '/tai-khoan')) }
    catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Đăng nhập thất bại.' : 'Đăng nhập thất bại.') }
  }
  return <div className={admin ? 'grid min-h-screen place-items-center bg-[#173a2c] p-5' : 'container-page py-14'}><div className="card mx-auto w-full max-w-md p-7"><div className="text-sm font-bold uppercase tracking-[.16em] text-emerald-700">{admin ? 'Khu vực quản trị' : 'Chào mừng trở lại'}</div><h1 className="mt-2 text-3xl font-black">{admin ? 'Đăng nhập admin' : 'Đăng nhập'}</h1><form className="mt-6 grid gap-4" onSubmit={handleSubmit(submit)}><label><span className="label">Email</span><input className="input" type="email" {...register('email')} />{errors.email && <span className="text-sm text-red-600">{errors.email.message}</span>}</label><label><span className="label">Mật khẩu</span><input className="input" type="password" {...register('password')} />{errors.password && <span className="text-sm text-red-600">{errors.password.message}</span>}</label><button className="btn-primary mt-2" disabled={isSubmitting || loading}>{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button></form>{!admin && <div className="mt-5 flex justify-between text-sm"><Link to="/quen-mat-khau" className="font-bold text-emerald-800">Quên mật khẩu?</Link><Link to="/dang-ky" className="font-bold text-emerald-800">Tạo tài khoản</Link></div>}</div></div>
}

export function RegisterPage() {
  const { user, register: createAccount } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterData>({ resolver: zodResolver(registerSchema) })
  if (user) return <Navigate to="/tai-khoan" replace />
  const submit = async (data: RegisterData) => { try { await createAccount(data); toast.success('Tạo tài khoản thành công.'); navigate('/tai-khoan') } catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể đăng ký.' : 'Không thể đăng ký.') } }
  return <div className="container-page py-14"><div className="card mx-auto max-w-lg p-7"><h1 className="text-3xl font-black">Đăng ký tài khoản</h1><p className="muted mt-2">Lưu địa chỉ, theo dõi đơn hàng và đánh giá sản phẩm.</p><form className="mt-6 grid gap-4" onSubmit={handleSubmit(submit)}>{[['name', 'Họ và tên', 'text'], ['email', 'Email', 'email'], ['phone', 'Số điện thoại', 'tel'], ['password', 'Mật khẩu', 'password'], ['password_confirmation', 'Xác nhận mật khẩu', 'password']].map(([name, label, type]) => <label key={name}><span className="label">{label}</span><input className="input" type={type} {...register(name as keyof RegisterData)} />{errors[name as keyof RegisterData] && <span className="text-sm text-red-600">{errors[name as keyof RegisterData]?.message}</span>}</label>)}<button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}</button></form><p className="mt-5 text-sm">Đã có tài khoản? <Link className="font-bold text-emerald-800" to="/dang-nhap">Đăng nhập</Link></p></div></div>
}

export function ForgotPasswordPage() {
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const email = String(new FormData(event.currentTarget).get('email')); try { await apiClient.post('/auth/forgot-password', { email }); toast.success('Nếu email tồn tại, hướng dẫn sẽ được gửi.') } catch { toast.error('Không thể gửi yêu cầu lúc này.') } }
  return <div className="container-page py-14"><div className="card mx-auto max-w-md p-7"><h1 className="text-3xl font-black">Quên mật khẩu</h1><p className="muted mt-2">Nhập email để nhận hướng dẫn đặt lại mật khẩu.</p><form className="mt-6 grid gap-4" onSubmit={submit}><label><span className="label">Email</span><input className="input" name="email" type="email" required /></label><button className="btn-primary">Gửi hướng dẫn</button></form></div></div>
}

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const navigate = useNavigate()
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries()); try { await apiClient.post('/auth/reset-password', { ...data, token: params.get('token') ?? '' }); toast.success('Đặt lại mật khẩu thành công.'); navigate('/dang-nhap') } catch { toast.error('Liên kết không hợp lệ hoặc đã hết hạn.') } }
  return <div className="container-page py-14"><div className="card mx-auto max-w-md p-7"><h1 className="text-3xl font-black">Đặt lại mật khẩu</h1><form className="mt-6 grid gap-4" onSubmit={submit}><label><span className="label">Email</span><input className="input" name="email" type="email" defaultValue={params.get('email') ?? ''} required /></label><label><span className="label">Mật khẩu mới</span><input className="input" name="password" type="password" minLength={8} required /></label><label><span className="label">Xác nhận mật khẩu</span><input className="input" name="password_confirmation" type="password" minLength={8} required /></label><button className="btn-primary">Đặt lại mật khẩu</button></form></div></div>
}
