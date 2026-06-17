import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield } from 'lucide-react';

export const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(user.role === 'user' ? '/home' : '/admin', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-800">

          {/* Logo dentro del cuadro */}
          <div className="text-center mb-6">
            <img
              src="/microformas-logo.png"
              alt="Microformas"
              className="h-5 mx-auto mb-4 object-contain"
            />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Iniciar sesión</h2>
            <p className="text-gray-500 text-sm mt-1">Usa tu cuenta institucional de Google</p>
          </div>

          {/* Botón Google */}
          <button
            onClick={() => { window.location.href = '/api/auth/google'; }}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-semibold text-sm hover:border-brand-500 hover:shadow-md transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" className="flex-shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google Workspace
          </button>

          {/* Nota de seguridad */}
          <div className="mt-5 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-2">
            <Shield size={14} className="text-blue-500 flex-shrink-0" />
            <p className="text-blue-700 dark:text-blue-400 text-xs">
              Solo cuentas <span className="font-bold">@microformas.com.mx</span>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-5">
          © 2026 Microformas · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
};
