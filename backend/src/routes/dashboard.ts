import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateJWT, requireRole('admin', 'supervisor'));

// Genera AND ea.exam_id = '...' si se pasa examId
const examCond = (examId?: string, alias = 'ea') =>
  examId ? `AND ${alias}.exam_id = '${examId}'` : '';

// Genera AND ea.user_id IN (SELECT id FROM users WHERE cobertura=... AND gerente=...)
const userCond = (cobertura?: string, gerente?: string, alias = 'ea') => {
  const parts: string[] = [];
  if (cobertura) parts.push(`cobertura = '${cobertura}'`);
  if (gerente)   parts.push(`gerente = '${gerente}'`);
  return parts.length ? `AND ${alias}.user_id IN (SELECT id FROM users WHERE ${parts.join(' AND ')})` : '';
};

// Filtro directo en tabla users (para el conteo de usuarios)
const userWhere = (cobertura?: string, gerente?: string) => {
  const parts: string[] = [];
  if (cobertura) parts.push(`cobertura = '${cobertura}'`);
  if (gerente)   parts.push(`gerente = '${gerente}'`);
  return parts.length ? `AND ${parts.join(' AND ')}` : '';
};

router.get('/exams-list', async (_req: Request, res: Response) => {
  try {
    const result = await query(`SELECT id, title FROM exams ORDER BY title`);
    res.json({ exams: result.rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  const { exam_id, cobertura, gerente } = req.query as Record<string, string>;
  const ec = examCond(exam_id);
  const uc = userCond(cobertura, gerente);
  const uw = userWhere(cobertura, gerente);

  try {
    const [exams, users, attempts, activeSessions, avgScore, approvalRate] = await Promise.all([
      query(`SELECT
        COUNT(*) FILTER (WHERE is_active = true AND NOW() BETWEEN start_datetime AND end_datetime) AS active,
        COUNT(*) FILTER (WHERE start_datetime > NOW() AND is_active = true) AS scheduled,
        COUNT(*) FILTER (WHERE end_datetime < NOW() OR is_active = false) AS finished,
        COUNT(*) AS total
       FROM exams`),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active=true) AS active FROM users WHERE 1=1 ${uw}`),
      query(`SELECT
        COUNT(*) FILTER (WHERE ea.status = 'in_progress' ${ec} ${uc}) AS in_progress,
        COUNT(*) FILTER (WHERE ea.status IN ('submitted','auto_submitted','timed_out') ${ec} ${uc}) AS submitted,
        COUNT(*) AS total
       FROM exam_attempts ea WHERE 1=1 ${ec} ${uc}`),
      query(`SELECT COUNT(*) AS connected FROM active_sessions s
             WHERE s.last_seen > NOW() - INTERVAL '5 minutes'
             ${userCond(cobertura, gerente, 's')}`),
      query(`SELECT ROUND(AVG(ea.score), 2) AS avg FROM exam_attempts ea WHERE ea.status IN ('submitted','auto_submitted','timed_out') ${ec} ${uc}`),
      query(`SELECT
        ROUND(100.0 * COUNT(*) FILTER (WHERE ea.passed = true) / NULLIF(COUNT(*), 0), 2) AS approval_rate,
        ROUND(100.0 * COUNT(*) FILTER (WHERE ea.passed = false) / NULLIF(COUNT(*), 0), 2) AS fail_rate
       FROM exam_attempts ea WHERE ea.status IN ('submitted','auto_submitted','timed_out') ${ec} ${uc}`),
    ]);

    res.json({
      exams: exams.rows[0],
      users: users.rows[0],
      attempts: attempts.rows[0],
      active_users: activeSessions.rows[0].connected,
      avg_score: avgScore.rows[0].avg || 0,
      approval_rate: approvalRate.rows[0].approval_rate || 0,
      fail_rate: approvalRate.rows[0].fail_rate || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/results-by-exam', async (req: Request, res: Response) => {
  const { exam_id, cobertura, gerente } = req.query as Record<string, string>;
  const ec = examCond(exam_id);
  const uc = userCond(cobertura, gerente);
  try {
    const result = await query(`
      SELECT e.title AS exam,
        ROUND(AVG(ea.score), 2) AS avg_score,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE ea.passed = true) AS passed,
        COUNT(*) FILTER (WHERE ea.passed = false) AS failed
      FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id
      WHERE ea.status IN ('submitted','auto_submitted','timed_out') ${ec} ${uc}
      GROUP BY e.id, e.title ORDER BY e.title
    `);
    res.json({ data: result.rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

router.get('/results-by-area', async (req: Request, res: Response) => {
  const { exam_id, cobertura, gerente } = req.query as Record<string, string>;
  const ec = examCond(exam_id);
  const uc = userCond(cobertura, gerente);
  try {
    const result = await query(`
      SELECT u.area,
        ROUND(AVG(ea.score), 2) AS avg_score,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE ea.passed = true) AS passed
      FROM exam_attempts ea JOIN users u ON ea.user_id = u.id
      WHERE ea.status IN ('submitted','auto_submitted','timed_out') AND u.area IS NOT NULL ${ec} ${uc}
      GROUP BY u.area ORDER BY avg_score DESC
    `);
    res.json({ data: result.rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

router.get('/results-by-month', async (req: Request, res: Response) => {
  const { exam_id, cobertura, gerente } = req.query as Record<string, string>;
  const ec = examCond(exam_id);
  const uc = userCond(cobertura, gerente);
  try {
    const result = await query(`
      SELECT
        TO_CHAR(ea.submitted_at, 'YYYY-MM') AS month,
        TO_CHAR(ea.submitted_at, 'Mon YYYY') AS label,
        COUNT(*) AS total,
        ROUND(AVG(ea.score), 2) AS avg_score,
        COUNT(*) FILTER (WHERE ea.passed = true) AS passed
      FROM exam_attempts ea
      WHERE ea.status IN ('submitted','auto_submitted','timed_out') AND ea.submitted_at > NOW() - INTERVAL '12 months' ${ec} ${uc}
      GROUP BY 1, 2 ORDER BY 1
    `);
    res.json({ data: result.rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

router.get('/top-scores', async (req: Request, res: Response) => {
  const { exam_id, cobertura, gerente } = req.query as Record<string, string>;
  const ec = examCond(exam_id);
  const uc = userCond(cobertura, gerente);
  try {
    const [top, bottom] = await Promise.all([
      query(`
        SELECT u.name, u.area, u.cobertura, u.gerente, ea.score, e.title AS exam
        FROM exam_attempts ea JOIN users u ON ea.user_id = u.id JOIN exams e ON ea.exam_id = e.id
        WHERE ea.status IN ('submitted','auto_submitted','timed_out') ${ec} ${uc} ORDER BY ea.score DESC LIMIT 10
      `),
      query(`
        SELECT u.name, u.area, u.cobertura, u.gerente, ea.score, e.title AS exam
        FROM exam_attempts ea JOIN users u ON ea.user_id = u.id JOIN exams e ON ea.exam_id = e.id
        WHERE ea.status IN ('submitted','auto_submitted','timed_out') ${ec} ${uc} ORDER BY ea.score ASC LIMIT 10
      `),
    ]);
    res.json({ top: top.rows, bottom: bottom.rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

router.get('/avg-time-per-question', async (req: Request, res: Response) => {
  const { exam_id, cobertura, gerente } = req.query as Record<string, string>;
  const ec = examCond(exam_id);
  const uc = userCond(cobertura, gerente);
  try {
    const result = await query(`
      SELECT q.question_text, ROUND(AVG(ua.time_spent_seconds), 2) AS avg_seconds
      FROM user_answers ua
      JOIN questions q ON ua.question_id = q.id
      JOIN exam_attempts ea ON ua.attempt_id = ea.id
      WHERE 1=1 ${ec} ${uc}
      GROUP BY q.id, q.question_text ORDER BY avg_seconds DESC LIMIT 20
    `);
    res.json({ data: result.rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

router.get('/results-by-cobertura', async (req: Request, res: Response) => {
  const { exam_id, gerente } = req.query as Record<string, string>;
  const ec = examCond(exam_id);
  const uc = userCond(undefined, gerente);
  try {
    const result = await query(`
      SELECT u.cobertura,
        ROUND(AVG(ea.score), 2) AS avg_score,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE ea.passed = true) AS passed,
        COUNT(*) FILTER (WHERE ea.passed = false) AS failed
      FROM exam_attempts ea JOIN users u ON ea.user_id = u.id
      WHERE ea.status IN ('submitted','auto_submitted','timed_out') AND u.cobertura IS NOT NULL ${ec} ${uc}
      GROUP BY u.cobertura ORDER BY avg_score DESC
    `);
    res.json({ data: result.rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

router.get('/results-by-gerente', async (req: Request, res: Response) => {
  const { exam_id, cobertura } = req.query as Record<string, string>;
  const ec = examCond(exam_id);
  const uc = userCond(cobertura, undefined);
  try {
    const result = await query(`
      SELECT u.gerente,
        ROUND(AVG(ea.score), 2) AS avg_score,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE ea.passed = true) AS passed,
        COUNT(*) FILTER (WHERE ea.passed = false) AS failed
      FROM exam_attempts ea JOIN users u ON ea.user_id = u.id
      WHERE ea.status IN ('submitted','auto_submitted','timed_out') AND u.gerente IS NOT NULL ${ec} ${uc}
      GROUP BY u.gerente ORDER BY avg_score DESC
    `);
    res.json({ data: result.rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

router.get('/live-monitor', async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT s.*, u.name, u.email, u.area, u.cobertura, u.gerente, u.avatar_url,
        e.title AS exam_title, ea.tab_switch_count, ea.copy_paste_count,
        ea.fullscreen_exit_count, ea.is_suspicious, ea.score, ea.current_question_index
      FROM active_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN exams e ON s.current_exam_id = e.id
      LEFT JOIN exam_attempts ea ON s.current_attempt_id = ea.id
      WHERE s.last_seen > NOW() - INTERVAL '10 minutes'
      ORDER BY s.last_seen DESC
    `);
    res.json({ sessions: result.rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

export default router;
