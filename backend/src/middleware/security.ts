import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// ─── Rate limiters ────────────────────────────────────────────────────────────

/** Límite general para toda la API: 200 req / 15 min por IP */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde.' },
  skip: (req) => req.path === '/health',
});

/** Límite estricto para rutas de autenticación: 20 req / 15 min por IP */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos.' },
});

// ─── Input sanitization ───────────────────────────────────────────────────────

// Patrones XSS que detectan HTML/JS malicioso real (no texto normal de examen)
// Se crean con función para evitar el bug de lastIndex con flag /g en .test()
function makeXssPatterns() {
  return [
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /<[^>]+on\w+\s*=\s*["'][^"']*["']/i,  // event handlers inline
    /javascript\s*:/i,
    /data\s*:\s*text\/html/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];
}

function containsXss(value: string): boolean {
  return makeXssPatterns().some((p) => p.test(value));
}

function sanitizeString(s: string): string {
  // Eliminar caracteres de control (excepto \n, \r, \t que son válidos en texto)
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value !== null && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      clean[k] = sanitizeValue(v);
    }
    return clean;
  }
  return value;
}

function detectXssInObject(obj: unknown): boolean {
  if (typeof obj === 'string') return containsXss(obj);
  if (Array.isArray(obj)) return obj.some(detectXssInObject);
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).some(detectXssInObject);
  }
  return false;
}

/**
 * Middleware de sanitización:
 * - Rechaza peticiones con patrones XSS (HTML/JS malicioso real)
 * - Elimina caracteres de control de todos los strings
 * No bloquea palabras comunes como "select"/"delete" que son texto legítimo
 * en respuestas de examen. La protección contra SQL injection ya está
 * garantizada por las consultas parametrizadas en toda la aplicación.
 */
export const inputSanitizer = (req: Request, res: Response, next: NextFunction): void => {
  const targets = [req.body, req.query];
  for (const data of targets) {
    if (detectXssInObject(data)) {
      res.status(400).json({ error: 'Contenido no permitido en la solicitud.' });
      return;
    }
  }

  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query) as typeof req.query;

  next();
};

// ─── Security headers extra (complemento a Helmet) ───────────────────────────

export const extraSecurityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};
