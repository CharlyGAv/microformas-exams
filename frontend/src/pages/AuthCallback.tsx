import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AuthCallback = () => {
  const [params] = useSearchParams();
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      navigate('/unauthorized', { replace: true });
      return;
    }
    login(token).then(() => {
      // navigation happens inside login via re-render
    }).catch(() => {
      navigate('/unauthorized', { replace: true });
    });
  }, [params, login, navigate]);

  useEffect(() => {
    if (user) navigate(user.role === 'user' ? '/home' : '/admin', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Autenticando...</p>
      </div>
    </div>
  );
};
