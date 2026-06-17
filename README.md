# Microformas - Plataforma de Exámenes Corporativos

Plataforma empresarial de exámenes en línea con sistema antitrampa, monitoreo en tiempo real y reportes ejecutivos.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL 16 |
| Autenticación | Google OAuth 2.0 (restringido a @microformas.com.mx) |
| Tiempo real | Socket.IO |
| Charts | Recharts |
| Deploy | Docker Compose / Vercel + Railway |

---

## Requisitos Previos

- Node.js 20+
- PostgreSQL 16+ (o Docker)
- Cuenta de Google Cloud Console con OAuth 2.0 configurado

---

## Configuración Rápida

### 1. Clonar y configurar variables

```bash
cd backend
cp .env.example .env
# Editar .env con tus credenciales reales
```

Variables críticas en `backend/.env`:
```env
GOOGLE_CLIENT_ID=...         # Desde Google Cloud Console
GOOGLE_CLIENT_SECRET=...     # Desde Google Cloud Console
JWT_SECRET=string-secreto-largo-y-seguro
DATABASE_URL=postgresql://postgres:password@localhost:5432/microformas_exams
FRONTEND_URL=http://localhost:5173
ALLOWED_DOMAIN=microformas.com.mx
```

### 2. Configurar Google OAuth 2.0

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto → APIs y Servicios → Credenciales → OAuth 2.0
3. URIs de redirección autorizados:
   - `http://localhost:4000/api/auth/google/callback` (desarrollo)
   - `https://tu-dominio.com/api/auth/google/callback` (producción)
4. Origen JavaScript autorizado: `http://localhost:5173`

### 3. Base de datos

**Con Docker (recomendado):**
```bash
docker compose up postgres -d
cd backend
npm install
npm run db:migrate
npm run db:seed
```

**Sin Docker:**
```bash
createdb microformas_exams
psql -U postgres -d microformas_exams -f backend/database/schema.sql
psql -U postgres -d microformas_exams -f backend/database/seed.sql
```

### 4. Instalar dependencias y ejecutar

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

La aplicación estará en:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Health check: http://localhost:4000/health

---

## Módulos del Sistema

### Panel Administrador `/admin`

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/admin` | KPIs, gráficas, rankings en tiempo real |
| Exámenes | `/admin/exams` | CRUD completo de exámenes |
| Preguntas | `/admin/exams/:id/questions` | Banco de preguntas (5 tipos) |
| Usuarios | `/admin/users` | Gestión y roles |
| Monitor Vivo | `/admin/monitor` | Seguimiento en tiempo real via WebSocket |
| Reportes | `/admin/reports` | Análisis exportable (CSV/JSON) |
| Auditoría | `/admin/audit` | Log completo de eventos de seguridad |

### Panel Usuario `/home`

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Mis Exámenes | `/home` | Lista de exámenes disponibles |
| Sala de Examen | `/exam/:examId` | Interfaz de examen con antitrampa |
| Resultados | `/results/:attemptId` | Calificación y retroalimentación |

---

## Sistema Antitrampa

| Control | Implementación |
|---------|---------------|
| Cambio de pestaña | `visibilitychange` event — máx 5 cambios antes de auto-submit |
| Copiar/Pegar | Bloqueo de `copy`, `paste`, `cut`, click derecho |
| Pantalla completa | Obligatoria al iniciar; re-ingresa automáticamente |
| Captura de pantalla | Detecta tecla `PrintScreen` |
| Temporizador por pregunta | Bloquea y avanza automáticamente |
| Registro de infracciones | Todo se guarda en `audit_logs` y se notifica en tiempo real |

---

## API REST

```
GET    /api/auth/me
GET    /api/auth/google
GET    /api/auth/google/callback

GET    /api/exams
POST   /api/exams
GET    /api/exams/:id
PUT    /api/exams/:id
DELETE /api/exams/:id

GET    /api/exams/:examId/questions
POST   /api/exams/:examId/questions
PUT    /api/exams/:examId/questions/:questionId
DELETE /api/exams/:examId/questions/:questionId

POST   /api/exams/:examId/start
POST   /api/attempts/:id/answer
POST   /api/attempts/:id/submit
POST   /api/attempts/:id/audit
GET    /api/attempts/:id
GET    /api/attempts/my

GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id

GET    /api/dashboard/stats
GET    /api/dashboard/results-by-exam
GET    /api/dashboard/results-by-area
GET    /api/dashboard/results-by-month
GET    /api/dashboard/top-scores
GET    /api/dashboard/live-monitor

GET    /api/reports/general
GET    /api/reports/exam?id=
GET    /api/reports/user?id=
GET    /api/reports/area
GET    /api/reports/security
GET    /api/reports/audit/logs
```

---

## Despliegue en Producción

### Railway (Backend) + Vercel (Frontend)

**Backend en Railway:**
1. Conectar repositorio en [railway.app](https://railway.app)
2. Agregar servicio PostgreSQL
3. Configurar variables de entorno de producción
4. El `Dockerfile` del backend se usa automáticamente

**Frontend en Vercel:**
1. Conectar repositorio en [vercel.com](https://vercel.com)
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Actualizar `VITE_API_URL` si es necesario

---

## Roles y Permisos

| Rol | Permisos |
|-----|---------|
| `admin` | Acceso total |
| `supervisor` | Ver resultados, monitor en vivo, reportes |
| `user` | Realizar exámenes, ver historial propio |

El primer usuario registrado con `@microformas.com.mx` necesita ser promovido a `admin` manualmente en la base de datos:

```sql
UPDATE users SET role = 'admin' WHERE email = 'tu@microformas.com.mx';
```
