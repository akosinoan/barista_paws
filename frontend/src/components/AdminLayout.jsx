import { useState } from 'react';
import { DesktopSidebar, MobileDrawer, MobileTopBar } from './Sidebar';

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-(--color-background) text-(--color-foreground)">
      {/* Desktop sidebar */}
      <DesktopSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        <MobileTopBar onOpenDrawer={() => setDrawerOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
