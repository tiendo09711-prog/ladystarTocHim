export function LoadingState({ label = 'Đang tải dữ liệu...' }: { label?: string }) {
  return <div className="card p-8 text-center text-slate-500" role="status">{label}</div>
}
