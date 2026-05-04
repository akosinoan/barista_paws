import { cn } from '../../lib/utils';

export default function EmptyState({ message, icon, className }) {
  return (
    <div className={cn('text-(--color-muted-foreground) text-center py-12', className)}>
      {icon && <div className="flex justify-center mb-3">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  );
}
