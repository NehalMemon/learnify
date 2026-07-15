// ─── Entitlements Middleware ─────────────────────────────────
// Guards routes based on per-service access flags embedded in JWT payloads.

const forbid = (res, message) =>
  res.status(403).json({ success: false, message });

const requireLearnify = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const allow = req.user.role === 'ADMIN' || req.user.entitlements?.learnify === true;
  if (!allow) return forbid(res, 'Learnify access required.');

  return next();
};

const requireDoctorsQuizz = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const allow = req.user.role === 'ADMIN' || req.user.entitlements?.doctorsQuizz === true;
  if (!allow) return forbid(res, 'DoctorsQuizz access required.');

  return next();
};

module.exports = { requireLearnify, requireDoctorsQuizz };
