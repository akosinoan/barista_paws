import { cn } from '../../lib/utils';

export default function Label({ children, className, ...props }) {
  return (
    <label className={cn('block text-sm font-medium mb-1 text-(--color-muted-foreground)', className)} {...props}>
      {children}
    </label>
  );
}
