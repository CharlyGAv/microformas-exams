import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { query } from '../config/database';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateJWT, requireRole('admin', 'supervisor'));

interface ReportFilters { exam_id?: string; cobertura?: string; gerente?: string; }

const getReportData = async (type: string, id?: string, filters: ReportFilters = {}) => {
  switch (type) {
    case 'general': {
      const conds: string[] = [];
      const params: unknown[] = [];
      let i = 1;
      if (filters.exam_id)   { conds.push(`ea.exam_id  = $${i++}`); params.push(filters.exam_id); }
      if (filters.cobertura) { conds.push(`u.cobertura = $${i++}`); params.push(filters.cobertura); }
      if (filters.gerente)   { conds.push(`u.gerente   = $${i++}`); params.push(filters.gerente); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      return query(`
        SELECT ea.id, u.name AS nombre, u.email, u.area, u.cobertura, u.gerente,
          e.title AS examen, ea.score, ea.passed AS aprobado,
          ea.started_at AS inicio, ea.submitted_at AS envio,
          ea.tab_switch_count AS cambios_pestana, ea.copy_paste_count AS copias,
          ea.fullscreen_exit_count AS salidas_pantalla, ea.is_suspicious AS sospechoso,
          ea.status AS estado
        FROM exam_attempts ea
        JOIN users u ON ea.user_id = u.id JOIN exams e ON ea.exam_id = e.id
        ${where}
        ORDER BY ea.created_at DESC`, params);
    }
    case 'exam':
      return query(`
        SELECT ea.id, u.name, u.email, u.area, ea.score, ea.passed, ea.started_at, ea.submitted_at,
          ea.tab_switch_count, ea.copy_paste_count, ea.is_suspicious, ea.status
        FROM exam_attempts ea JOIN users u ON ea.user_id = u.id
        WHERE ea.exam_id = $1 ORDER BY ea.score DESC`, [id]);
    case 'user':
      return query(`
        SELECT ea.id, e.title AS exam, ea.score, ea.passed, ea.started_at, ea.submitted_at,
          ea.tab_switch_count, ea.status
        FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id
        WHERE ea.user_id = $1 ORDER BY ea.created_at DESC`, [id]);
    case 'area':
      return query(`
        SELECT u.area, COUNT(*) AS total, ROUND(AVG(ea.score),2) AS avg_score,
          COUNT(*) FILTER (WHERE ea.passed=true) AS passed,
          COUNT(*) FILTER (WHERE ea.passed=false) AS failed
        FROM exam_attempts ea JOIN users u ON ea.user_id = u.id
        WHERE ea.status='submitted' GROUP BY u.area ORDER BY avg_score DESC`);
    case 'security':
      return query(`
        SELECT al.event_type, al.severity, al.occurred_at, al.event_data,
          u.name, u.email, e.title AS exam
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        LEFT JOIN exams e ON al.exam_id = e.id
        WHERE al.severity IN ('warning','critical')
        ORDER BY al.occurred_at DESC LIMIT 500`);
    default:
      return { rows: [] };
  }
};

router.get('/:type', async (req: Request, res: Response) => {
  const { type } = req.params;
  const { id, format, exam_id, cobertura, gerente } = req.query as Record<string, string>;

  try {
    const result = await getReportData(type, id, { exam_id, cobertura, gerente });
    const rows = (result as { rows: Record<string, unknown>[] }).rows;

    if (format === 'csv') {
      const headers = rows[0] ? Object.keys(rows[0]).join(',') : '';
      const csvRows = rows.map(r =>
        Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reporte_${type}.csv"`);
      res.send('﻿' + [headers, ...csvRows].join('\n'));
      return;
    }

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="reporte_${type}.json"`);
      res.json(rows);
      return;
    }

    if (format === 'xlsx') {
      const COL_LABELS: Record<string, string> = {
        nombre: 'Nombre', email: 'Correo', area: 'Área', cobertura: 'Cobertura', gerente: 'Gerente',
        examen: 'Examen', exam: 'Examen', score: 'Calificación (%)', aprobado: 'Aprobado', passed: 'Aprobado',
        inicio: 'Inicio', envio: 'Envío', started_at: 'Inicio', submitted_at: 'Envío',
        cambios_pestana: 'Cambios de pestaña', copias: 'Copias/Pegados', salidas_pantalla: 'Salidas pantalla',
        tab_switch_count: 'Cambios de pestaña', copy_paste_count: 'Copias/Pegados',
        fullscreen_exit_count: 'Salidas pantalla', sospechoso: 'Sospechoso', is_suspicious: 'Sospechoso',
        estado: 'Estado', status: 'Estado', name: 'Nombre',
        event_type: 'Evento', severity: 'Severidad', occurred_at: 'Fecha', event_data: 'Datos',
        avg_score: 'Promedio (%)', total: 'Total', passed_count: 'Aprobados', failed_count: 'Reprobados',
      };
      const STATUS_LABELS: Record<string, string> = {
        submitted: 'Enviado', in_progress: 'En progreso',
        auto_submitted: 'Auto-enviado', timed_out: 'Tiempo agotado',
      };
      const BOOLEAN_COLS  = new Set(['aprobado','passed','sospechoso','is_suspicious']);
      const DATE_COLS     = new Set(['inicio','envio','started_at','submitted_at','occurred_at']);
      const SCORE_COLS    = new Set(['score','avg_score']);
      const STATUS_COLS   = new Set(['estado','status']);
      const HIDDEN_COLS   = new Set(['id']);

      const wb        = new ExcelJS.Workbook();
      wb.creator      = 'Microformas Exams';
      wb.created      = new Date();
      const ws        = wb.addWorksheet('Reporte', { views: [{ state: 'frozen', ySplit: 1 }] });

      if (rows.length > 0) {
        const cols = Object.keys(rows[0]).filter((c) => !HIDDEN_COLS.has(c));

        // Header row
        ws.columns = cols.map((col) => ({
          header: COL_LABELS[col] ?? col.replace(/_/g, ' '),
          key: col,
          width: ['nombre','email','gerente','examen','exam'].includes(col) ? 30 : 18,
        }));

        const headerRow = ws.getRow(1);
        headerRow.height = 22;
        headerRow.eachCell((cell) => {
          cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
          cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FF374151' } } };
        });

        // Data rows
        rows.forEach((row, idx) => {
          const values: Record<string, unknown> = {};
          for (const col of cols) {
            const val = row[col];
            if (BOOLEAN_COLS.has(col))       values[col] = val ? 'Sí' : 'No';
            else if (DATE_COLS.has(col))     values[col] = val ? new Date(val as string) : '';
            else if (STATUS_COLS.has(col))   values[col] = STATUS_LABELS[val as string] ?? String(val ?? '');
            else if (SCORE_COLS.has(col))    values[col] = val != null ? parseFloat(String(val)) : '';
            else                             values[col] = val ?? '';
          }

          const dataRow  = ws.addRow(values);
          const isEven   = idx % 2 === 0;
          const bgColor  = isEven ? 'FFFAFAFA' : 'FFFFFFFF';

          dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
            const col = cols[colNum - 1];
            cell.alignment = { vertical: 'middle', horizontal: SCORE_COLS.has(col) ? 'right' : 'left' };
            cell.font      = { size: 10 };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

            // Color aprobado / sospechoso
            if (BOOLEAN_COLS.has(col) && !STATUS_COLS.has(col)) {
              const isAprobado = col === 'aprobado' || col === 'passed';
              cell.font = { size: 10, bold: true, color: { argb: cell.value === 'Sí' ? (isAprobado ? 'FF16A34A' : 'FFDC2626') : 'FFDC2626' } };
            }
            // Score coloreado
            if (SCORE_COLS.has(col) && cell.value !== '') {
              const v = parseFloat(String(cell.value));
              cell.font = { size: 10, bold: true, color: { argb: v >= 70 ? 'FF16A34A' : 'FFDC2626' } };
              cell.numFmt = '0.00"%"';
            }
            // Fecha formateada
            if (DATE_COLS.has(col) && cell.value instanceof Date) {
              cell.numFmt = 'dd/mm/yyyy hh:mm';
            }
          });
          dataRow.height = 18;
        });

        // Auto-filter
        ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
      }

      const reportName = { general: 'Resultados Generales', exam: 'Por Examen', user: 'Por Usuario', area: 'Por Área', security: 'Seguridad' }[type] || type;
      const date       = new Date().toISOString().split('T')[0];
      const buffer     = await wb.xlsx.writeBuffer();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Microformas_${reportName}_${date}.xlsx"`);
      res.setHeader('Content-Length', buffer.byteLength);
      res.send(Buffer.from(buffer));
      return;
    }

    res.json({ data: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

router.get('/audit/users', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.avatar_url,
        COUNT(*)                                              AS total_events,
        COUNT(*) FILTER (WHERE al.severity = 'critical')    AS critical_count,
        COUNT(*) FILTER (WHERE al.severity = 'warning')     AS warning_count,
        COUNT(*) FILTER (WHERE al.severity = 'info')        AS info_count,
        MAX(al.occurred_at)                                  AS last_event
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      GROUP BY u.id, u.name, u.email, u.avatar_url
      ORDER BY MAX(al.occurred_at) DESC`);
    res.json({ users: result.rows });
  } catch {
    res.status(500).json({ error: 'Error al obtener usuarios de auditoría' });
  }
});

router.get('/audit/logs', async (req: Request, res: Response) => {
  const { attempt_id, user_id, exam_id, severity } = req.query as Record<string, string>;
  try {
    let sql = `
      SELECT al.*, u.name AS user_name, u.email, e.title AS exam_title
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN exams e ON al.exam_id = e.id
      WHERE 1=1`;
    const params: unknown[] = [];
    let i = 1;
    if (attempt_id) { sql += ` AND al.attempt_id = $${i++}`; params.push(attempt_id); }
    if (user_id) { sql += ` AND al.user_id = $${i++}`; params.push(user_id); }
    if (exam_id) { sql += ` AND al.exam_id = $${i++}`; params.push(exam_id); }
    if (severity) { sql += ` AND al.severity = $${i++}`; params.push(severity); }
    sql += ' ORDER BY al.occurred_at DESC LIMIT 200';

    const result = await query(sql, params);
    res.json({ logs: result.rows });
  } catch {
    res.status(500).json({ error: 'Error al obtener auditoría' });
  }
});

export default router;
