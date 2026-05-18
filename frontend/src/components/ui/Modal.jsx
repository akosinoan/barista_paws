import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  labelledBy,
  children,
  closeOnBackdrop = true,
  showClose = true,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      const root = dialogRef.current;
      if (!root) return;
      // Skip the auto-rendered close button so initial focus lands on actual content.
      const focusable = root.querySelector(
        'button:not([data-modal-close]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    });
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative w-full sm:max-w-2xl bg-(--color-background) text-(--color-foreground) rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        {showClose && (
          <button
            type="button"
            data-modal-close
            onClick={() => onClose?.()}
            aria-label="Close"
            className="absolute top-3 right-3 z-10 p-2 rounded-lg text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground) transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
