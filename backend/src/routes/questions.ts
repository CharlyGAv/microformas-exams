import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateJWT);

// GET /api/exams/:examId/questions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { role } = req.user!;

    const questions = await query(
      `SELECT q.*,
        json_agg(
          json_build_object(
            'id', ao.id,
            'option_text', ao.option_text,
            'is_correct', CASE WHEN $2 THEN ao.is_correct ELSE NULL END,
            'order_index', ao.order_index
          ) ORDER BY ao.order_index
        ) FILTER (WHERE ao.id IS NOT NULL) AS options
       FROM questions q
       LEFT JOIN answer_options ao ON ao.question_id = q.id
       WHERE q.exam_id = $1
       GROUP BY q.id
       ORDER BY q.order_index`,
      [examId, role === 'admin' || role === 'supervisor']
    );

    res.json({ questions: questions.rows });
  } catch {
    res.status(500).json({ error: 'Error al obtener preguntas' });
  }
});

// POST /api/exams/:examId/questions
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const { examId } = req.params;
  const { question_text, question_type, image_url, points, time_limit_seconds, feedback, order_index, options } = req.body;

  if (!question_text || !question_type) {
    res.status(400).json({ error: 'Texto y tipo de pregunta son requeridos' });
    return;
  }

  const client = await (await import('../config/database')).getClient();
  try {
    await client.query('BEGIN');

    const qResult = await client.query(
      `INSERT INTO questions (exam_id, question_text, question_type, image_url, points, time_limit_seconds, feedback, order_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [examId, question_text, question_type, image_url, points ?? 1, time_limit_seconds, feedback, order_index ?? 0]
    );
    const question = qResult.rows[0];

    if (options && Array.isArray(options) && options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        await client.query(
          `INSERT INTO answer_options (question_id, option_text, is_correct, order_index)
           VALUES ($1,$2,$3,$4)`,
          [question.id, options[i].option_text, options[i].is_correct ?? false, i]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ question });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear la pregunta' });
  } finally {
    client.release();
  }
});

// PUT /api/questions/:id
router.put('/:questionId', requireRole('admin'), async (req: Request, res: Response) => {
  const { questionId } = req.params;
  const { question_text, question_type, image_url, points, time_limit_seconds, feedback, order_index, options } = req.body;

  const client = await (await import('../config/database')).getClient();
  try {
    await client.query('BEGIN');

    const qResult = await client.query(
      `UPDATE questions SET question_text=$1, question_type=$2, image_url=$3, points=$4,
        time_limit_seconds=$5, feedback=$6, order_index=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [question_text, question_type, image_url, points, time_limit_seconds, feedback, order_index, questionId]
    );

    if (!qResult.rows[0]) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Pregunta no encontrada' });
      return;
    }

    if (options && Array.isArray(options)) {
      await client.query('DELETE FROM answer_options WHERE question_id = $1', [questionId]);
      for (let i = 0; i < options.length; i++) {
        await client.query(
          `INSERT INTO answer_options (question_id, option_text, is_correct, order_index)
           VALUES ($1,$2,$3,$4)`,
          [questionId, options[i].option_text, options[i].is_correct ?? false, i]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ question: qResult.rows[0] });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al actualizar la pregunta' });
  } finally {
    client.release();
  }
});

// DELETE /api/questions/:questionId
router.delete('/:questionId', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM questions WHERE id = $1 RETURNING id', [req.params.questionId]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Pregunta no encontrada' });
      return;
    }
    res.json({ message: 'Pregunta eliminada' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar la pregunta' });
  }
});

export default router;
