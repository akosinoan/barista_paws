import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const baseClass =
  'w-full px-3 py-2 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-ring) text-sm';

const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(baseClass, className)} {...props} />;
});

export function Textarea({ className, ...props }) {
  return <textarea className={cn(baseClass, className)} {...props} />;
}

export default Input;
