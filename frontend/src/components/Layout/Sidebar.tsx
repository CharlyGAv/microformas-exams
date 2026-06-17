import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Monitor, BarChart3,
  Shield, ChevronRight, BookOpen, LogOut, ChevronLeft
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard',       href: '/admin',         icon: LayoutDashboard },
  { label: 'Exámenes',        href: '/admin/exams',   icon: FileText },
  { label: 'Usuarios',        href: '/admin/users',   icon: Users },
  { label: 'Monitor en Vivo', href: '/admin/monitor', icon: Monitor },
  { label: 'Reportes',        href: '/admin/reports', icon: BarChart3 },
  { label: 'Auditoría',       href: '/admin/audit',   icon: Shield },
];

const userNavItems: NavItem[] = [
  { label: 'Mis Exámenes', href: '/home',    icon: BookOpen },
  { label: 'Mi Historial', href: '/history', icon: BarChart3 },
];

export const Sidebar = () => {
  const { user, isAdmin, isSupervisor, logout } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const navItems = (isAdmin || isSupervisor) ? adminNavItems : userNavItems;

  return (
    <>
      {/* Sidebar */}
      <aside className={clsx(
        'fixed left-0 top-0 h-screen bg-gray-950 flex flex-col z-40 border-r border-gray-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-center">
          <img
            src="/mf-logo.webp"
            alt="Microformas"
            className={clsx('object-contain transition-all duration-300', collapsed ? 'h-8 w-8' : 'h-24 w-full')}
          />
        </div>

        {/* User Info */}
        <div className={clsx('border-b border-gray-800', collapsed ? 'p-2' : 'p-4')}>
          <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-600 flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                <p className="text-gray-400 text-xs truncate">{user?.email}</p>
                {user?.area && (
                  <p className="text-brand-400 text-xs font-medium truncate mt-0.5">{user.area}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/admin' || item.href === '/home'}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    collapsed && 'justify-center',
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={clsx('flex-shrink-0', isActive ? 'text-white' : 'text-gray-500')} />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && isActive && <ChevronRight size={14} />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-gray-800 space-y-0.5">
          {(isAdmin || isSupervisor) && (
            <NavLink
              to="/home"
              title={collapsed ? 'Vista Usuario' : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all',
                collapsed && 'justify-center'
              )}
            >
              <BookOpen size={18} className="text-gray-500 flex-shrink-0" />
              {!collapsed && <span>Vista Usuario</span>}
            </NavLink>
          )}
          <button
            onClick={logout}
            title={collapsed ? 'Cerrar Sesión' : undefined}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-all',
              collapsed && 'justify-center'
            )}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Pestaña para colapsar / expandir - arriba */}
      <button
        onClick={toggle}
        className={clsx(
          'fixed top-4 z-50 w-5 h-12 bg-gray-800 hover:bg-brand-600 border border-gray-700 rounded-r-lg flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 shadow-lg',
          collapsed ? 'left-16' : 'left-64'
        )}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        <ChevronLeft size={14} className={clsx('transition-transform duration-300', collapsed && 'rotate-180')} />
      </button>
    </>
  );
};
