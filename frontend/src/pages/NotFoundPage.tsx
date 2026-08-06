import { Link } from 'react-router-dom'

export function NotFoundPage() { return <div className="grid min-h-[60vh] place-items-center p-5"><div className="text-center"><div className="text-7xl font-black text-emerald-800">404</div><h1 className="mt-3 text-2xl font-black">Không tìm thấy trang</h1><p className="muted mt-2">Đường dẫn không tồn tại hoặc đã được thay đổi.</p><Link to="/" className="btn-primary mt-6">Về trang chủ</Link></div></div> }
