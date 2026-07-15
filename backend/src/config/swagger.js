// ─── Swagger / OpenAPI 3.0 Configuration ────────────────────
// Defines the full API spec for Learnify backend.
// Accessible at: GET /api-docs
//
// All authenticated routes require: Authorization: Bearer <token>
// Obtain a token via POST /api/v1/auth/login, then click
// "Authorize" in Swagger UI and paste the token.

'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

// ── Reusable Schema Components ────────────────────────────────

const components = {
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Paste your access token here. Obtain one via **POST /api/v1/auth/login**.',
    },
  },
  schemas: {
    // ── Generic responses ──────────────────────────────────
    SuccessResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Operation successful.' },
      },
    },
    ErrorResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'An error occurred.' },
      },
    },
    ValidationErrorResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field:   { type: 'string', example: 'email' },
              message: { type: 'string', example: 'Please provide a valid email address.' },
            },
          },
        },
      },
    },

    // ── User ───────────────────────────────────────────────
    User: {
      type: 'object',
      properties: {
        id:        { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
        email:     { type: 'string', format: 'email', example: 'student@learnify.pk' },
        fullName:  { type: 'string', example: 'Ahmed Khan' },
        phone:     { type: 'string', example: '+923001234567', nullable: true },
        role:      { type: 'string', enum: ['STUDENT', 'ADMIN'], example: 'STUDENT' },
        isDeleted: { type: 'boolean', example: false },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },

    // ── Auth ───────────────────────────────────────────────
    RegisterRequest: {
      type: 'object',
      required: ['email', 'password', 'fullName'],
      properties: {
        email:    { type: 'string', format: 'email', example: 'student@learnify.pk' },
        password: {
          type: 'string',
          minLength: 8,
          example: 'Secure@Pass1',
          description: 'Min 8 chars. Must contain uppercase, number, and special character.',
        },
        fullName: { type: 'string', minLength: 2, maxLength: 100, example: 'Ahmed Khan' },
        phone:    { type: 'string', example: '+923001234567', nullable: true },
      },
    },
    LoginRequest: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email:    { type: 'string', format: 'email', example: 'student@learnify.pk' },
        password: { type: 'string', example: 'Secure@Pass1' },
      },
    },
    RefreshRequest: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGci...' },
      },
    },
    AuthResponse: {
      type: 'object',
      properties: {
        success:  { type: 'boolean', example: true },
        message:  { type: 'string', example: 'Login successful.' },
        user:     { $ref: '#/components/schemas/User' },
        redirect: { type: 'string', example: '/dashboard' },
      },
    },
    GoogleLoginRequest: {
      type: 'object',
      required: ['tokenId'],
      properties: {
        tokenId: {
          type: 'string',
          minLength: 50,
          maxLength: 4096,
          example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOTczY...',
          description:
            'The Google ID token returned by the frontend Google Sign-In SDK (e.g. `credential` field from the One Tap response).',
        },
      },
    },
    BootstrapRequest: {
      type: 'object',
      required: ['email', 'password', 'fullName'],
      properties: {
        email: { 
          type: 'string', 
          format: 'email', 
          example: 'admin@learnify.pk',
          description: 'Email address for the first admin account.'
        },
        password: {
          type: 'string',
          minLength: 8,
          example: 'AdminSecure@123',
          description: 'Min 8 chars. Must contain uppercase, number, and special character.',
        },
        fullName: { 
          type: 'string', 
          minLength: 2, 
          maxLength: 100, 
          example: 'System Administrator',
          description: 'Full name of the administrator.'
        },
      },
    },
  },
};

// ── Path Definitions ──────────────────────────────────────────

