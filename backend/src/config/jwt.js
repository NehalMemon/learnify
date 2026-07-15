// ─── JWT Configuration ───────────────────────────────────────
// Security Rule §5 + §2: Secrets MUST come from environment.
// Guard added: if either secret is missing, crash at startup
// before any request can be served with a forgeable token.

require('dotenv').config();

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in .env. ' +
    'Refusing to start — all tokens would be trivially forgeable.'
  );
}

module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};

