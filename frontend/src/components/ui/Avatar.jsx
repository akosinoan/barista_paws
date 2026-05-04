import { cn } from '../../lib/utils';

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-20 h-20',
};

const fallbackSizes = {
  sm: 'text-lg',
  md: 'text-3xl',
};

export default function Avatar({ src, alt, size = 'md', fallback = '👤', className }) {
  return (
    <div className={cn('rounded-full overflow-hidden bg-(--color-muted) flex items-center justify-center shrink-0', sizeClasses[size], className)}>
      {src
        ? <img src={src} alt={alt || 'avatar'} className="w-full h-full object-cover" />
        : <span className={cn('text-(--color-muted-foreground)', fallbackSizes[size])}>{fallback}</span>
      }
    </div>
  );
}
