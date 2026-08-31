import { FileDown, FileUp } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { apiClient } from '../../api/apiClient'
import type { ApiResponse } from '../../types'
import { useFormatPrice } from '../../utils/format'
import { useAuth } from '../../stores/AuthContext'
import { can } from '../../features/auth/permissions'

type JsonRecord = Record<string, string | number | boolean | null>
interface ImportRow { name?: string; base_sku?: string; category?: string; description?: string; material?: string; base_type?: string; variant_sku?: string; barcode?: string; price?: number; sale_price?: number; stock_quantity?: number; branch_code?: string; status?: string }
interface ImportResult { created: number; failed: number; errors: { row: number; message: string }[] }
const exportOptions = [['products', 'Sản phẩm'], ['orders', 'Đơn hàng'], ['inventory', 'Tồn kho'], ['customers', 'Khách hàng']] as const

export function ImportExportPage() {
  const formatPrice = useFormatPrice()
  const { user } = useAuth()
  const canImport = can(user, 'import.products') && can(user, 'products.manage') && can(user, 'inventory.adjust')
  const allowedExports = exportOptions.filter(([resource]) => can(user, `export.${resource}`))
  const [rows, setRows] = useState<ImportRow[]>([]); const [result, setResult] = useState<ImportResult | null>(null)
  const read = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { const workbook = XLSX.read(await file.arrayBuffer()); const sheet = workbook.Sheets[workbook.SheetNames[0]]; setRows(XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '' })); setResult(null) } catch { toast.error('Không thể đọc file Excel.') } }
  const importRows = async () => { try { const response = await apiClient.post<ApiResponse<ImportResult>>('/admin/import/products', { rows }); setResult(response.data.data); toast.success('Đã xử lý dữ liệu import.') } catch { toast.error('File có dữ liệu chưa hợp lệ.') } }
const downloadTemplate = () => { const headers: (keyof ImportRow)[] = ['name', 'base_sku', 'category', 'description', 'material', 'base_type', 'variant_sku', 'barcode', 'price', 'sale_price', 'stock_quantity', 'branch_code', 'status']; const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([], { header: headers }), 'products'); XLSX.writeFile(workbook, 'ladystars-import-template.xlsx') }
const exportData = async (resource: typeof exportOptions[number][0], label: string) => { try { const response = await apiClient.get<ApiResponse<JsonRecord[]>>(`/admin/export/${resource}`); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(response.data.data), resource); XLSX.writeFile(workbook, `ladystars-${resource}-${new Date().toISOString().slice(0, 10)}.xlsx`); toast.success(`Đã export ${label.toLowerCase()}.`) } catch { toast.error(`Không thể export ${label.toLowerCase()}.`) } }
  return <div><div className="mb-6"><h1 className="text-3xl font-black">Import / Export Excel</h1><p className="muted">Nhập sản phẩm theo mẫu và chỉ xuất đúng nhóm dữ liệu được cấp quyền.</p><p className="muted mt-2 text-sm">Mỗi dòng import bắt buộc có danh mục, mô tả, mã chi nhánh đang hoạt động; status chỉ nhận draft, inactive hoặc active. Để trống status sẽ tạo bản nháp, không tự xuất bản.</p></div><div className="grid gap-6 lg:grid-cols-2">{canImport && <section className="card p-6"><h2 className="text-xl font-black">Import sản phẩm</h2><div className="mt-5 flex flex-wrap gap-3"><label className="btn-primary"><FileUp size={18} />Chọn file<input className="hidden" type="file" accept=".xlsx,.xls" onChange={read} /></label><button className="btn-secondary" onClick={downloadTemplate}>Tải file mẫu</button></div><p className="muted mt-3 text-sm">Đã đọc {rows.length} dòng, tối đa 500 dòng mỗi lần.</p>{rows.length > 0 && <><div className="table-wrap mt-5 max-h-72"><table className="table"><thead><tr><th>Dòng</th><th>Tên</th><th>SKU</th><th>Giá</th><th>Tồn</th></tr></thead><tbody>{rows.slice(0, 20).map((row, index) => <tr key={`${row.variant_sku}-${index}`}><td>{index + 2}</td><td>{row.name}</td><td>{row.variant_sku}</td><td>{formatPrice(row.price ?? 0)}</td><td>{row.stock_quantity}</td></tr>)}</tbody></table></div><button className="btn-primary mt-4" onClick={importRows}>Xác nhận import</button></>}{result && <div className="mt-4 rounded-xl bg-slate-50 p-4"><strong>Thành công: {result.created} · Lỗi: {result.failed}</strong>{result.errors.map((error) => <div key={`${error.row}-${error.message}`} className="mt-1 text-sm text-red-700">Dòng {error.row}: {error.message}</div>)}</div>}</section>}<section className="card p-6"><h2 className="text-xl font-black">Export dữ liệu</h2><p className="muted mt-2">Mỗi loại export được backend kiểm tra bằng permission riêng.</p><div className="mt-5 grid gap-3">{allowedExports.map(([resource, label]) => <button key={resource} className="btn-secondary justify-start" onClick={() => exportData(resource, label)}><FileDown size={18} />Export {label.toLowerCase()}</button>)}</div>{allowedExports.length === 0 && <p className="muted mt-4">Bạn chưa có quyền export dữ liệu.</p>}</section></div></div>
}
