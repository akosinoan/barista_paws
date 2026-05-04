import { cn } from '../../lib/utils';

export default function RadioGroup({ name, value, onChange, options, className }) {
  return (
    <div className={cn('flex gap-2', className)}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer text-base transition-colors',
              selected
                ? 'border-(--color-primary) bg-(--color-primary)/10 text-(--color-foreground)'
                : 'border-(--color-input) bg-(--color-background) text-(--color-muted-foreground) hover:bg-(--color-muted)',
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="w-4 h-4 accent-(--color-primary) cursor-pointer"
            />
            <span className="font-medium">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
