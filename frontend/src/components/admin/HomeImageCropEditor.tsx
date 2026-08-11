import { ImagePlus, Loader2, RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { HOME_MEDIA, type HomeMediaKey, type ImageCropPreset } from '../../config/homeMedia'
import { resolveAssetUrl } from '../../utils/assetUrl'

type CropPosition = { x: number; y: number }

type AdminImageCropDialogProps = {
  file: File
  title: string
  onCancel: () => void
  onConfirm: (file: File) => void
} & ({ mediaKey: HomeMediaKey; crop?: never } | { mediaKey?: never; crop: ImageCropPreset })

type HomeImageCropEditorProps = {
  title: string
  mediaKey: HomeMediaKey
  description: string
  path?: string | null
  alt: string
  fallback: string
  uploading: boolean
  onAltChange: (value: string) => void
  onUpload: (file?: File) => void
  onRemove: () => void
  objectPositionX?: number
  objectPositionY?: number
  onObjectPositionChange?: (axis: 'x' | 'y', value: number) => void
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function cropSource(image: HTMLImageElement, targetWidth: number, targetHeight: number, zoom: number, position: CropPosition) {
  const targetRatio = targetWidth / targetHeight
  const imageRatio = image.naturalWidth / image.naturalHeight
  const baseWidth = imageRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth
  const baseHeight = imageRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio
  const width = baseWidth / zoom
  const height = baseHeight / zoom
  const maxX = (image.naturalWidth - width) / 2
  const maxY = (image.naturalHeight - height) / 2

  return {
    x: (image.naturalWidth - width) / 2 + position.x * maxX,
    y: (image.naturalHeight - height) / 2 + position.y * maxY,
    width,
    height,
  }
}

function drawCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, zoom: number, position: CropPosition) {
  const context = canvas.getContext('2d')
  if (!context) return
  const source = cropSource(image, canvas.width, canvas.height, zoom, position)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height)
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không thể tạo ảnh đã cắt.')), 'image/webp', quality)
  })
}

export function AdminImageCropDialog({ file, title, mediaKey, crop: cropPreset, onCancel, onConfirm }: AdminImageCropDialogProps) {
  const crop = cropPreset ?? (mediaKey ? HOME_MEDIA[mediaKey] : null)
  if (!crop) throw new Error('Thiếu cấu hình tỷ lệ cắt ảnh.')
  const previewRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ x: number; y: number; position: CropPosition } | null>(null)
  const [position, setPosition] = useState<CropPosition>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [ready, setReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      imageRef.current = image
      setSourceSize({ width: image.naturalWidth, height: image.naturalHeight })
      setReady(true)
    }
    image.src = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  useEffect(() => {
    const canvas = previewRef.current
    const image = imageRef.current
    if (!canvas || !image || !ready) return
    drawCrop(canvas, image, zoom, position)
  }, [position, ready, zoom])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onCancel])

  const reset = () => {
    setPosition({ x: 0, y: 0 })
    setZoom(1)
  }

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!ready) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, position }
  }

  const drag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const start = dragRef.current
    if (!start) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setPosition({
      x: clamp(start.position.x - ((event.clientX - start.x) / bounds.width) * 2, -1, 1),
      y: clamp(start.position.y - ((event.clientY - start.y) / bounds.height) * 2, -1, 1),
    })
  }

  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const confirm = async () => {
    const image = imageRef.current
    if (!image) return
    setProcessing(true)
    try {
      const output = document.createElement('canvas')
      output.width = crop.width
      output.height = crop.height
      drawCrop(output, image, zoom, position)
      let blob = await canvasBlob(output, 0.92)
      if (blob.size > 5 * 1024 * 1024) blob = await canvasBlob(output, 0.8)
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'home-image'
      onConfirm(new File([blob], `${baseName}-cropped.webp`, { type: 'image/webp' }))
    } finally {
      setProcessing(false)
    }
  }

  const previewWidth = 720
  const previewHeight = Math.round(previewWidth * crop.height / crop.width)

  return <div className="home-image-crop-backdrop" role="presentation" onMouseDown={onCancel}>
    <section className="home-image-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="home-image-crop-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="home-image-crop-heading">
        <div><p className="home-kicker">Căn ảnh theo đúng khung</p><h2 id="home-image-crop-title">Cắt ảnh {title}</h2><p>Kéo ảnh để chọn trọng tâm, sau đó phóng to nếu cần. Ảnh sẽ được xuất theo tỷ lệ {crop.label}.</p></div>
        <button type="button" onClick={onCancel} aria-label="Đóng trình cắt ảnh"><X size={21} /></button>
      </div>
      <div className="home-image-crop-stage">
        {!ready && <div className="home-image-crop-loading"><Loader2 className="animate-spin" size={26} /> Đang chuẩn bị ảnh...</div>}
        <canvas ref={previewRef} width={previewWidth} height={previewHeight} aria-label={`Bản xem trước ảnh ${title} sau khi cắt`} onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} />
      </div>
      {ready && (sourceSize.width < crop.width || sourceSize.height < crop.height) && <p className="home-image-resolution-warning">Ảnh có độ phân giải thấp hơn {crop.width} × {crop.height}px và có thể bị mờ trên màn hình lớn.</p>}
      <div className="home-image-crop-controls">
        <label><span>Thu phóng</span><input aria-label={`Thu phóng ảnh ${title}`} type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
        <label><span>Ngang</span><input aria-label={`Căn ngang ảnh ${title}`} type="range" min="-1" max="1" step="0.01" value={position.x} onChange={(event) => setPosition((current) => ({ ...current, x: Number(event.target.value) }))} /></label>
        <label><span>Dọc</span><input aria-label={`Căn dọc ảnh ${title}`} type="range" min="-1" max="1" step="0.01" value={position.y} onChange={(event) => setPosition((current) => ({ ...current, y: Number(event.target.value) }))} /></label>
      </div>
      <div className="home-image-crop-actions">
        <button className="btn-secondary" type="button" onClick={reset}><RotateCcw size={17} /> Tự động căn giữa</button>
        <div><button className="btn-secondary" type="button" onClick={onCancel}>Chọn ảnh khác</button><button className="btn-primary" type="button" disabled={!ready || processing} onClick={() => { void confirm() }}>{processing ? <Loader2 className="animate-spin" size={18} /> : <ImagePlus size={18} />} Dùng ảnh đã cắt</button></div>
      </div>
    </section>
  </div>
}

