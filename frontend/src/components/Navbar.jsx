import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LayoutDashboard, User, CalendarClock, PawPrint } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import LogOutButton from './LogOutButton';
import { useAuth } from '../lib/AuthContext';

export default function Navbar() {
  const { user, isLoggedIn, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  if (isAdmin) {
    return (
      <nav className="border-b border-(--color-border) bg-(--color-card)">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo />
            <div className="flex items-center gap-2">
              <Link
                to="/admin/users"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm no-underline text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
              >
                <LayoutDashboard size={16} /> Dashboard
              </Link>
              <ThemeToggle />
              <LogOutButton />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-(--color-border) bg-(--color-card)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Logo onClick={close} />

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="px-3 py-1.5 rounded-lg text-sm no-underline text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
                >
                  Home
                </Link>
                <Link
                  to="/pets"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm no-underline text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
                >
                  <PawPrint size={16} /> Pets
                </Link>
                <Link
                  to="/appointments"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm no-underline text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
                >
                  <CalendarClock size={16} /> Appointments
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm no-underline text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
                >
                  <User size={16} /> Profile
                </Link>
                <span className="text-sm text-(--color-muted-foreground) px-1">{user.first_name}</span>
                <LogOutButton />
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg border border-(--color-border) text-(--color-foreground) no-underline text-sm font-medium hover:bg-(--color-muted) transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-(--color-primary) text-(--color-primary-foreground) no-underline text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Register
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-lg border border-(--color-border) text-(--color-foreground) hover:bg-(--color-muted) transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-(--color-border) bg-(--color-card) px-4 py-3 space-y-1">
          {isLoggedIn ? (
            <>
              <Link
                to="/dashboard"
                onClick={close}
                className="block px-3 py-2.5 rounded-lg text-sm no-underline text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
              >
                Home
              </Link>
              <Link
                to="/pets"
                onClick={close}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm no-underline text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
              >
                <PawPrint size={16} /> Pets
              </Link>
              <Link
                to="/appointments"
                onClick={close}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm no-underline text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
              >
                <CalendarClock size={16} /> Appointments
              </Link>
              <Link
                to="/profile"
                onClick={close}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm no-underline text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
              >
                <User size={16} /> Profile
              </Link>
              <div className="pt-1 border-t border-(--color-border)">
                <LogOutButton variant="destructive" onAfterLogout={close} />
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={close}
                className="block px-3 py-2.5 rounded-lg text-sm no-underline text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={close}
                className="block px-3 py-2.5 rounded-lg text-sm no-underline bg-(--color-primary) text-(--color-primary-foreground) hover:opacity-90 transition-opacity text-center"
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
