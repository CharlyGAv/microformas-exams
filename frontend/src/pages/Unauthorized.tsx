import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';

export const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-800">
          <ShieldX size={40} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Acceso Denegado</h1>
        <p className="text-gray-400 text-lg mb-2">Solo se permiten cuentas institucionales</p>
        <p className="text-gray-600 text-sm mb-8 font-mono bg-gray-900 px-4 py-2 rounded-lg inline-block">
          @microformas.com.mx
        </p>
        <div className="space-y-3">
          <p className="text-gray-500 text-sm">
            Si crees que esto es un error, contacta al área de TI.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary mx-auto"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};