export function HomeImageCropEditor({ title, mediaKey, description, path, alt, fallback, uploading, onAltChange, onUpload, onRemove, objectPositionX, objectPositionY, onObjectPositionChange }: HomeImageCropEditorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectionError, setSelectionError] = useState('')
  const crop = HOME_MEDIA[mediaKey]
  const previewPositionX = clamp(objectPositionX ?? 50, 0, 100)
  const previewPositionY = clamp(objectPositionY ?? 50, 0, 100)

  return <div className="mt-5 grid gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
    <div><h3 className="font-black">Ảnh {title}</h3><p className="muted mt-1 text-sm">{description} Khung hiển thị: {crop.label}. Bạn có thể tải ảnh với tỷ lệ bất kỳ; ảnh sẽ được cắt theo khung khi hiển thị.</p></div>
    <div className={`fixed-media-frame home-image-admin-preview is-${mediaKey}`} style={{ '--media-ratio': `${crop.width} / ${crop.height}`, '--media-x': `${previewPositionX}%`, '--media-y': `${previewPositionY}%` } as CSSProperties}><img src={resolveAssetUrl(path, fallback)} alt={alt || `Ảnh ${title}`} onError={(event) => { const fallbackSource = resolveAssetUrl(fallback); if (!event.currentTarget.src.endsWith(fallbackSource)) event.currentTarget.src = fallbackSource }} /></div>
    {onObjectPositionChange && <div className="home-image-position-controls" aria-label={`Vị trí trọng tâm ảnh ${title}`}>
      <label><span><strong>Ngang</strong><output>{Math.round(previewPositionX)}%</output></span><input aria-label={`Vị trí ảnh ${title} ngang`} type="range" min="0" max="100" step="1" value={previewPositionX} onChange={(event) => onObjectPositionChange('x', Number(event.target.value))} /></label>
      <label><span><strong>Dọc</strong><output>{Math.round(previewPositionY)}%</output></span><input aria-label={`Vị trí ảnh ${title} dọc`} type="range" min="0" max="100" step="1" value={previewPositionY} onChange={(event) => onObjectPositionChange('y', Number(event.target.value))} /></label>
      <button className="btn-secondary" type="button" onClick={() => { onObjectPositionChange('x', 50); onObjectPositionChange('y', 50) }}><RotateCcw size={16} />Căn giữa</button>
    </div>}
    <label><span className="label">Alt ảnh {title}</span><input className="input" value={alt} onChange={(event) => onAltChange(event.target.value)} /></label>
    <div className="flex flex-wrap gap-3"><label className="btn-secondary cursor-pointer"><ImagePlus size={18} />{uploading ? 'Đang tải...' : `Chọn và cắt ảnh ${title}`}<input className="hidden" aria-label={`Chọn ảnh ${title}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setSelectionError('Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB.'); return } setSelectionError(''); setSelectedFile(file) }} /></label>{path && <button className="btn-secondary text-red-700" type="button" disabled={uploading} onClick={onRemove}><Trash2 size={17} />Dùng ảnh mặc định</button>}</div>
    {selectionError && <p className="text-sm font-semibold text-red-700">{selectionError}</p>}
    {selectedFile && <AdminImageCropDialog file={selectedFile} title={title} mediaKey={mediaKey} onCancel={() => setSelectedFile(null)} onConfirm={(file) => { setSelectedFile(null); onUpload(file) }} />}
  </div>
}
