import { cn } from '../../lib/utils';

const variantClasses = {
  error: 'bg-(--color-destructive)/10 text-(--color-destructive)',
  success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

export default function Alert({ variant = 'error', className, children }) {
  if (!children) return null;
  return (
    <div className={cn('p-3 rounded-lg text-sm', variantClasses[variant], className)}>
      {children}
    </div>
  );
}
