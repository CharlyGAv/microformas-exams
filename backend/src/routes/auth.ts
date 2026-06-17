import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import passport from '../config/passport';
import { generateToken, authenticateJWT } from '../middleware/auth';
import { AuthUser } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// ── Login con usuario y contraseña ──────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    return;
  }

  const domain = email.split('@')[1];
  if (domain !== (process.env.ALLOWED_DOMAIN || 'microformas.com.mx')) {
    res.status(403).json({ error: `Solo se permiten cuentas @${process.env.ALLOWED_DOMAIN}` });
    return;
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Tu cuenta ha sido desactivada' });
      return;
    }

    if (!user.password_hash) {
      res.status(401).json({ error: 'Esta cuenta usa inicio de sesión con Google' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      return;
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url, area: user.area } });
  } catch {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// ── Registro ─────────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' });
    return;
  }

  const domain = email.split('@')[1];
  if (domain !== (process.env.ALLOWED_DOMAIN || 'microformas.com.mx')) {
    res.status(403).json({ error: `Solo se permiten cuentas @${process.env.ALLOWED_DOMAIN}` });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    return;
  }

  try {
    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows[0]) {
      res.status(409).json({ error: 'Este correo ya está registrado' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, name, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'user', true) RETURNING *`,
      [email, name, password_hash]
    );

    const user = result.rows[0];
    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// ── Google OAuth (opcional) ──────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failed' }),
  (req: Request, res: Response) => {
    const user = req.user as AuthUser;
    const token = generateToken(user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

router.get('/failed', (_req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/unauthorized`);
});

router.get('/me', authenticateJWT, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Sesión cerrada exitosamente' });
});

export default router;
