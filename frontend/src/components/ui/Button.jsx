import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const base =
  'inline-flex items-center justify-center gap-1.5 font-medium cursor-pointer disabled:opacity-50 disabled:pointer-events-none transition-all';

const variants = {
  primary: 'bg-(--color-primary) text-(--color-primary-foreground) hover:opacity-90',
  outline: 'border border-(--color-border) text-(--color-foreground) hover:bg-(--color-muted)',
  ghost: 'text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground)',
  destructive: 'text-(--color-destructive) hover:bg-(--color-muted)',
  link: 'text-(--color-primary) hover:underline p-0',
};

const sizes = {
  xs: 'px-2 py-0.5 text-xs rounded-lg',
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-8 py-3 text-lg rounded-xl',
  icon: 'p-2 rounded-lg',
  full: 'w-full py-2.5 text-sm rounded-lg',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', as: Tag = 'button', className, children, ...props },
  ref,
) {
  return (
    <Tag ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Tag>
  );
});

export default Button;
