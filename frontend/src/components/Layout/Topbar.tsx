import { Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../UI/Badge';

interface TopbarProps {
  title?: string;
}

const roleLabel = { admin: 'Administrador', supervisor: 'Supervisor', user: 'Colaborador' };
const roleVariant = { admin: 'red', supervisor: 'blue', user: 'green' } as const;

export const Topbar = ({ title }: TopbarProps) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        {title && <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-semibold">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">{user.name}</p>
              <div className="mt-0.5">
                <Badge variant={roleVariant[user.role]}>{roleLabel[user.role]}</Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
