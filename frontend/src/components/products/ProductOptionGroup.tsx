import type { ProductVariant, VariantOption, VariantOptionValue } from '../../types'
import { optionAvailability, type SelectedOptions } from '../../features/products/variantSelection'

interface Props {
  option: VariantOption
  variants: ProductVariant[]
  selection: SelectedOptions
  error?: boolean
  onSelect: (attributeId: number, valueId: number) => void
}

function OptionImage({ value }: { value: VariantOptionValue }) {
  if (value.image_path) return <img src={value.image_path} alt={value.image_alt || value.display_value} />
  if (value.color_code) return <span className='product-option-color' style={{ backgroundColor: value.color_code }} />
  return <span className='product-option-fallback'>{value.option_code || value.display_value.slice(0, 2)}</span>
}

export function ProductOptionGroup({ option, variants, selection, error, onSelect }: Props) {
  return <fieldset className={'product-option-group' + (error ? ' has-error' : '')} data-option-group={option.id}>
    <legend>{option.name}</legend>
    <div className={'product-option-list style-' + option.display_style}>{option.values.map((value) => {
      const availability = optionAvailability(variants, selection, option.id, value.id)
      const selected = selection[option.id] === value.id
      const disabled = !availability.exists || !availability.inStock
      return <div className='product-option-wrap' key={value.id}>
        <button type='button' className='product-option' aria-pressed={selected} aria-label={value.display_value} disabled={disabled} title={value.display_value + (!availability.exists ? ' - Không có tổ hợp' : !availability.inStock ? ' - Hết hàng' : '')} onClick={() => onSelect(option.id, value.id)}>
          {option.display_style !== 'buttons' && <OptionImage value={value} />}
          {option.display_style !== 'image_swatches' && <span><strong>{value.display_value}</strong>{value.option_code && <small>({value.option_code})</small>}</span>}
        </button>
        {option.display_style === 'image_cards' && value.description && <details><summary>Chi tiết</summary><p>{value.description}</p></details>}
      </div>
    })}</div>
    {error && <p className='product-option-error'>Vui lòng chọn {option.name}</p>}
  </fieldset>
}
