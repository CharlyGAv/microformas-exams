import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

// GET /api/exams - list exams based on role
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, id: userId } = req.user!;
    let sql: string;
    let params: unknown[];

    if (role === 'admin' || role === 'supervisor') {
      sql = `
        SELECT e.*,
          u.name AS created_by_name,
          COUNT(DISTINCT ea.id) AS total_attempts,
          COUNT(DISTINCT CASE WHEN ea.passed = true THEN ea.id END) AS passed_count,
          ROUND(AVG(ea.score), 2) AS avg_score,
          (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count
        FROM exams e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN exam_attempts ea ON ea.exam_id = e.id AND ea.status != 'in_progress'
        GROUP BY e.id, u.name
        ORDER BY e.created_at DESC
      `;
      params = [];
    } else {
      sql = `
        SELECT e.*,
          (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count,
          (SELECT COUNT(*) FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.user_id = $1) AS attempts_used,
          (SELECT ea.status FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.user_id = $1 ORDER BY ea.created_at DESC LIMIT 1) AS last_status,
          (SELECT ea.score FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.user_id = $1 AND ea.status = 'submitted' ORDER BY ea.score DESC LIMIT 1) AS best_score
        FROM exams e
        WHERE e.is_active = true AND NOW() BETWEEN e.start_datetime AND e.end_datetime
        ORDER BY e.start_datetime ASC
      `;
      params = [userId];
    }

    const result = await query(sql, params);
    res.json({ exams: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener exámenes' });
  }
});

// GET /api/exams/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT e.*, u.name AS created_by_name,
        (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count
       FROM exams e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Examen no encontrado' });
      return;
    }
    res.json({ exam: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Error al obtener el examen' });
  }
});

// POST /api/exams - create
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const {
    title, description, start_datetime, end_datetime,
    duration_minutes, passing_score, max_attempts,
    randomize_questions, randomize_options, show_results_immediately
  } = req.body;

  if (!title || !start_datetime || !end_datetime || !duration_minutes) {
    res.status(400).json({ error: 'Campos requeridos: título, fechas y duración' });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO exams (title, description, start_datetime, end_datetime, duration_minutes,
        passing_score, max_attempts, randomize_questions, randomize_options, show_results_immediately, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [title, description, start_datetime, end_datetime, duration_minutes,
       passing_score ?? 70, max_attempts ?? 1, randomize_questions ?? false,
       randomize_options ?? false, show_results_immediately ?? true, req.user!.id]
    );
    res.status(201).json({ exam: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el examen' });
  }
});

// PUT /api/exams/:id
router.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const {
    title, description, start_datetime, end_datetime,
    duration_minutes, passing_score, max_attempts,
    randomize_questions, randomize_options, show_results_immediately, is_active
  } = req.body;

  try {
    const result = await query(
      `UPDATE exams SET title=$1, description=$2, start_datetime=$3, end_datetime=$4,
        duration_minutes=$5, passing_score=$6, max_attempts=$7, randomize_questions=$8,
        randomize_options=$9, show_results_immediately=$10, is_active=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [title, description, start_datetime, end_datetime, duration_minutes,
       passing_score, max_attempts, randomize_questions, randomize_options,
       show_results_immediately, is_active, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Examen no encontrado' });
      return;
    }
    res.json({ exam: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Error al actualizar el examen' });
  }
});

// DELETE /api/exams/:id
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM exams WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Examen no encontrado' });
      return;
    }
    res.json({ message: 'Examen eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar el examen' });
  }
});

export default router;
