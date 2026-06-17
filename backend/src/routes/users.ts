import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateJWT);

// GET /api/users
router.get('/', requireRole('admin', 'supervisor'), async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.area, u.avatar_url, u.is_active, u.created_at,
        COUNT(DISTINCT ea.id) AS total_attempts,
        ROUND(AVG(ea.score), 2) AS avg_score,
        COUNT(DISTINCT CASE WHEN ea.passed = true THEN ea.id END) AS passed_count
       FROM users u
       LEFT JOIN exam_attempts ea ON ea.user_id = u.id AND ea.status = 'submitted'
       GROUP BY u.id ORDER BY u.name`
    );
    res.json({ users: result.rows });
  } catch {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// GET /api/users/:id
router.get('/:id', requireRole('admin', 'supervisor'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.area, u.avatar_url, u.is_active, u.created_at
       FROM users u WHERE u.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireRole('admin', 'supervisor'), async (req: Request, res: Response) => {
  const { name, area, is_active } = req.body;
  // Solo el SuperAdministrador puede cambiar el rol
  const isSuperAdmin = req.user!.role === 'admin';
  const role = isSuperAdmin ? req.body.role : undefined;

  try {
    const result = await query(
      isSuperAdmin
        ? `UPDATE users SET name=$1, role=$2, area=$3, is_active=$4, updated_at=NOW()
           WHERE id=$5 RETURNING id, email, name, role, area, is_active`
        : `UPDATE users SET name=$1, area=$2, is_active=$3, updated_at=NOW()
           WHERE id=$4 RETURNING id, email, name, role, area, is_active`,
      isSuperAdmin
        ? [name, role, area, is_active, req.params.id]
        : [name, area, is_active, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// POST /api/users/complete-profile  (primer login)
router.post('/complete-profile', async (req: Request, res: Response) => {
  const { cobertura, gerente } = req.body;

  const coberturas = ['NORTE','NORESTE','NOROESTE','BAJIO','METRO SUCURSALES','METRO EDIFICIOS','OCCIDENTE','SUR','CENTRO','PENINSULAR'];
  const gerentes  = ['CARLOS RAUL GARCIA AVILEZ','RAMSES JESUS JACOBO MORALES JUAREZ','CESAR GIL NOLASCO','EMILIO MENDOZA HERNANDEZ'];

  if (!cobertura || !gerente) {
    res.status(400).json({ error: 'Cobertura y Gerente son requeridos' });
    return;
  }
  if (!coberturas.includes(cobertura)) {
    res.status(400).json({ error: 'Cobertura no válida' });
    return;
  }
  if (!gerentes.includes(gerente)) {
    res.status(400).json({ error: 'Gerente no válido' });
    return;
  }

  try {
    const result = await query(
      `UPDATE users SET cobertura=$1, gerente=$2, profile_completed=true, updated_at=NOW()
       WHERE id=$3 RETURNING id, email, name, role, cobertura, gerente, profile_completed`,
      [cobertura, gerente, req.user!.id]
    );
    res.json({ user: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Error al guardar perfil' });
  }
});

export default router;
