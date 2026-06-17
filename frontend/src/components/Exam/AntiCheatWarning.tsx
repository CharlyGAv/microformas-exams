import { AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

interface AntiCheatWarningProps {
  message: string;
  severity: 'warning' | 'critical';
  onDismiss: () => void;
}

export const AntiCheatWarning = ({ message, severity, onDismiss }: AntiCheatWarningProps) => (
  <div className={clsx(
    'fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-full mx-4 rounded-xl shadow-2xl border p-4 animate-slide-up',
    severity === 'critical'
      ? 'bg-red-600 border-red-700 text-white'
      : 'bg-yellow-500 border-yellow-600 text-gray-900'
  )}>
    <div className="flex items-start gap-3">
      <AlertTriangle size={22} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-bold text-sm uppercase tracking-wide mb-1">
          {severity === 'critical' ? '🚨 Alerta Crítica' : '⚠️ Advertencia'}
        </p>
        <p className="text-sm leading-snug">{message}</p>
      </div>
      <button onClick={onDismiss} className="flex-shrink-0 p-1 hover:opacity-70 transition-opacity">
        <X size={18} />
      </button>
    </div>
  </div>
);
