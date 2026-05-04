import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';

export default function Logo({ to = '/', onClick, size = 26 }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2 text-(--color-foreground) no-underline">
      <PawPrint size={size} className="text-(--color-primary) shrink-0" />
      <span className="font-bold text-lg text-(--color-foreground) truncate">BaristaPaws</span>
    </Link>
  );
}
