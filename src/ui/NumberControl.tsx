import { useId } from 'react'
import {
  NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement,
  NumberFieldInput, NumberFieldScrubArea,
} from '@/components/reui/number-field'

/** Shared ReUI composition for overlay overrides and preview host inputs. */
export function NumberControl({ label, value, min, max, step = 1, disabled = false, onChange }: {
  label: string; value: number; min: number; max?: number; step?: number
  disabled?: boolean; onChange: (value: number) => void
}) {
  const id = useId()
  return <NumberField id={id} size="sm" value={value} min={min} max={max} step={step} disabled={disabled}
    locale="en-US" format={{ useGrouping: false, maximumFractionDigits: 20 }}
    onValueChange={next => { if (next !== null && Number.isFinite(next)) onChange(next) }}>
    <NumberFieldScrubArea label={label} />
    <NumberFieldGroup>
      <NumberFieldDecrement aria-label={`Decrease ${label}`} />
      <NumberFieldInput />
      <NumberFieldIncrement aria-label={`Increase ${label}`} />
    </NumberFieldGroup>
  </NumberField>
}
