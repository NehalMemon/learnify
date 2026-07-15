// ─── Multer Local Disk Storage Middleware ───────────────────
// Configures multer to store uploaded files on local disk.
//
// Architecture Note:
//   This is a temporary solution for local development. In production,
//   this will be replaced with direct-to-cloud uploads (Cloudflare R2 / AWS S3).
//   The storage service abstraction (src/services/storage.service.js) handles
//   the migration path — this middleware only handles the initial file capture.
//
// Security:
//   - Files are stored in public/uploads/materials/
//   - Max file size: 25MB
//   - Unique filenames prevent collisions

'use strict';

const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Ensure upload directory exists at module load time
const uploadDir = path.join(__dirname, '../../public/uploads/materials');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure disk storage with unique filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: timestamp-random-ext
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File filter: only allow standard image/document types.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
};

// Create multer instance with limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
});

module.exports = upload;
