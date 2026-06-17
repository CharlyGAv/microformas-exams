import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { MapPin, User, CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const COBERTURAS = [
  'NORTE', 'NORESTE', 'NOROESTE', 'BAJIO',
  'METRO SUCURSALES', 'METRO EDIFICIOS',
  'OCCIDENTE', 'SUR', 'CENTRO', 'PENINSULAR',
];

const GERENTES = [
  'CARLOS RAUL GARCIA AVILEZ',
  'RAMSES JESUS JACOBO MORALES JUAREZ',
  'CESAR GIL NOLASCO',
  'EMILIO MENDOZA HERNANDEZ',
];

export const CompleteProfile = () => {
  const { user, login } = useAuth();
  const [cobertura, setCobertura] = useState('');
  const [gerente, setGerente] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobertura || !gerente) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      await userApi.completeProfile({ cobertura, gerente });
      // Refresca el token para que el user tenga profile_completed=true
      const token = localStorage.getItem('token');
      if (token) await login(token);
      toast.success('¡Perfil completado!');
    } catch {
      toast.error('Error al guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-brand-950 to-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <img src="/mf-logo.webp" alt="Microformas" className="h-8 object-contain brightness-0 invert" />
            </div>
            <h2 className="text-xl font-bold">¡Bienvenido, {user?.name?.split(' ')[0]}!</h2>
            <p className="text-brand-100 text-sm mt-1">
              Completa tu perfil para continuar. Solo se pedirá una vez.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Cobertura */}
            <div>
              <label className="label flex items-center gap-2">
                <MapPin size={15} className="text-brand-500" />
                Cobertura
              </label>
              <select
                value={cobertura}
                onChange={(e) => setCobertura(e.target.value)}
                className="input"
                required
              >
                <option value="">— Selecciona tu cobertura —</option>
                {COBERTURAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Gerente */}
            <div>
              <label className="label flex items-center gap-2">
                <User size={15} className="text-brand-500" />
                Gerente
              </label>
              <select
                value={gerente}
                onChange={(e) => setGerente(e.target.value)}
                className="input"
                required
              >
                <option value="">— Selecciona tu gerente —</option>
                {GERENTES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Resumen selección */}
            {cobertura && gerente && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-sm space-y-1">
                <p className="text-green-700 dark:text-green-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle size={14} /> Confirma tu información
                </p>
                <p className="text-green-700 dark:text-green-400">Cobertura: <strong>{cobertura}</strong></p>
                <p className="text-green-700 dark:text-green-400">Gerente: <strong>{gerente}</strong></p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !cobertura || !gerente}
              className="btn-primary w-full justify-center py-3 text-sm font-semibold"
            >
              {loading
                ? <><Loader size={16} className="animate-spin" /> Guardando...</>
                : <><CheckCircle size={16} /> Guardar y continuar</>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Esta información no podrá modificarse después. Verifica antes de continuar.
        </p>
      </div>
    </div>
  );
};
