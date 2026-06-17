-- ============================================================
-- Seed: Admin user and sample exam
-- ============================================================

-- Insert admin user (replace google_id and email with real values)
INSERT INTO users (google_id, email, name, role, area, is_active)
VALUES
  ('REPLACE_WITH_REAL_GOOGLE_ID', 'admin@microformas.com.mx', 'Administrador Sistema', 'admin', 'TI', true)
ON CONFLICT (email) DO NOTHING;

-- Sample exam
INSERT INTO exams (title, description, start_datetime, end_datetime, duration_minutes, passing_score, max_attempts, created_by)
SELECT
  'Inducción Corporativa 2026',
  'Examen de inducción para nuevos colaboradores de Microformas. Cubre políticas, valores y procesos generales.',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '30 days',
  60,
  70.00,
  2,
  id
FROM users WHERE email = 'admin@microformas.com.mx'
ON CONFLICT DO NOTHING;
