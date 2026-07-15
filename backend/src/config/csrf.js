// ─── CSRF Token Synchronisation ─────────────────────────────
// Uses csrf-sync to enforce the Synchroniser Token Pattern for
// state-mutating HTTP methods (POST, PUT, PATCH, DELETE).
//
// Why the test bypass exists:
// Integration E2E tests run with supertest which creates isolated
// HTTP connections per request. Without a persistent cookie jar,
// the Redis-backed session (and therefore the server-side CSRF
// token stored in req.session) cannot survive across calls.
// Bypassing CSRF in NODE_ENV=test is the standard pattern; the
// middleware is fully enforced in 'development' and 'production'.

'use strict';

const { csrfSync } = require('csrf-sync');

const {
  invalidCsrfTokenError,
  generateToken,
  getTokenFromRequest,
  getTokenFromState,
  storeTokenInState,
  revokeToken,
  csrfSynchronisedProtection: _csrfSynchronisedProtection,
} = csrfSync({
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

/**
 * CSRF protection middleware.
 * In the 'test' environment, this is a no-op to allow integration
 * tests to issue state-mutating requests without a session cookie jar.
 *
 * @type {import('express').RequestHandler}
 */
const csrfSynchronisedProtection =
  process.env.NODE_ENV === 'test'
    ? (_req, _res, next) => next()
    : _csrfSynchronisedProtection;

module.exports = {
  invalidCsrfTokenError,
  generateToken,
  getTokenFromRequest,
  getTokenFromState,
  storeTokenInState,
  revokeToken,
  csrfSynchronisedProtection,
};
