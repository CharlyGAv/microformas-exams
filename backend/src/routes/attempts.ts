import { Router, Request, Response } from 'express';
import { query, getClient } from '../config/database';
import { authenticateJWT } from '../middleware/auth';

const router = Router();
router.use(authenticateJWT);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function applyRandomization(
  rows: Record<string, unknown>[],
  randomizeQuestions: boolean,
  randomizeOptions: boolean
): Record<string, unknown>[] {
  let questions = randomizeQuestions ? shuffle(rows) : rows;
  if (randomizeOptions) {
    questions = questions.map((q) => ({
      ...q,
      options: Array.isArray(q.options) ? shuffle(q.options as unknown[]) : q.options,
    }));
  }
  return questions;
}

// POST /api/exams/:examId/start
router.post('/exams/:examId/start', async (req: Request, res: Response) => {
  const { examId } = req.params;
  const userId = req.user!.id;

  try {
    // Validate exam exists and is active
    const examResult = await query(
      `SELECT * FROM exams WHERE id = $1 AND is_active = true AND NOW() BETWEEN start_datetime AND end_datetime`,
      [examId]
    );
    if (!examResult.rows[0]) {
      res.status(404).json({ error: 'Examen no disponible' });
      return;
    }
    const exam = examResult.rows[0];

    // Check attempt count
    const attemptsResult = await query(
      `SELECT COUNT(*) FROM exam_attempts WHERE exam_id = $1 AND user_id = $2 AND status != 'in_progress'`,
      [examId, userId]
    );
    if (parseInt(attemptsResult.rows[0].count) >= exam.max_attempts) {
      res.status(400).json({ error: 'Has alcanzado el número máximo de intentos' });
      return;
    }

    // Check if there's an in_progress attempt
    const inProgress = await query(
      `SELECT * FROM exam_attempts WHERE exam_id = $1 AND user_id = $2 AND status = 'in_progress'`,
      [examId, userId]
    );
    if (inProgress.rows[0]) {
      const attempt = inProgress.rows[0];
      const elapsed = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);
      const remainingSeconds = exam.duration_minutes * 60 - elapsed;

      if (remainingSeconds <= 0) {
        await query(`UPDATE exam_attempts SET status = 'timed_out', submitted_at = NOW() WHERE id = $1`, [attempt.id]);
      } else {
        const questions = await query(
          `SELECT q.*, json_agg(
              json_build_object('id', ao.id, 'option_text', ao.option_text, 'order_index', ao.order_index)
              ORDER BY ao.order_index
            ) FILTER (WHERE ao.id IS NOT NULL) AS options
           FROM questions q LEFT JOIN answer_options ao ON ao.question_id = q.id
           WHERE q.exam_id = $1 GROUP BY q.id ORDER BY q.order_index`,
          [examId]
        );
        const orderedQuestions = applyRandomization(
          questions.rows, exam.randomize_questions, exam.randomize_options
        );
        return res.json({ attempt, exam, questions: orderedQuestions, remaining_seconds: remainingSeconds });
      }
    }

    // Create new attempt
    const attemptResult = await query(
      `INSERT INTO exam_attempts (exam_id, user_id, ip_address, user_agent)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [examId, userId, req.ip, req.headers['user-agent']]
    );
    const attempt = attemptResult.rows[0];

    const questions = await query(
      `SELECT q.*, json_agg(
          json_build_object('id', ao.id, 'option_text', ao.option_text, 'order_index', ao.order_index)
          ORDER BY ao.order_index
        ) FILTER (WHERE ao.id IS NOT NULL) AS options
       FROM questions q LEFT JOIN answer_options ao ON ao.question_id = q.id
       WHERE q.exam_id = $1 GROUP BY q.id ORDER BY q.order_index`,
      [examId]
    );
    const orderedQuestions = applyRandomization(
      questions.rows, exam.randomize_questions, exam.randomize_options
    );

    res.status(201).json({
      attempt,
      exam,
      questions: orderedQuestions,
      remaining_seconds: exam.duration_minutes * 60,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar el examen' });
  }
});

// POST /api/attempts/:id/answer - save individual answer
router.post('/attempts/:id/answer', async (req: Request, res: Response) => {
  const { id: attemptId } = req.params;
  const { question_id, selected_option_ids, open_text_answer, time_spent_seconds, time_expired } = req.body;

  try {
    const attempt = await query(
      `SELECT ea.*, e.duration_minutes FROM exam_attempts ea
       JOIN exams e ON ea.exam_id = e.id
       WHERE ea.id = $1 AND ea.user_id = $2 AND ea.status = 'in_progress'`,
      [attemptId, req.user!.id]
    );
    if (!attempt.rows[0]) {
      res.status(404).json({ error: 'Intento no encontrado o ya finalizado' });
      return;
    }

    // Determine if correct
    const qResult = await query(
      `SELECT q.question_type,
        array_agg(ao.id) FILTER (WHERE ao.is_correct = true) AS correct_option_ids,
        q.points
       FROM questions q LEFT JOIN answer_options ao ON ao.question_id = q.id
       WHERE q.id = $1 GROUP BY q.id`,
      [question_id]
    );
    const question = qResult.rows[0];
    let is_correct = false;
    let points_earned = 0;

    if (question?.question_type !== 'open_text') {
      const selectedIds = selected_option_ids || [];
      const correctIds = question?.correct_option_ids || [];
      const sortedSelected = [...selectedIds].sort();
      const sortedCorrect = [...correctIds].sort();
      is_correct = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
      points_earned = is_correct ? parseFloat(question?.points) : 0;
    }

    await query(
      `INSERT INTO user_answers (attempt_id, question_id, selected_option_ids, open_text_answer, time_spent_seconds, is_correct, points_earned, time_expired)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (attempt_id, question_id) DO UPDATE
       SET selected_option_ids=$3, open_text_answer=$4, time_spent_seconds=$5, is_correct=$6, points_earned=$7, time_expired=$8, answered_at=NOW()`,
      [attemptId, question_id, selected_option_ids || [], open_text_answer, time_spent_seconds, is_correct, points_earned, time_expired ?? false]
    );

    res.json({ saved: true, is_correct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar respuesta' });
  }
});

// POST /api/attempts/:id/submit
router.post('/attempts/:id/submit', async (req: Request, res: Response) => {
  const { id: attemptId } = req.params;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const attempt = await client.query(
      `SELECT ea.*, e.passing_score, e.duration_minutes, e.show_results_immediately
       FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id
       WHERE ea.id = $1 AND ea.user_id = $2 AND ea.status IN ('in_progress','auto_submitted')`,
      [attemptId, req.user!.id]
    );
    if (!attempt.rows[0]) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Intento no encontrado' });
      return;
    }
    const attemptData = attempt.rows[0];

    // Calculate score — total comes from ALL questions in the exam so unanswered
    // questions count as 0 points earned and don't shrink the denominator.
    const scoreResult = await client.query(
      `SELECT
        COALESCE(SUM(ua.points_earned), 0) AS earned,
        (SELECT COALESCE(SUM(q.points), 0) FROM questions q WHERE q.exam_id = $2) AS total
       FROM user_answers ua
       WHERE ua.attempt_id = $1`,
      [attemptId, attemptData.exam_id]
    );
    const { earned, total } = scoreResult.rows[0];
    const score = total > 0 ? Math.round((parseFloat(earned) / parseFloat(total)) * 100 * 100) / 100 : 0;
    const passed = score >= parseFloat(attemptData.passing_score);

    const updated = await client.query(
      `UPDATE exam_attempts SET status = 'submitted', submitted_at = NOW(), score = $1, passed = $2
       WHERE id = $3 RETURNING *`,
      [score, passed, attemptId]
    );

    await client.query('COMMIT');

    const answers = await query(
      `SELECT ua.*, q.question_text, q.question_type, q.points AS max_points, q.feedback,
        json_agg(json_build_object('id', ao.id, 'option_text', ao.option_text, 'is_correct', ao.is_correct)
          ORDER BY ao.order_index) FILTER (WHERE ao.id IS NOT NULL) AS options
       FROM user_answers ua
       JOIN questions q ON ua.question_id = q.id
       LEFT JOIN answer_options ao ON ao.question_id = q.id
       WHERE ua.attempt_id = $1
       GROUP BY ua.id, q.question_text, q.question_type, q.points, q.feedback`,
      [attemptId]
    );

    res.json({
      attempt: updated.rows[0],
      score,
      passed,
      results: attemptData.show_results_immediately ? answers.rows : null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al finalizar el examen' });
  } finally {
    client.release();
  }
});

// GET /api/users/:userId/attempts  (admin/supervisor)
router.get('/users/:userId/attempts', async (req: Request, res: Response) => {
  if (!['admin', 'supervisor'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Sin permisos' }); return;
  }
  try {
    const result = await query(
      `SELECT ea.*, e.title AS exam_title, e.passing_score
       FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id
       WHERE ea.user_id = $1 ORDER BY ea.created_at DESC`,
      [req.params.userId]
    );
    res.json({ attempts: result.rows });
  } catch {
    res.status(500).json({ error: 'Error al obtener intentos' });
  }
});

// DELETE /api/attempts/:id  (admin only)
router.delete('/attempts/:id', async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Solo administradores pueden borrar registros' }); return;
  }
  const { id } = req.params;
  try {
    await query(`DELETE FROM user_answers                                  WHERE attempt_id        = $1`, [id]);
    await query(`DELETE FROM audit_logs                                    WHERE attempt_id        = $1`, [id]);
    await query(`UPDATE active_sessions SET current_attempt_id = NULL      WHERE current_attempt_id = $1`, [id]);
    const result = await query(`DELETE FROM exam_attempts WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Registro no encontrado' }); return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE attempt error:', err);
    res.status(500).json({ error: 'Error al borrar el registro' });
  }
});

