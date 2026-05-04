import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('bg-(--color-card) border border-(--color-border) rounded-xl overflow-hidden', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, className, children }) {
  if (children) {
    return (
      <div className={cn('flex items-center justify-between px-6 py-4 border-b border-(--color-border)', className)}>
        {children}
      </div>
    );
  }
  return (
    <div className={cn('flex items-center justify-between px-6 py-4 border-b border-(--color-border)', className)}>
      <h2 className="text-lg font-semibold text-(--color-foreground)">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}
