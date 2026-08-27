import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductGallery } from './ProductGallery'

const images = [
  { id: 2, image_path: '/second.png', alt_text: 'Ảnh thứ hai', is_primary: false, sort_order: 1 },
  { id: 1, image_path: '/primary.png', alt_text: 'Ảnh chính', is_primary: true, sort_order: 0 },
]

describe('ProductGallery', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  it('phát video trước rồi chuyển sang ảnh chính khi kết thúc', () => {
    render(<ProductGallery images={images} productName='Tóc nam' variantId={null} videoPath='/product.mp4' />)
    const video = screen.getByLabelText('Video sản phẩm Tóc nam') as HTMLVideoElement
    expect(video.autoplay).toBe(true)
    expect(video.muted).toBe(true)
    expect(video.playsInline).toBe(true)

    fireEvent.ended(video)
    expect(screen.getByAltText('Ảnh chính')).toHaveAttribute('src', '/primary.png')
    fireEvent.click(screen.getByRole('button', { name: 'Xem ảnh 2' }))
    expect(screen.getByAltText('Ảnh thứ hai')).toHaveAttribute('src', '/second.png')
    fireEvent.click(screen.getByRole('button', { name: 'Xem video sản phẩm' }))
    expect(screen.getByLabelText('Video sản phẩm Tóc nam')).toBeInTheDocument()
  })

  it('hiển thị ảnh chính ngay khi không có video', () => {
    render(<ProductGallery images={images} productName='Tóc nam' variantId={null} />)
    expect(screen.getByAltText('Ảnh chính')).toHaveAttribute('src', '/primary.png')
    expect(screen.queryByRole('button', { name: 'Xem video sản phẩm' })).not.toBeInTheDocument()
  })
})