// GET /api/attempts/my - user's own attempts
router.get('/attempts/my', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT ea.*, e.title AS exam_title, e.passing_score
       FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id
       WHERE ea.user_id = $1 ORDER BY ea.created_at DESC`,
      [req.user!.id]
    );
    res.json({ attempts: result.rows });
  } catch {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// GET /api/attempts/:id
router.get('/attempts/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT ea.*, e.title AS exam_title, e.passing_score, u.name AS user_name, u.email
       FROM exam_attempts ea
       JOIN exams e ON ea.exam_id = e.id
       JOIN users u ON ea.user_id = u.id
       WHERE ea.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Intento no encontrado' });
      return;
    }
    const attempt = result.rows[0];

    if (req.user!.role === 'user' && attempt.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Sin permisos' });
      return;
    }

    const answers = await query(
      `SELECT ua.*, q.question_text, q.question_type, q.points AS max_points, q.feedback,
        json_agg(json_build_object('id', ao.id, 'option_text', ao.option_text, 'is_correct', ao.is_correct)
          ORDER BY ao.order_index) FILTER (WHERE ao.id IS NOT NULL) AS options
       FROM user_answers ua
       JOIN questions q ON ua.question_id = q.id
       LEFT JOIN answer_options ao ON ao.question_id = q.id
       WHERE ua.attempt_id = $1
       GROUP BY ua.id, q.question_text, q.question_type, q.points, q.feedback, q.order_index
       ORDER BY q.order_index`,
      [req.params.id]
    );

    res.json({ attempt, answers: answers.rows });
  } catch {
    res.status(500).json({ error: 'Error al obtener el intento' });
  }
});

// POST /api/attempts/:id/audit - log anti-cheat event
router.post('/attempts/:id/audit', async (req: Request, res: Response) => {
  const { event_type, event_data, severity } = req.body;
  const { id: attemptId } = req.params;

  try {
    const attempt = await query(
      `SELECT ea.exam_id FROM exam_attempts ea WHERE ea.id = $1 AND ea.user_id = $2`,
      [attemptId, req.user!.id]
    );
    if (!attempt.rows[0]) {
      res.status(404).json({ error: 'Intento no encontrado' });
      return;
    }

    await query(
      `INSERT INTO audit_logs (attempt_id, user_id, exam_id, event_type, event_data, severity)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [attemptId, req.user!.id, attempt.rows[0].exam_id, event_type, JSON.stringify(event_data || {}), severity || 'info']
    );

    // Update counters
    if (event_type === 'TAB_SWITCH' || event_type === 'WINDOW_BLUR') {
      await query(
        `UPDATE exam_attempts SET tab_switch_count = tab_switch_count + 1 WHERE id = $1`,
        [attemptId]
      );
      const updated = await query(`SELECT tab_switch_count FROM exam_attempts WHERE id = $1`, [attemptId]);
      const count = updated.rows[0]?.tab_switch_count;
      if (count >= 3) {
        await query(`UPDATE exam_attempts SET status = 'auto_submitted', submitted_at = NOW(), is_suspicious = true WHERE id = $1 AND status = 'in_progress'`, [attemptId]);
      } else if (count >= 2) {
        await query(`UPDATE exam_attempts SET is_suspicious = true WHERE id = $1`, [attemptId]);
      }
    }
    if (event_type === 'COPY_PASTE') {
      await query(`UPDATE exam_attempts SET copy_paste_count = copy_paste_count + 1 WHERE id = $1`, [attemptId]);
    }
    if (event_type === 'FULLSCREEN_EXIT') {
      await query(`UPDATE exam_attempts SET fullscreen_exit_count = fullscreen_exit_count + 1 WHERE id = $1`, [attemptId]);
    }

    res.json({ logged: true });
  } catch {
    res.status(500).json({ error: 'Error al registrar evento' });
  }
});

export default router;
