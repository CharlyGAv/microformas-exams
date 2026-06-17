import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext';
import { clsx } from 'clsx';

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard Ejecutivo',
  '/admin/exams': 'Gestión de Exámenes',
  '/admin/users': 'Gestión de Usuarios',
  '/admin/monitor': 'Monitor en Tiempo Real',
  '/admin/reports': 'Reportes y Análisis',
  '/admin/audit': 'Registro de Auditoría',
};

const AdminContent = () => {
  const { pathname } = useLocation();
  const { collapsed } = useSidebar();
  const title = pageTitles[pathname] || 'Panel Administrativo';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className={clsx('flex flex-col min-h-screen transition-all duration-300', collapsed ? 'ml-16' : 'ml-64')}>
        <Topbar title={title} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const AdminLayout = () => (
  <SidebarProvider>
    <AdminContent />
  </SidebarProvider>
);
