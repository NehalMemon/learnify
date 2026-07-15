// ─── Pusher Server Client ─────────────────────────────────────
// Initialises the Pusher server SDK singleton for triggering
// real-time events from the backend.
//
// Channels used by DoctorsQuizz:
//   private-quiz-<attemptId>  →  quiz-started
//   public-leaderboard        →  leaderboard-updated
//
// Env vars required (validated at startup via checkEnv in server.js):
//   PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER

'use strict';

const Pusher = require('pusher');

// Singleton — instantiated once at module load time.
// If any required env var is missing, server.js checkEnv() will
// have already exited before this module is evaluated in production.
const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
});

module.exports = pusher;
