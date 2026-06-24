import { useEffect, useRef, useCallback } from 'react';
import { attemptApi } from '../services/api';
import { getSocket } from '../services/socket';

interface AntiCheatOptions {
  attemptId: string;
  onWarning: (message: string, severity: 'warning' | 'critical') => void;
  onAutoSubmit: () => void;
  enabled: boolean;
}

export const useAntiCheat = ({ attemptId, onWarning, onAutoSubmit, enabled }: AntiCheatOptions) => {
  const tabSwitchCount = useRef(0);
  const fullscreenExitCount = useRef(0);

  const logEvent = useCallback(async (eventType: string, data: Record<string, unknown> = {}, severity: 'info' | 'warning' | 'critical' = 'info') => {
    if (!enabled) return;
    try {
      await attemptApi.logAudit(attemptId, { event_type: eventType, event_data: data, severity });
      const socket = getSocket();
      socket.emit('anti_cheat:event', { attemptId, eventType, data });
    } catch {}
  }, [attemptId, enabled]);

  // Tab/window visibility change
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCount.current++;
        const count = tabSwitchCount.current;
        logEvent('TAB_SWITCH', { count }, 'warning');

        if (count >= 3) {
          onWarning('Has excedido el límite de cambios de pestaña. El examen será enviado automáticamente.', 'critical');
          onAutoSubmit();
        } else if (count === 2) {
          onWarning('SEGUNDA ADVERTENCIA: Has salido de la ventana 2 veces. A la próxima salida el examen se cerrará automáticamente.', 'critical');
        } else {
          onWarning('ADVERTENCIA: Se detectó que abandonaste la ventana del examen. Tienes 2 advertencias más antes del cierre automático.', 'warning');
        }
      }
    };

    const handleBlur = () => {
      logEvent('WINDOW_BLUR', {}, 'info');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, logEvent, onWarning, onAutoSubmit]);

  // Copy/paste blocking
  useEffect(() => {
    if (!enabled) return;

    const blockAndLog = (e: Event, type: string) => {
      e.preventDefault();
      logEvent('COPY_PASTE', { type }, 'warning');
      onWarning('Copiar y pegar está deshabilitado durante el examen.', 'warning');
    };

    const handleCopy = (e: ClipboardEvent) => blockAndLog(e, 'copy');
    const handlePaste = (e: ClipboardEvent) => blockAndLog(e, 'paste');
    const handleCut = (e: ClipboardEvent) => blockAndLog(e, 'cut');
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logEvent('CONTEXT_MENU', {}, 'info');
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        logEvent('KEYBOARD_SHORTCUT', { key: e.key }, 'info');
      }
      if (e.key === 'PrintScreen') {
        logEvent('SCREENSHOT_ATTEMPT', {}, 'warning');
        onWarning('Intento de captura de pantalla detectado y registrado.', 'warning');
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, logEvent, onWarning]);

  // Fullscreen management — omitido en móvil donde la API no está soportada
  const fullscreenSupported =
    typeof document !== 'undefined' &&
    (!!document.documentElement.requestFullscreen ||
      !!(document.documentElement as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen);

  const requestFullscreen = useCallback(() => {
    if (!fullscreenSupported) return;
    const el = document.documentElement as unknown as {
      requestFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => void;
    };
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }, [fullscreenSupported]);

  useEffect(() => {
    if (!enabled || !fullscreenSupported) return;

    const handleFullscreenChange = () => {
      const isFullscreen =
        !!document.fullscreenElement ||
        !!(document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;

      if (!isFullscreen) {
        fullscreenExitCount.current++;
        logEvent('FULLSCREEN_EXIT', { count: fullscreenExitCount.current }, 'warning');
        onWarning('El modo pantalla completa es obligatorio. Por favor vuelve a pantalla completa.', 'warning');
        setTimeout(requestFullscreen, 1500);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    requestFullscreen();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [enabled, fullscreenSupported, logEvent, onWarning, requestFullscreen]);

  return { logEvent, requestFullscreen };
};
