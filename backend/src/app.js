// ─── Express Application Setup ──────────────────────────────

'use strict';

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const cookieParser = require('cookie-parser');
const path        = require('path');
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger      = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const session      = require('express-session');
const RedisSessionStore = require('connect-redis').RedisStore;
const { getRedisClient } = require('./config/queue');
const requestLogger = require('./middleware/requestLogger');

// Route imports
console.log("Loading health/auth routes...");
const healthRoutes     = require('./routes/health.routes');
const authRoutes       = require('./routes/auth.routes');

console.log("Loading admin/division routes...");
const adminRoutes      = require('./routes/admin.routes');
const divisionRoutes   = require('./routes/division.routes');

console.log("Loading course/content routes...");
const courseRoutes     = require('./routes/course.routes');
const contentRoutes    = require('./routes/content.routes');

console.log("Loading enrollment/payment routes...");
const enrollmentRoutes = require('./routes/enrollment.routes');
const paymentRoutes    = require('./routes/payment.routes');

console.log("Loading progress/quiz routes...");
const progressRoutes   = require('./routes/progress.routes');
const quizRoutes       = require('./routes/quiz.routes');
const quizzesRoutes    = require('./routes/quizzes.routes');

console.log("Loading user/category/workshop routes...");
const userRoutes       = require('./routes/user.routes');
const categoryRoutes   = require('./routes/category.routes');
const workshopRoutes   = require('./routes/workshop.routes');

console.log("Loading misc routes...");
const csrfRoutes       = require('./routes/csrf.routes');
const favoritesRoutes  = require('./routes/favorites.routes');
const notificationRoutes = require('./routes/notification.routes');

console.log("✅ All routes loaded successfully!");

const { csrfSynchronisedProtection } = require('./config/csrf');

const app = express();

// ── Global Middleware ────────────────────────────────────────

app.use(helmet());

// CRIT-02 fix: Strict CORS - never use '*'. Use explicit origin from env.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL,
      'https://learnify.pk',
      'https://www.learnify.pk',
    ].filter(Boolean)
  : [
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
      'http://localhost:3000',
    ].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (curl/postman/supertest) that omit Origin.
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    const isLocalDevOrigin =
      process.env.NODE_ENV !== 'production' &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

    if (isExplicitlyAllowed || isLocalDevOrigin) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
};

app.use(cors(corsOptions));
// Preflight handler to avoid browser Network Error on OPTIONS
app.options(/.*/, cors(corsOptions));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
 
// ── Session Middleware (required by csrf-sync for stateful tokens) ──
const redisClient = getRedisClient();
if (redisClient) {
  app.use(session({
    store: new RedisSessionStore({ client: redisClient, prefix: "learnify:session:" }),
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax', // Allow redirects from auth to work
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  }));
}
 
// CSRF Protection Middleware

// Applied to all routes, but only validates POST, PUT, PATCH, DELETE by default.
// GET, HEAD, OPTIONS are excluded.
app.use(csrfSynchronisedProtection);


app.use(requestLogger);
// ── Static Files: Uploaded Materials ─────────────────────────
// Serves locally uploaded files from public/uploads/
// Frontend can stream videos/images directly from /uploads/...
//
// Note: In production with Cloudflare R2, this will be removed
// and content will be served from the CDN.
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// FINDING-09 fix: morgan('dev') only in development.
// In production, HTTP logs are piped through the structured logger
// so they appear in CloudWatch / Datadog alongside application logs.
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.http(message.trim()) },
    })
  );
}

// ── API Routes ───────────────────────────────────────────────

app.use('/api/v1/health',      healthRoutes);
app.use('/api/v1/auth',        authRoutes);
app.use('/api/v1/admin',       adminRoutes);
app.use('/api/v1/divisions',   divisionRoutes);
app.use('/api/v1/courses',     courseRoutes);
app.use('/api/v1/courses',     contentRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/payments',    paymentRoutes);
app.use('/api/v1/progress',    progressRoutes);
app.use('/api/v1/quiz',        quizRoutes);
app.use('/api/v1/quizzes',     quizzesRoutes);
app.use('/api/v1/favorites',   favoritesRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/users',       userRoutes);
app.use('/api/v1/categories',  categoryRoutes);
app.use('/api/v1/workshops',   workshopRoutes);
app.use('/api/v1',            csrfRoutes);

// ── Swagger UI (development only) ────────────────────────────
// Swagger UI requires inline scripts/styles that Helmet's CSP blocks.
// A relaxed helmet config is applied ONLY on this route.
if (process.env.NODE_ENV !== 'production') {
  app.use(
    '/api-docs',
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:  ["'self'", "'unsafe-inline'"],
          styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
          imgSrc:     ["'self'", 'data:', 'https://validator.swagger.io'],
        },
      },
    }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Learnify API Docs',
      customCss: '.swagger-ui .topbar { background-color: #1a1a2e; } .swagger-ui .topbar-wrapper img { content: none; }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );
  logger.info('Swagger UI enabled at /api-docs');
}

// ── 404 Handler ──────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

app.use((err, req, res, next) => {
  // csrf-sync uses a specific message for token mismatches
  if (err.message === 'invalid csrf token') {
    logger.warn('CSRF token validation failed:', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token.',
    });
  }
  next(err);
});

// ── Error Handler ────────────────────────────────────────────

app.use(errorHandler);

module.exports = app;
