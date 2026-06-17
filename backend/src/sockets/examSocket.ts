import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

interface AuthPayload { id: string; email: string; role: string; }

export const setupSockets = (io: Server) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as AuthPayload;
      const result = await query('SELECT id, name, email, role, avatar_url, area FROM users WHERE id = $1 AND is_active = true', [decoded.id]);
      if (!result.rows[0]) return next(new Error('User not found'));
      socket.data.user = result.rows[0];
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;
    console.log(`[Socket] Connected: ${user.name} (${user.role}) - ${socket.id}`);

    // Upsert session
    await query(
      `INSERT INTO active_sessions (user_id, socket_id, status, last_seen)
       VALUES ($1, $2, 'connected', NOW())
       ON CONFLICT (user_id) DO UPDATE SET socket_id=$2, status='connected', last_seen=NOW()`,
      [user.id, socket.id]
    );

    // Join admin room if applicable
    if (user.role === 'admin' || user.role === 'supervisor') {
      socket.join('admins');
    }
    socket.join(`user:${user.id}`);

    // Broadcast updated session list to admins
    const broadcastSessions = async () => {
      const sessions = await query(`
        SELECT s.*, u.name, u.email, u.area, u.avatar_url,
          e.title AS exam_title, ea.tab_switch_count, ea.copy_paste_count,
          ea.fullscreen_exit_count, ea.is_suspicious, ea.current_question_index
        FROM active_sessions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN exams e ON s.current_exam_id = e.id
        LEFT JOIN exam_attempts ea ON s.current_attempt_id = ea.id
        WHERE s.last_seen > NOW() - INTERVAL '10 minutes'
        ORDER BY s.last_seen DESC`);
      io.to('admins').emit('sessions:update', { sessions: sessions.rows });
    };

    broadcastSessions();

    socket.on('exam:start', async ({ examId, attemptId }) => {
      await query(
        `UPDATE active_sessions SET current_exam_id=$1, current_attempt_id=$2, status='in_exam', last_seen=NOW()
         WHERE user_id=$3`,
        [examId, attemptId, user.id]
      );
      io.to('admins').emit('user:exam_started', { userId: user.id, userName: user.name, examId, attemptId });
      broadcastSessions();
    });

    socket.on('exam:progress', async ({ attemptId, questionIndex, totalQuestions, timeRemaining }) => {
      const progress = Math.round((questionIndex / totalQuestions) * 100);
      await query(
        `UPDATE active_sessions SET current_question_index=$1, progress_percent=$2, time_remaining_seconds=$3, last_seen=NOW()
         WHERE user_id=$4`,
        [questionIndex, progress, timeRemaining, user.id]
      );
      io.to('admins').emit('user:progress', {
        userId: user.id, userName: user.name, questionIndex, progress, timeRemaining, attemptId,
      });
    });

    socket.on('exam:finish', async ({ attemptId, score, passed }) => {
      await query(
        `UPDATE active_sessions SET status='finished', current_exam_id=NULL, current_attempt_id=NULL, last_seen=NOW()
         WHERE user_id=$1`,
        [user.id]
      );
      io.to('admins').emit('user:exam_finished', { userId: user.id, userName: user.name, attemptId, score, passed });
      broadcastSessions();
    });

    socket.on('anti_cheat:event', async ({ attemptId, eventType, data }) => {
      io.to('admins').emit('anti_cheat:alert', {
        userId: user.id, userName: user.name, attemptId, eventType, data, timestamp: new Date(),
      });
    });

    socket.on('heartbeat', async () => {
      await query(`UPDATE active_sessions SET last_seen=NOW() WHERE user_id=$1`, [user.id]);
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${user.name} - ${socket.id}`);
      await query(
        `UPDATE active_sessions SET status='disconnected', last_seen=NOW() WHERE user_id=$1`,
        [user.id]
      );
      io.to('admins').emit('user:disconnected', { userId: user.id, userName: user.name });
      broadcastSessions();
    });
  });
};