const paths = {

  // ════════════════════════════════════════════════════════
  // AUTH
  // ════════════════════════════════════════════════════════

  '/api/v1/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout and clear auth cookies',
      description: [
        'Invalidates the user session by clearing HttpOnly auth cookies server-side.',
        '',
        'The client should follow this call with a hard navigation to `/login`',
        'to flush the Next.js router cache and prevent middleware from seeing stale tokens.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'Cookies cleared successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Logged out successfully.' },
                },
              },
            },
          },
        },
        401: {
          description: 'Missing or invalid access token.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // PUBLIC CATALOG
  // ════════════════════════════════════════════════════════

  '/api/v1/courses': {
    get: {
      tags: ['Public Catalog'],
      summary: 'List all published courses',
      description: [
        'Returns all published courses. No authentication required.',
        '',
        '**Filters (query params):**',
        '- `division` — filter by division slug: `foundation` or `meded`',
        '- `category` — filter by category string',
        '- `type` — filter by CourseType enum: `FULL_COURSE`, `CRASH_COURSE`, `TEST_SERIES`, `REVISION`, `NOTES_ONLY`, `QUIZ_ACCESS`',
        '- `search` — full-text search on title, description, and instructor',
        '- `page` / `limit` — pagination (default: page=1, limit=20)',
        '',
        '**Optimization:** Only overview fields are returned — no nested modules. Fetch `/courses/:id` for the full curriculum tree.',
      ].join('\n'),
      security: [],
      parameters: [
        { name: 'division', in: 'query', schema: { type: 'string', example: 'meded' }, description: 'Filter by division slug.' },
        { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category.' },
        { name: 'type', in: 'query', schema: { type: 'string', enum: ['FULL_COURSE','CRASH_COURSE','TEST_SERIES','REVISION','NOTES_ONLY','QUIZ_ACCESS'] } },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search title, description, instructor.' },
        { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: {
          description: 'Paginated list of published courses.',
          content: { 'application/json': { schema: { type: 'object', properties: {
            success: { type: 'boolean' },
            data: { type: 'object', properties: {
              courses: { type: 'array', items: { type: 'object', properties: {
                id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                courseType: { type: 'string' },
                category: { type: 'string', nullable: true },
                instructor: { type: 'string', nullable: true },
                price: { type: 'number' },
                division: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, slug: { type: 'string' } } },
                _count: { type: 'object', properties: { modules: { type: 'integer' }, enrollments: { type: 'integer' } } },
              }}},
              pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, pages: { type: 'integer' } } },
            }},
          }}}},
        },
      },
    },
  },

  '/api/v1/courses/{id}': {
    get: {
      tags: ['Public Catalog'],
      summary: 'Get course details with full curriculum outline',
      description: [
        'Returns the full course detail including:',
        '- **Curriculum outline**: all modules and materials (title, type, sequence, duration — but **not** `objectUrl`)',
        '- **Upcoming class sessions**: next 5 scheduled classes (platform shown; meeting link excluded from public)',
        '- Enrollment count',
        '',
        'Unpublished courses return **404** for guests. Admins (with a valid token) can preview unpublished courses.',
        '',
        '**Security:** `objectUrl` (S3 content path) is intentionally excluded from this response.',
        'Content delivery is handled via a separate signed-URL endpoint requiring active enrollment.',
      ].join('\n'),
      security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Course detail with curriculum outline and upcoming sessions.' },
        400: { description: 'Invalid UUID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Course not found or not published.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // AUTH
  // ════════════════════════════════════════════════════════

  '/api/v1/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a new student account',
      description: 'Creates a new user account. Rate-limited to 10 requests / 15 min per IP.',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Account created successfully.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
          },
        },
        400: {
          description: 'Validation error (missing/invalid fields).',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } },
          },
        },
        409: {
          description: 'Email already registered.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        429: {
          description: 'Rate limit exceeded.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
      },
    },
  },

  '/api/v1/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login and obtain JWT tokens',
      description: 'Validates credentials and returns an **access token** (7d) and a **refresh token** (30d). Rate-limited to 10 requests / 15 min per IP.',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
        },
      },
      responses: {
        200: {
          description: 'Login successful.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
          },
        },
        400: {
          description: 'Validation error.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } },
          },
        },
        401: {
          description: 'Invalid email or password.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        429: {
          description: 'Rate limit exceeded.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
      },
    },
  },

  '/api/v1/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh the access token',
      description: 'Exchanges a valid refresh token for a new access token. Rejects tokens issued to soft-deleted users.',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } },
        },
      },
      responses: {
        200: {
          description: 'Tokens refreshed successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Tokens refreshed.' },
                },
              },
            },
          },
        },
        400: { description: 'Missing refresh token.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Invalid or expired refresh token.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Get the currently authenticated user',
      description: 'Returns the profile of the logged-in user. Requires a valid Bearer token.',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'User profile returned.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data:    { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
        401: { description: 'No token or invalid token.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/auth/google': {
    post: {
      tags: ['Auth'],
      summary: 'Continue with Google (OAuth 2.0)',
      description: [
        'Verifies a Google ID token issued by the frontend Google Sign-In SDK.',
        '',
        '**Two outcomes:**',
        '- **Existing user** — `200 Login successful.` Returns the user object and Learnify JWT pair.',
        '- **New user** — `201 Account created successfully.` Provisions a STUDENT account and returns the same payload.',
        '',
        '**Security:** Token audience is verified against `GOOGLE_CLIENT_ID` — tokens minted for any other app are rejected.',
        'Banned (`isDeleted: true`) accounts are blocked with `403` before any token is issued.',
        '',
        'Rate-limited to **10 requests / 15 min per IP** (shared with all auth endpoints).',
      ].join('\n'),
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/GoogleLoginRequest' } },
        },
      },
      responses: {
        200: {
          description: 'Existing user authenticated successfully.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        201: {
          description: 'New student account created and authenticated.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        400: {
          description: 'Validation error — tokenId missing or obviously malformed.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } },
        },
        401: {
          description: 'Google token invalid, expired, or audience-mismatched.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        403: {
          description: 'Account suspended (soft-deleted).',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        429: {
          description: 'Rate limit exceeded.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  },

  '/api/v1/auth/bootstrap': {
    post: {
      tags: ['Auth'],
      summary: 'Bootstrap first admin account (Self-disabling)',
      description: [
        'Creates the very first ADMIN account when you deploy the app to production.',
        '',
        '**⚠️ SELF-DISABLING ENDPOINT:**',
        '- This endpoint **only works if zero admins exist** in the database.',
        '- Once any admin is created (via this endpoint or manually), subsequent calls will return `403 Bootstrap disabled`.',
        '- This prevents accidental admin creation after initial setup.',
        '',
        '**Security:**',
        '- Protected by `X-Bootstrap-Secret` header (not JWT-based auth).',
        '- Set `ADMIN_BOOTSTRAP_SECRET` environment variable to a strong random value.',
        '- Remove or rotate the secret after initial deployment.',
        '- Rate-limited to **10 requests / 15 min per IP** (shared with all auth endpoints).',
        '',
        '**Use Case:**',
        '1. Deploy app to production.',
        '2. Make ONE POST request with the secret header.',
        '3. Store the returned credentials securely.',
        '4. Remove the secret from environment or rotate it.',
        '',
        '**Special Behavior:**',
        '- If the email already exists (e.g., a STUDENT), that account is **promoted** to ADMIN (returns 200).',
        '- Otherwise, a new ADMIN account is created (returns 201).',
      ].join('\n'),
      security: [],
      parameters: [
        {
          in: 'header',
          name: 'X-Bootstrap-Secret',
          required: true,
          schema: { type: 'string', example: 'your-strong-random-secret-here' },
          description: 'The bootstrap secret from your `ADMIN_BOOTSTRAP_SECRET` environment variable. Required for authentication.',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/BootstrapRequest' } },
        },
      },
      responses: {
        200: {
          description: 'Existing account promoted to ADMIN.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Existing account promoted to ADMIN.' },
                  data: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
        201: {
          description: 'First admin account created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'First admin account created. Bootstrap is now disabled.' },
                  data: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
        400: {
          description: 'Validation error — missing or invalid fields.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } },
        },
        403: {
          description: 'Invalid bootstrap secret OR bootstrap disabled (admin already exists).',
          content: { 
            'application/json': { 
              schema: { 
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { 
                    type: 'string', 
                    example: 'Bootstrap is disabled — an admin account already exists. Use POST /api/v1/admin/users instead.',
                  },
                },
              },
            } 
          },
        },
        429: {
          description: 'Rate limit exceeded.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        503: {
          description: 'Bootstrap not configured (ADMIN_BOOTSTRAP_SECRET not set).',
          content: { 
            'application/json': { 
              schema: { 
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Bootstrap is not configured on this server (ADMIN_BOOTSTRAP_SECRET not set).' },
                },
              },
            } 
          },
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // HEALTH
  // ════════════════════════════════════════════════════════

  '/api/v1/health': {
    get: {
      tags: ['Health'],
      summary: 'Server health check',
      description: 'Returns API version and database connectivity status.',
      responses: {
        200: {
          description: 'Server is healthy.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success:  { type: 'boolean', example: true },
                  status:   { type: 'string', example: 'ok' },
                  version:  { type: 'string', example: '1.0.0' },
                  database: { type: 'string', example: 'connected' },
                },
              },
            },
          },
        },
        503: { description: 'Database unreachable.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // COURSES — Sprint 4: content tree
  // ════════════════════════════════════════════════════════

  '/api/v1/courses/{courseId}/content': {
    get: {
      tags: ['Courses'],
      summary: 'Get full course content tree with progress',
      description: [
        'Returns all modules and materials for a course, annotated with',
        'the authenticated student\'s per-module and per-material progress.',
        '',
        '**Authorization:** The student must have an **ACTIVE** enrollment.',
        'Returns 403 if the enrollment is PAUSED or does not exist.',
        '',
        '**Note:** `objectUrl` (the S3 file path) is intentionally excluded.',
        'Request signed URLs from a separate secure endpoint.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'courseId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'UUID of the course to fetch content for.',
        },
      ],
      responses: {
        200: {
          description: 'Content tree returned successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      course: {
                        type: 'object',
                        properties: {
                          id:          { type: 'string', format: 'uuid' },
                          title:       { type: 'string', example: 'A-Level Biology' },
                          description: { type: 'string', nullable: true },
                          courseType:  { type: 'string', example: 'FULL_COURSE' },
                          instructor:  { type: 'string', nullable: true },
                        },
                      },
                      enrollment: {
                        type: 'object',
                        properties: {
                          id:              { type: 'string', format: 'uuid' },
                          status:          { type: 'string', example: 'ACTIVE' },
                          progressPercent: { type: 'integer', example: 35 },
                          enrolledAt:      { type: 'string', format: 'date-time' },
                        },
                      },
                      modules: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id:               { type: 'string', format: 'uuid' },
                            title:            { type: 'string' },
                            sequence:         { type: 'integer' },
                            requiredModuleId: { type: 'string', format: 'uuid', nullable: true },
                            progress: {
                              type: 'object',
                              properties: {
                                isUnlocked:  { type: 'boolean' },
                                isCompleted: { type: 'boolean' },
                                completedAt: { type: 'string', format: 'date-time', nullable: true },
                              },
                            },
                            materials: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id:           { type: 'string', format: 'uuid' },
                                  title:        { type: 'string' },
                                  materialType: { type: 'string', enum: ['NOTE', 'VIDEO', 'QUIZ'] },
                                  thumbnailUrl: { type: 'string', nullable: true },
                                  durationSec:  { type: 'integer', nullable: true },
                                  sequence:     { type: 'integer' },
                                  progress: {
                                    type: 'object',
                                    properties: {
                                      isCompleted: { type: 'boolean' },
                                      completedAt: { type: 'string', format: 'date-time', nullable: true },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid UUID for courseId.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'Not enrolled or enrollment is PAUSED.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // PROGRESS — Sprint 4: material complete write path
  // ════════════════════════════════════════════════════════

  '/api/v1/progress/material/{materialId}/complete': {
    post: {
      tags: ['Enrollments'],
      summary: 'Mark a material as completed',
      description: [
        'Idempotent — calling this endpoint multiple times for the same',
        'material produces the same result (no duplicate rows).',
        '',
        '**Event-Driven:** After upserting `MaterialProgress`, the API',
        'publishes a `MATERIAL_COMPLETED` event to the BullMQ progress queue.',
        'The background worker then handles module-unlock logic asynchronously.',
        '',
        'Returns **200 immediately** — does not wait for the worker to finish.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'materialId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'UUID of the material to mark as completed.',
        },
      ],
      responses: {
        200: {
          description: 'Material marked as complete. Module-unlock runs asynchronously.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Material marked as complete.' },
                  data: {
                    type: 'object',
                    properties: {
                      id:          { type: 'string', format: 'uuid' },
                      isCompleted: { type: 'boolean', example: true },
                      completedAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid materialId UUID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'No active enrollment for the course this material belongs to.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Material not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        429: { description: 'Rate limit exceeded (30 req/min).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // ADMIN — Sprint 5: Payment, Classes, Grade Sheets
  // ════════════════════════════════════════════════════════

  '/api/v1/admin/payments/{id}/verify': {
    put: {
      tags: ['Admin — Financials'],
      summary: 'Verify a student payment',
      description: [
        'Marks a `Payment` record as `VERIFIED` and publishes a `PAYMENT_VERIFIED`',
        'event to the BullMQ payment queue.',
        '',
        '**Event-Driven:** The enrollment status update (`→ ACTIVE`) is handled',
        'asynchronously by `payment.worker.js` — it does **not** block this response.',
        '',
        'Returns **200 immediately** after the DB update and queue publish.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID of the payment to verify.' },
      ],
      responses: {
        200: {
          description: 'Payment verified. Enrollment activation is queued.',
          content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, status: { type: 'string', example: 'VERIFIED' }, verifiedAt: { type: 'string', format: 'date-time' }, enrollmentId: { type: 'string', format: 'uuid' } } } } } } },
        },
        400: { description: 'Invalid UUID.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Payment not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/classes': {
    post: {
      tags: ['Admin — Operations'],
      summary: 'Create a live class session',
      description: 'Creates a new `ClassSession` for a course. `meetingLink` must be a valid HTTPS URL.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['courseId', 'scheduledAt', 'meetingLink'],
              properties: {
                courseId:    { type: 'string', format: 'uuid' },
                title:       { type: 'string', example: 'Week 3 — Cell Biology' },
                scheduledAt: { type: 'string', format: 'date-time', example: '2026-04-10T18:00:00Z' },
                meetingLink: { type: 'string', format: 'uri', example: 'https://zoom.us/j/123456789' },
                platform:    { type: 'string', enum: ['Zoom', 'Google Meet', 'Microsoft Teams'] },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Class session created.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, courseId: { type: 'string' }, title: { type: 'string' }, scheduledAt: { type: 'string', format: 'date-time' }, meetingLink: { type: 'string' }, platform: { type: 'string' } } } } } } } },
        400: { description: 'Validation error (invalid URL, missing fields).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/classes/{id}': {
    put: {
      tags: ['Admin — Operations'],
      summary: 'Update a live class session',
      description: 'Updates fields on an existing `ClassSession`. All fields are optional — only provided fields are updated.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title:       { type: 'string' },
                scheduledAt: { type: 'string', format: 'date-time' },
                meetingLink: { type: 'string', format: 'uri' },
                platform:    { type: 'string', enum: ['Zoom', 'Google Meet', 'Microsoft Teams'] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Class session updated.' },
        400: { description: 'Validation error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Class session not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/enrollments/{enrollmentId}/grades': {
    post: {
      tags: ['Admin — Operations'],
      summary: 'Upload a grade sheet PDF',
      description: [
        'Accepts a PDF file upload and stores a `GradeSheet` record linked to the enrollment.',
        '',
        '**Stateless:** The file buffer (from multer `memoryStorage`) is streamed directly',
        'to S3 — nothing is written to the server disk.',
        '',
        '**Form field:** `file` (PDF, max 10 MB). Optional `title` text field.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'enrollmentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file:  { type: 'string', format: 'binary', description: 'PDF file (max 10 MB).' },
                title: { type: 'string', description: 'Display name for the grade sheet.' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Grade sheet uploaded and record created.' },
        400: { description: 'No file provided or invalid file type.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Enrollment not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // ADMIN — Course Catalog Builder
  // ════════════════════════════════════════════════════════

  '/api/v1/admin/courses': {
    get: {
      tags: ['Admin — Courses'],
      summary: '[Admin] List all courses (published + unpublished)',
      description: 'Returns all courses regardless of publish status. Supports filtering by `divisionId`, `category`, `courseType`, `search`, and pagination.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'divisionId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'category',   in: 'query', schema: { type: 'string' } },
        { name: 'courseType', in: 'query', schema: { type: 'string', enum: ['FULL_COURSE','CRASH_COURSE','TEST_SERIES','REVISION','NOTES_ONLY','QUIZ_ACCESS'] } },
        { name: 'search',     in: 'query', schema: { type: 'string' } },
        { name: 'page',       in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit',      in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'Paginated list of all courses.' },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    post: {
      tags: ['Admin — Courses'],
      summary: '[Admin] Create a new course',
      description: 'Creates a new course. Set `isPublished: false` (default) to keep it in draft until the curriculum is ready.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['divisionId', 'title', 'courseType'],
              properties: {
                divisionId:    { type: 'string', format: 'uuid', description: 'UUID of the division this course belongs to.' },
                title:         { type: 'string', minLength: 3, maxLength: 200, example: 'USMLE Step 1 — Cardiology' },
                description:   { type: 'string', maxLength: 2000, nullable: true },
                courseType:    { type: 'string', enum: ['FULL_COURSE','CRASH_COURSE','TEST_SERIES','REVISION','NOTES_ONLY','QUIZ_ACCESS'] },
                category:      { type: 'string', nullable: true, example: 'Cardiology' },
                instructor:    { type: 'string', nullable: true, example: 'Dr. Ahmed Khan' },
                price:         { type: 'number', example: 5000 },
                classroomUrl:  { type: 'string', format: 'uri', nullable: true },
                isPublished:   { type: 'boolean', default: false },
              },
            },
            example: {
              divisionId: '00000000-0000-0000-0000-000000000001',
              title: 'USMLE Step 1 — Cardiology',
              courseType: 'FULL_COURSE',
              category: 'Cardiology',
              instructor: 'Dr. Ahmed Khan',
              price: 5000,
              isPublished: false,
            },
          },
        },
      },
      responses: {
        201: { description: 'Course created successfully.' },
        400: { description: 'Validation error or invalid divisionId.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/courses/{id}': {
    put: {
      tags: ['Admin — Courses'],
      summary: '[Admin] Update course details',
      description: 'Updates any field on an existing course. All fields are optional — only provided fields are updated. Use `isPublished: true` to publish a course.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Course UUID' },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title:         { type: 'string', example: 'Updated Course Title' },
                description:   { type: 'string', nullable: true },
                courseType:    { type: 'string', enum: ['FULL_COURSE','CRASH_COURSE','TEST_SERIES','REVISION','NOTES_ONLY','QUIZ_ACCESS'] },
                category:      { type: 'string', nullable: true },
                instructor:    { type: 'string', nullable: true },
                price:         { type: 'number', example: 6000 },
                classroomUrl:  { type: 'string', format: 'uri', nullable: true },
                isPublished:   { type: 'boolean', description: 'Set to true to publish the course.' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Course updated successfully.' },
        400: { description: 'Validation error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Course not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    delete: {
      tags: ['Admin — Courses'],
      summary: '[Admin] Delete a course',
      description: '**Cascades:** Deletes all related modules, materials, enrollments, and progress records automatically (Prisma `onDelete: Cascade`).',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Course deleted.' },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Course not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/courses/{id}/publish': {
    patch: {
      tags: ['Admin — Courses'],
      summary: '[Admin] Toggle course publish status',
      description: 'Flips `isPublished` between true and false. Returns the new status.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Publish status toggled.' },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Course not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // ADMIN — Module Builder
  // ════════════════════════════════════════════════════════

  '/api/v1/admin/courses/{courseId}/modules': {
    get: {
      tags: ['Admin — Curriculum'],
      summary: '[Admin] List all modules for a course',
      description: 'Returns all modules for a course, ordered by `sequence`, with their materials and lock-dependency info.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'courseId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'List of modules with materials.' },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    post: {
      tags: ['Admin — Courses'],
      summary: '[Admin] Create a module inside a course',
      description: [
        'Creates a new module. Use `requiredModuleId` to enable **Udemy-style sequential unlocking** — students must complete the referenced module before this one unlocks.',
        '',
        'Leave `requiredModuleId` null (or omit it) for a module that is unlocked from day one.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'courseId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'sequence'],
              properties: {
                title:            { type: 'string', minLength: 2, maxLength: 200, example: 'Module 1 — Anatomy of the Heart' },
                sequence:         { type: 'integer', minimum: 1, example: 1, description: 'Display order of this module within the course.' },
                requiredModuleId: { type: 'string', format: 'uuid', nullable: true, description: 'UUID of the module that must be completed before this one unlocks. Leave null for the first module.' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Module created.' },
        400: { description: 'Validation error (missing title/sequence, invalid UUID).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Course not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/modules/{id}': {
    put: {
      tags: ['Admin — Curriculum'],
      summary: '[Admin] Update a module',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title:            { type: 'string' },
                sequence:         { type: 'integer', minimum: 1 },
                requiredModuleId: { type: 'string', format: 'uuid', nullable: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Module updated.' },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Module not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    delete: {
      tags: ['Admin — Curriculum'],
      summary: '[Admin] Delete a module',
      description: '**Cascades:** Deletes all materials and progress records inside this module.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Module deleted.' },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Module not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // ADMIN — Material Builder
  // ════════════════════════════════════════════════════════

  '/api/v1/admin/modules/{moduleId}/materials': {
    post: {
      tags: ['Admin — Curriculum'],
      summary: '[Admin] Add a material to a module',
      description: [
        'Creates a new learning material inside a module.',
        '',
        '**objectUrl** — pass the S3 object key/URL returned by your frontend after a direct-to-S3 upload. Backend never handles the raw file.',
        '',
        '**durationSec** — only meaningful for `VIDEO` type; ignored for `NOTE` and `QUIZ`.',
        '',
        '**secureViewOnly** — set `true` (default) to prevent downloads. Students can only view content in-browser.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'moduleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'materialType'],
              properties: {
                title:          { type: 'string', minLength: 2, maxLength: 200, example: 'Lecture 1 — Cardiac Cycle' },
                materialType:   { type: 'string', enum: ['NOTE', 'VIDEO', 'QUIZ'], example: 'VIDEO' },
                sequence:       { type: 'integer', minimum: 0, default: 0 },
                secureViewOnly: { type: 'boolean', default: true, description: 'If true, content is view-only (no download).' },
                objectUrl:      { type: 'string', description: 'S3 object URL/key from the frontend direct-upload. Do not upload files via this endpoint.', example: 'courses/cardiology/module1/lecture1.mp4' },
                durationSec:    { type: 'integer', minimum: 1, nullable: true, description: 'Video duration in seconds. Only used for VIDEO type.', example: 1800 },
                thumbnailUrl:   { type: 'string', format: 'uri', nullable: true, description: 'Video thumbnail URL.', example: 'https://cdn.learnify.pk/thumbs/lecture1.jpg' },
              },
            },
            example: {
              title: 'Lecture 1 — Cardiac Cycle',
              materialType: 'VIDEO',
              sequence: 1,
              secureViewOnly: true,
              objectUrl: 'courses/cardiology/module1/lecture1.mp4',
              durationSec: 1800,
              thumbnailUrl: 'https://cdn.learnify.pk/thumbs/lecture1.jpg',
            },
          },
        },
      },
      responses: {
        201: { description: 'Material created.' },
        400: { description: 'Validation error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Module not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/materials/{id}': {
    put: {
      tags: ['Admin — Curriculum'],
      summary: '[Admin] Update a material',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title:          { type: 'string' },
                materialType:   { type: 'string', enum: ['NOTE', 'VIDEO', 'QUIZ'] },
                sequence:       { type: 'integer', minimum: 0 },
                secureViewOnly: { type: 'boolean' },
                objectUrl:      { type: 'string', nullable: true },
                durationSec:    { type: 'integer', minimum: 1, nullable: true },
                thumbnailUrl:   { type: 'string', format: 'uri', nullable: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Material updated.' },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Material not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    delete: {
      tags: ['Admin — Curriculum'],
      summary: '[Admin] Delete a material',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Material deleted.' },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Material not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // QUIZ — Sprint 7: Real-Time Quiz Engine (Redis + Pusher)
  // ════════════════════════════════════════════════════════

  '/api/v1/quiz/categories/{categoryId}/start': {
    post: {
      tags: ['Quiz'],
      summary: 'Start a new quiz attempt',
      description: 'Initializes a secure Redis session, starts the server-side timer, and broadcasts a quiz-started event via Pusher. This endpoint prepares the backend for real-time answer submission.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'categoryId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID of the quiz category to start' },
      ],
      responses: {
        200: {
          description: 'Quiz attempt started successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      attemptId: { type: 'string', format: 'uuid', description: 'The unique attempt ID for this session' },
                      categoryId: { type: 'string', format: 'uuid' },
                      totalQuestions: { type: 'integer', example: 50 },
                      timeLimit: { type: 'integer', example: 3600, description: 'Time limit in seconds' },
                      startedAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Validation error or invalid categoryId.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Quiz category not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/quiz/attempts/{attemptId}/answer': {
    post: {
      tags: ['Quiz'],
      summary: 'Submit a single answer (High-Concurrency)',
      description: 'Writes the selected answer directly to Redis cache for extreme speed. Does NOT hit PostgreSQL. Returns 200 OK instantly. Designed for high-concurrency bulk answer submissions during real-time quiz sessions.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'attemptId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID of the quiz attempt' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['questionId', 'selectedOption'],
              properties: {
                questionId: { type: 'string', format: 'uuid', description: 'UUID of the question being answered' },
                selectedOption: { type: 'string', minLength: 1, maxLength: 1, example: 'A', description: 'Selected option (e.g., A, B, C, D)' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Answer recorded successfully in cache.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Answer recorded' },
                },
              },
            },
          },
        },
        400: { description: 'Validation error (invalid questionId or selectedOption).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Quiz attempt or question not found, or session expired.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/quiz/attempts/{attemptId}/submit': {
    post: {
      tags: ['Quiz'],
      summary: 'Finish quiz and calculate score',
      description: 'The final flush endpoint. Pulls all answers from Redis, compares with the PostgreSQL answer key, calculates the final score, saves results to the database, clears the cache, and broadcasts leaderboard-updated event via Pusher.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'attemptId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID of the quiz attempt to finalize' },
      ],
      responses: {
        200: {
          description: 'Quiz submitted and scored successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      attemptId: { type: 'string', format: 'uuid' },
                      categoryId: { type: 'string', format: 'uuid' },
                      totalQuestions: { type: 'integer', example: 50 },
                      correctAnswers: { type: 'integer', example: 42 },
                      score: { type: 'number', example: 84.0, description: 'Percentage score' },
                      completedAt: { type: 'string', format: 'date-time' },
                      leaderboardPosition: { type: 'integer', example: 15, nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Validation error or session expired.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Quiz attempt not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // ADMIN — QUIZ MANAGEMENT
  // ════════════════════════════════════════════════════════

  '/api/v1/admin/quiz/categories': {
    get: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] List all quiz categories',
      description: 'Returns all quiz categories with their question counts.',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'List of quiz categories.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Anatomy' },
                        questionCount: { type: 'integer', example: 25 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    post: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Create a quiz category',
      description: 'Creates a new quiz category. Category name must be unique.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', minLength: 2, maxLength: 100, example: 'Pharmacology' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Quiz category created successfully.' },
        400: { description: 'Validation error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        409: { description: 'Category with this name already exists.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/quiz/categories/{id}': {
    put: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Update a quiz category',
      description: 'Updates a quiz category name. Name must be unique.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 2, maxLength: 100 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Quiz category updated.' },
        400: { description: 'Validation error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Category not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        409: { description: 'Category with this name already exists.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    delete: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Delete a quiz category',
      description: 'Deletes a quiz category and all its questions (cascade).',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Quiz category deleted.' },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Category not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/quiz/categories/{categoryId}/questions': {
    get: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] List questions in a category',
      description: 'Returns all questions belonging to a specific quiz category.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'categoryId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'List of questions.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        categoryId: { type: 'string', format: 'uuid' },
                        questionText: { type: 'string' },
                        optionA: { type: 'string' },
                        optionB: { type: 'string' },
                        optionC: { type: 'string' },
                        optionD: { type: 'string' },
                        correctOption: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                        explanation: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Category not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    post: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Add a single question to a category',
      description: 'Creates a new multiple-choice question. Exactly one option must be marked as correct.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'categoryId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption'],
              properties: {
                questionText: { type: 'string', minLength: 5, example: 'What is the normal resting heart rate for an adult?' },
                optionA: { type: 'string', example: '40-60 bpm' },
                optionB: { type: 'string', example: '60-100 bpm' },
                optionC: { type: 'string', example: '100-140 bpm' },
                optionD: { type: 'string', example: '140-180 bpm' },
                correctOption: { type: 'string', enum: ['A', 'B', 'C', 'D'], example: 'B' },
                explanation: { type: 'string', nullable: true, example: 'Normal adult resting heart rate is 60-100 bpm.' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Question added successfully.' },
        400: { description: 'Validation error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Category not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/quiz/categories/{categoryId}/questions/bulk': {
    post: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Bulk-add questions to a category',
      description: 'Creates multiple questions in a single transaction. All questions must be valid for the transaction to succeed.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'categoryId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['questions'],
              properties: {
                questions: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption'],
                    properties: {
                      questionText: { type: 'string', minLength: 5 },
                      optionA: { type: 'string' },
                      optionB: { type: 'string' },
                      optionC: { type: 'string' },
                      optionD: { type: 'string' },
                      correctOption: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                      explanation: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Questions added successfully.' },
        400: { description: 'Validation error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Category not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/quiz/questions/{id}': {
    put: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Update a quiz question',
      description: 'Updates an existing quiz question. All fields are optional.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                questionText: { type: 'string', minLength: 5 },
                optionA: { type: 'string' },
                optionB: { type: 'string' },
                optionC: { type: 'string' },
                optionD: { type: 'string' },
                correctOption: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                explanation: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Question updated.' },
        400: { description: 'Validation error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Question not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
    delete: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Delete a quiz question',
      description: 'Deletes a single quiz question.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Question deleted.' },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Question not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // DOCTORSQUIZZ — Named Exam Wrapper (Quiz model)
  // ════════════════════════════════════════════════════════

  '/api/v1/admin/quizzes/full': {
    post: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Create a full named exam (Quiz + MCQs in one request)',
      description: [
        'Atomically creates a **Quiz wrapper** and bulk-inserts all MCQs inside a single',
        'PostgreSQL transaction. If any question violates a constraint, the entire operation',
        'rolls back — no partial quiz is ever persisted.',
        '',
        '**Payload shape:**',
        '```json',
        '{',
        '  "title": "Anatomy Midterm 1",',
        '  "categoryId": "<uuid>",',
        '  "subject": "Osteology",',
        '  "questions": [',
        '    {',
        '      "questionText": "Which is the longest bone?",',
        '      "optionA": "Femur", "optionB": "Tibia",',
        '      "optionC": "Humerus", "optionD": "Fibula",',
        '      "correctOption": "A",',
        '      "explanation": "The femur is the longest bone."',
        '    }',
        '  ]',
        '}',
        '```',
        '',
        '**Security:** Requires `ADMIN` role. Validated by `createFullQuizValidation`.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'categoryId', 'questions'],
              properties: {
                title: { type: 'string', minLength: 3, maxLength: 200, example: 'Anatomy Midterm 1' },
                categoryId: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
                subject: { type: 'string', maxLength: 200, example: 'Osteology', nullable: true },
                questions: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption'],
                    properties: {
                      questionText:  { type: 'string', minLength: 5, example: 'Which is the longest bone in the body?' },
                      optionA:       { type: 'string', example: 'Femur' },
                      optionB:       { type: 'string', example: 'Tibia' },
                      optionC:       { type: 'string', example: 'Humerus' },
                      optionD:       { type: 'string', example: 'Fibula' },
                      correctOption: { type: 'string', enum: ['A', 'B', 'C', 'D'], example: 'A' },
                      explanation:   { type: 'string', nullable: true, example: 'The femur (thigh bone) is the longest.' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Quiz and all questions created atomically.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Quiz "Anatomy Midterm 1" created with 5 question(s).' },
                  data: {
                    type: 'object',
                    properties: {
                      id:          { type: 'string', format: 'uuid' },
                      title:       { type: 'string' },
                      categoryId:  { type: 'string', format: 'uuid' },
                      subject:     { type: 'string', nullable: true },
                      isPublished: { type: 'boolean', example: true },
                      createdAt:   { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Validation error — missing title, invalid UUID, or empty questions array.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Category not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/quizzes': {
    get: {
      tags: ['Quiz'],
      summary: 'Browse published named quizzes (DoctorsQuizz)',
      description: [
        'Returns all **published** `Quiz` wrappers for DoctorsQuizz students.',
        'Supports optional server-side filtering and full-text title search.',
        '',
        '**Filters (query params):**',
        '- `categoryId` — filter by category UUID',
        '- `subject` — exact match on subject string (case-sensitive)',
        '- `search` — case-insensitive partial match on quiz title',
        '',
        '**Authorization:** Requires a valid Bearer token + `doctorsQuizzEnabled` entitlement.',
        'Use `GET /api/v1/quiz/categories` first to obtain valid `categoryId` values.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by category UUID.' },
        { name: 'subject',    in: 'query', schema: { type: 'string' }, description: 'Exact match on subject (e.g. Osteology).' },
        { name: 'search',     in: 'query', schema: { type: 'string' }, description: 'Case-insensitive partial match on quiz title.' },
      ],
      responses: {
        200: {
          description: 'List of published quizzes matching the applied filters.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id:        { type: 'string', format: 'uuid' },
                        title:     { type: 'string', example: 'Anatomy Midterm 1' },
                        subject:   { type: 'string', nullable: true, example: 'Osteology' },
                        createdAt: { type: 'string', format: 'date-time' },
                        category:  { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string', example: 'Anatomy' } } },
                        _count:    { type: 'object', properties: { questions: { type: 'integer', example: 20 } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'DoctorsQuizz entitlement not active.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // DOCTORSQUIZZ — Student Exam Arena
  // ════════════════════════════════════════════════════════

  '/api/v1/quiz/quizzes/{quizId}/start': {
    post: {
      tags: ['Quiz'],
      summary: 'Start a named exam attempt (Exam Arena)',
      description: [
        'Creates a `QuizAttempt` record, seeds the Redis session, and returns the',
        'full set of shuffled questions for the named exam.',
        '',
        '**Anti-Cheat:**',
        '- `correctOption` and `explanation` are **never** returned while the attempt is active.',
        '- `durationSec` is sourced from the `Quiz` record — the client cannot',
        '  manipulate the exam timer by altering the response.',
        '',
        '**Authorization:** Requires a valid Bearer token + `doctorsQuizzEnabled` entitlement.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'quizId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'UUID of the published `Quiz` to attempt.',
        },
      ],
      responses: {
        201: {
          description: 'Exam started. Returns the attempt ID, authoritative timer, and sanitized questions.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Exam started. Good luck!' },
                  data: {
                    type: 'object',
                    properties: {
                      attemptId:      { type: 'string', format: 'uuid' },
                      quizId:         { type: 'string', format: 'uuid' },
                      quizTitle:      { type: 'string', example: 'Anatomy Midterm 1' },
                      categoryName:   { type: 'string', example: 'Anatomy' },
                      totalQuestions: { type: 'integer', example: 30 },
                      durationSec: {
                        type: 'integer',
                        example: 3600,
                        description: 'Server-authoritative exam timer in seconds. Sourced from the Quiz record — never trust a client-side value.',
                      },
                      questions: {
                        type: 'array',
                        description: 'Shuffled questions. `correctOption` and `explanation` are intentionally omitted.',
                        items: {
                          type: 'object',
                          properties: {
                            id:           { type: 'string', format: 'uuid' },
                            questionText: { type: 'string' },
                            optionA:      { type: 'string' },
                            optionB:      { type: 'string' },
                            optionC:      { type: 'string' },
                            optionD:      { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Exam has no questions.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'DoctorsQuizz entitlement not active, or exam not yet published.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Quiz not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        429: { description: 'Rate limit exceeded (20 req/min).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/quiz/attempts/{attemptId}/answer': {
    post: {
      tags: ['Quiz'],
      summary: 'Cache a single answer during an active exam (Exam Arena)',
      description: [
        'Saves one answer to the Redis session cache during an active attempt.',
        'Called once per question as the student progresses through the exam.',
        '',
        '**Exam Integrity:** Response is intentionally `{ success: true }` only.',
        'The server never reveals whether the selected answer is correct while the',
        'attempt is still in progress — correctness is computed only on finalization.',
        '',
        '**Anti-Forgery:** The `questionId` is verified to belong to the same `Quiz`',
        'as the attempt before caching.',
        '',
        '**Idempotent:** Re-submitting the same `questionId` overwrites the earlier',
        'cached answer — no duplicate `QuizAnswer` records are created.',
        '',
        '**Authorization:** Requires a valid Bearer token + `doctorsQuizzEnabled` entitlement.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'attemptId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'UUID of an active (not yet finalized) `QuizAttempt`.',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['questionId', 'selected'],
              properties: {
                questionId: {
                  type: 'string',
                  format: 'uuid',
                  example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
                  description: 'UUID of the question being answered.',
                },
                selected: {
                  type: 'string',
                  enum: ['A', 'B', 'C', 'D'],
                  example: 'B',
                  description: "The student's chosen option.",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Answer cached. No correctness signal is returned.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        400: { description: 'Attempt already finalized, or questionId does not belong to this quiz.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'Attempt belongs to a different user.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Attempt not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        429: { description: 'Rate limit exceeded (20 req/min).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // ADMIN — AI Quiz Extraction (Phase 1 upgrade)
  // ════════════════════════════════════════════════════════

  '/api/v1/admin/quizzes/extract': {
    post: {
      tags: ['Admin — Quiz'],
      summary: 'Extract MCQs from images using Gemini AI (multi-image)',
      description: [
        'Accepts **1–10 textbook page images** in a single `multipart/form-data` request.',
        'All images are passed to **Gemini 1.5 Flash** in one prompt, enabling',
        'cross-image context aggregation (e.g., a question that spans two pages).',
        '',
        'Returns a raw JSON array of extracted MCQs ready for the admin quiz form.',
        '',
        '**Form field name:** `images` (use `images` as the key for every file).',
        '',
        '**Authorization:** ADMIN role required.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['images'],
              properties: {
                images: {
                  type: 'array',
                  items: { type: 'string', format: 'binary' },
                  minItems: 1,
                  maxItems: 10,
                  description: 'Up to 10 image files (PNG, JPG, WEBP). Use the field name `images` for each file.',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'MCQs extracted successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title:         { type: 'string', example: 'Which bone forms the posterior part of the hard palate?' },
                        options:       { type: 'array', items: { type: 'string' }, example: ['A. Maxilla', 'B. Palatine', 'C. Vomer', 'D. Sphenoid'] },
                        correctOption: { type: 'integer', example: 1, description: 'Zero-based index: 0=A, 1=B, 2=C, 3=D' },
                        explanation:   { type: 'string', example: 'The horizontal plate of the palatine bone forms the posterior 1/3 of the hard palate.' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'No images uploaded.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        500: { description: 'Gemini API failure or invalid JSON response.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // ADMIN — Dashboard Activity Feed
  // ════════════════════════════════════════════════════════

  '/api/v1/admin/dashboard/activity': {
    get: {
      tags: ['Admin — Operations'],
      summary: 'Get aggregated system activity feed',
      description: [
        'Aggregates the 5 most recent platform events across two Prisma models',
        'in a single `Promise.all` call (no N+1 queries):',
        '',
        '- **User registrations** — latest 5 new STUDENT accounts',
        '- **QuizAttempts** — latest 5 started or completed attempts (with user + quiz names via `include`)',
        '',
        'Results are merged, sorted by timestamp descending, and sliced to the top 5.',
        '',
        '**Authorization:** ADMIN role required.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'Activity feed returned successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    maxItems: 5,
                    items: {
                      type: 'object',
                      properties: {
                        id:        { type: 'string', example: 'reg-a1b2c3d4' },
                        userName:  { type: 'string', example: 'Ahmed Khan' },
                        action:    { type: 'string', example: 'registered on the platform' },
                        type:      { type: 'string', enum: ['Registration', 'QuizStarted', 'QuizCompleted'] },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // ADMIN — System Audit Logs
  // ════════════════════════════════════════════════════════

  '/api/v1/admin/logs': {
    get: {
      tags: ['Admin — Operations'],
      summary: '[Admin] Paginated system audit logs',
      description: [
        'Returns a paginated, filterable list of events from the `system_logs` audit table.',
        '',
        '**Query params:**',
        '- `page`   — 1-based page index (default 1)',
        '- `limit`  — items per page (default 20, max 100)',
        '- `level`  — filter by log level: `INFO`, `WARN`, or `ERROR`',
        '- `action` — filter by machine-readable action key (exact match, e.g. `USER_REGISTERED`)',
        '',
        '**Authorization:** ADMIN role required.',
      ].join('\n'),
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'page',   in: 'query', schema: { type: 'integer', minimum: 1, default: 1 },  description: 'Page number (1-based).' },
        { name: 'limit',  in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, description: 'Items per page.' },
        { name: 'level',  in: 'query', schema: { type: 'string', enum: ['INFO', 'WARN', 'ERROR'] }, description: 'Filter by severity level.' },
        { name: 'action', in: 'query', schema: { type: 'string' }, description: 'Filter by action key (e.g. USER_REGISTERED).' },
      ],
      responses: {
        200: {
          description: 'Paginated audit logs returned.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      logs: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id:        { type: 'string', format: 'uuid' },
                            level:     { type: 'string', enum: ['INFO', 'WARN', 'ERROR'] },
                            action:    { type: 'string', example: 'USER_REGISTERED' },
                            message:   { type: 'string', example: 'New student Ahmed Khan registered' },
                            metadata:  { type: 'object', nullable: true },
                            userId:    { type: 'string', format: 'uuid', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            user: {
                              type: 'object',
                              nullable: true,
                              properties: {
                                id:       { type: 'string', format: 'uuid' },
                                fullName: { type: 'string', example: 'Ahmed Khan' },
                                email:    { type: 'string', example: 'ahmed@example.com' },
                              },
                            },
                          },
                        },
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          page:  { type: 'integer', example: 1 },
                          limit: { type: 'integer', example: 20 },
                          total: { type: 'integer', example: 142 },
                          pages: { type: 'integer', example: 8 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'ADMIN role required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },
  },

  '/api/v1/admin/quizzes': {
    get: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] List all quizzes',
      description: 'Returns a list of all quizzes with their category and question count. Supports pagination.',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'List of quizzes returned successfully.' },
        401: { description: 'Not authenticated.' },
        403: { description: 'Admin access required.' },
      },
    },
  },
  '/api/v1/admin/quizzes/{id}': {
    get: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Get quiz by ID',
      description: 'Returns a full quiz object with nested questions. Required for the Edit Quiz flow.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Quiz details returned.' },
        404: { description: 'Quiz not found.' },
      },
    },
    put: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Update full quiz',
      description: 'Updates quiz details and syncs questions (UPSERT logic).',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Quiz updated successfully.' },
      },
    },
  },
  '/api/v1/admin/quizzes/{id}/status': {
    patch: {
      tags: ['Admin — Quiz'],
      summary: '[Admin] Toggle quiz publish status',
      description: 'Quickly publishes or unpublishes a quiz.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                isPublished: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Status updated.' },
      },
    },
  },
};





// ── swagger-jsdoc options ─────────────────────────────────────

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Learnify LMS — REST API',
      version: '1.0.0',
      description: `
## Learnify Backend API

A dual-division Learning Management System serving **Foundation** and **MedEd** students.

### Authentication
All protected routes use **JWT Bearer tokens**.
1. Call **POST /api/v1/auth/login** with valid credentials.
2. Copy the \`accessToken\` from the response.
3. Click **Authorize** (🔒) at the top of this page and paste your token.

### Rate Limiting
Auth endpoints are limited to **10 requests per 15 minutes per IP** to prevent brute-force attacks.
      `.trim(),
      contact: {
        name: 'Learnify Engineering',
        email: 'dev@learnify.pk',
        url: 'https://learnify.pk',
      },
      license: { name: 'Private', url: 'https://learnify.pk' },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Local development server',
      },
      {
        url: 'https://api.learnify.pk',
        description: 'Production server',
      },
    ],
    // Global security: all routes can optionally use BearerAuth.
    // Override per-route with security: [] to mark a route as public.
    security: [{ BearerAuth: [] }],
tags: [
      { name: 'Public Catalog', description: 'Public course discovery — no authentication required' },
      { name: 'Health',         description: 'Server status and database connectivity' },
      { name: 'Auth',           description: 'Register, login, token refresh, and profile' },
      { name: 'Courses',        description: 'Student-facing: content tree, live class, classroom access' },
      { name: 'Enrollments',    description: 'Enroll in courses, track material and module progress' },
      { name: 'Payments',       description: 'Payment records and proof submission' },
      { name: 'Quiz',           description: 'DoctorsQuizz — categories, attempts, leaderboard' },
      { name: 'Workshops',      description: 'Workshop discovery and registration' },
      // 👇 NEW ADMIN TAGS REPLACING THE SINGLE "ADMIN" TAG
      { name: 'Admin — Courses',    description: 'Admin-only: Create, publish, and manage courses' },
      { name: 'Admin — Curriculum', description: 'Admin-only: Build modules and upload learning materials' },
      { name: 'Admin — Financials', description: 'Admin-only: Verify bank transfers and payments' },
      { name: 'Admin — Operations', description: 'Admin-only: Manage live class sessions and grade sheets' },
      { name: 'Admin — Quiz',       description: 'Admin-only: Manage DoctorsQuizz categories and questions' },
    ],
    paths,
    components,
  },
  // No JSDoc scanning — spec is defined fully above.
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
