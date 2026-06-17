import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { query } from './database';

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || 'microformas.com.mx';

const getRole = (email: string): 'admin' | 'supervisor' | 'user' => {
  const e = email.toLowerCase().trim();
  const superAdmin = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();
  const supervisorEmails = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase());
  if (e === superAdmin) return 'admin';
  if (supervisorEmails.includes(e)) return 'supervisor';
  return 'user';
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error('No email provided by Google'), undefined);
        }

        const domain = email.split('@')[1];
        if (domain !== ALLOWED_DOMAIN) {
          return done(null, false, {
            message: `Acceso restringido. Solo se permiten cuentas @${ALLOWED_DOMAIN}`,
          });
        }

        const role = getRole(email);
        const area = role === 'user' ? 'INGENIERO DE SERVICIOS' : 'GERENTE';

        const existingUser = await query('SELECT * FROM users WHERE google_id = $1', [profile.id]);

        if (existingUser.rows.length > 0) {
          const user = existingUser.rows[0];
          if (!user.is_active) {
            return done(null, false, { message: 'Tu cuenta ha sido desactivada.' });
          }
          // Actualizar datos, rol y área en cada login
          const updated = await query(
            `UPDATE users SET name=$1, avatar_url=$2, role=$3, area=$4, updated_at=NOW()
             WHERE google_id=$5 RETURNING *`,
            [profile.displayName, profile.photos?.[0]?.value, role, area, profile.id]
          );
          return done(null, updated.rows[0]);
        }

        // Nuevo usuario
        const newUser = await query(
          `INSERT INTO users (google_id, email, name, avatar_url, role, area)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [profile.id, email, profile.displayName, profile.photos?.[0]?.value, role, area]
        );

        return done(null, newUser.rows[0]);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
