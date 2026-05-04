import { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

const FIELD_CLASS =
  'w-full px-4 py-3 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) text-base focus:outline-none focus:ring-2 focus:ring-(--color-ring) disabled:opacity-60';

export default function DateField({ value, onChange, min, required, disabled, className }) {
  const ref = useRef(null);

  const openPicker = () => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.focus();
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={ref}
        type="date"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (e.clientX - rect.left > 140) openPicker();
        }}
        required={required}
        disabled={disabled}
        className={cn(FIELD_CLASS, 'pr-14 [&::-webkit-calendar-picker-indicator]:hidden')}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Open calendar"
        disabled={disabled}
        className="absolute inset-y-0 right-0 flex items-center justify-center w-12 rounded-r-lg bg-(--color-primary) text-(--color-primary-foreground) hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
      >
        <Calendar size={20} />
      </button>
    </div>
  );
}
