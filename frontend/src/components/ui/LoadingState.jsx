import { cn } from '../../lib/utils';

export default function LoadingState({ text = 'Loading...', className }) {
  return (
    <div className={cn('flex justify-center items-center min-h-[40vh]', className)}>
      <p className="text-(--color-muted-foreground)">{text}</p>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-xl bg-(--color-muted)', className)} />;
}
