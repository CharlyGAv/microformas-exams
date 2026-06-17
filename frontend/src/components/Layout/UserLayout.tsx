import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext';
import { clsx } from 'clsx';

const UserContent = () => {
  const { collapsed } = useSidebar();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className={clsx('flex flex-col min-h-screen transition-all duration-300', collapsed ? 'ml-16' : 'ml-64')}>
        <Topbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const UserLayout = () => (
  <SidebarProvider>
    <UserContent />
  </SidebarProvider>
);
