import { Link, useLocation } from "react-router-dom";
import {
  Users,
  CalendarClock,
  FileSignature,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";
import LogOutButton from "./LogOutButton";
import { useAuth } from "../lib/AuthContext";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { to: "/admin/users", icon: Users, label: "All Customers" },
  { to: "/admin/appointments", icon: CalendarClock, label: "Appointments" },
  { to: "/admin/waivers", icon: FileSignature, label: "Waivers" },
];

function NavItem({ to, icon: Icon, label, collapsed, onClick }) {
  const { pathname } = useLocation();
  const active = pathname.startsWith(to);

  return (
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline",
        active
          ? "bg-(--color-primary) text-(--color-primary-foreground)"
          : "text-(--color-foreground) hover:bg-(--color-muted)",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

/* ── Desktop sidebar ── */
export function DesktopSidebar({ collapsed, onToggle }) {
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-r border-(--color-sidebar-border) bg-(--color-sidebar) transition-all duration-200",
        collapsed ? "w-16" : "w-56",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-(--color-sidebar-border) px-3 shrink-0",
          collapsed ? "justify-center" : "gap-2",
        )}
      >
        {collapsed
          ? <Logo to="/admin/users" size={26} />
          : <Logo to="/admin/users" />
        }
      </div>

      {/* User + actions */}
      <div
        className={cn(
          "p-2 border-b border-(--color-sidebar-border) space-y-1",
          collapsed && "flex flex-col items-center",
        )}
      >
        {!collapsed && (
          <p className="px-3 py-1 text-xs text-(--color-muted-foreground) truncate">
            {user?.first_name} {user?.last_name}
          </p>
        )}
        <div
          className={cn(
            "flex items-center",
            collapsed ? "flex-col gap-1" : "gap-1 px-1",
          )}
        >
          <ThemeToggle />
          <LogOutButton variant="ghost" showLabel={!collapsed} />
          {!collapsed && (
            <button
              onClick={onToggle}
              className="ml-auto p-2 rounded-lg text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={onToggle}
            className="p-2 rounded-lg text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors cursor-pointer"
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  );
}

/* ── Mobile drawer ── */
export function MobileDrawer({ open, onClose }) {
  const { user } = useAuth();

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-(--color-sidebar) border-r border-(--color-sidebar-border) md:hidden">
        {/* Header */}
        <div className="flex items-center justify-between h-16 border-b border-(--color-sidebar-border) px-4">
          <Logo to="/admin/users" size={24} />
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* User + actions */}
        <div className="p-3 border-b border-(--color-sidebar-border) space-y-1">
          <p className="px-3 text-xs text-(--color-muted-foreground) truncate">
            {user?.first_name} {user?.last_name}
          </p>
          <div className="flex items-center gap-1 px-1">
            <ThemeToggle />
            <LogOutButton variant="ghost" onAfterLogout={onClose} />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              collapsed={false}
              onClick={onClose}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}

/* ── Mobile top bar ── */
export function MobileTopBar({ onOpenDrawer }) {
  return (
    <header className="md:hidden flex items-center h-14 px-4 border-b border-(--color-sidebar-border) bg-(--color-sidebar) gap-3">
      <button
        onClick={onOpenDrawer}
        className="p-2 rounded-lg text-(--color-foreground) hover:bg-(--color-muted) transition-colors cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>
      <Logo to="/admin/users" size={22} />
    </header>
  );
}
