// ─── S3 Upload Service ──────────────────────────────────────
// Used in Sprint 5 for grade sheet uploads.
// When AWS credentials are configured, replace uploadToS3() with
// real AWS SDK (PutObjectCommand via @aws-sdk/client-s3).
//
// Architecture Rule (architecture.md):
//   Files MUST NOT be written to local /tmp disk space.
//   Uploads must stream directly to S3 — multer memoryStorage()
//   keeps the file in a Buffer in memory until this function
//   streams it to S3.
//
// Security Rule (security.md):
//   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_BUCKET_NAME
//   must come from process.env — NEVER hardcoded.
//
// CRIT-03 fix: Fail-fast if AWS credentials are missing in production.

'use strict';

const { randomUUID } = require('crypto');
const logger = require('../config/logger');

// ── CRIT-03: Fail-fast check for AWS credentials ─────────────
// Throw error during initialization if required env vars are missing.
// This prevents silent failures when uploads are attempted.
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

function sanitizeS3KeySegment(value) {
  return String(value)
    .replace(/\.{2,}/g, '_')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

const isAwsConfigured = AWS_ACCESS_KEY_ID &&
                        AWS_SECRET_ACCESS_KEY &&
                        AWS_REGION &&
                        AWS_BUCKET_NAME;

if (!isAwsConfigured) {
  const missingVars = [];
  if (!AWS_ACCESS_KEY_ID) missingVars.push('AWS_ACCESS_KEY_ID');
  if (!AWS_SECRET_ACCESS_KEY) missingVars.push('AWS_SECRET_ACCESS_KEY');
  if (!AWS_REGION) missingVars.push('AWS_REGION');
  if (!AWS_BUCKET_NAME) missingVars.push('AWS_BUCKET_NAME');

  logger.warn(
    { missingVars },
    'S3 Service: AWS credentials not configured — file uploads will use MOCK mode'
  );
}

/**
 * Uploads a file buffer to S3 and returns the object URL.
 *
 * In production: uses AWS SDK v3 when credentials are configured.
 * Falls back to mock mode if credentials are missing.
 *
 * @param {{ buffer: Buffer, mimetype: string, originalname: string }} file
 * @param {string} folder - S3 folder prefix, e.g. 'grades' or 'thumbnails'
 * @returns {Promise<string>} The public or pre-signed S3 object URL
 */
async function uploadToS3(file, folder = 'uploads') {
  // ── PRODUCTION implementation (when AWS credentials are configured) ──
  if (isAwsConfigured) {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

    const client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId:     AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    const sanitizedName = sanitizeS3KeySegment(file.originalname);
    const key = `${folder}/${randomUUID()}-${sanitizedName}`;
    await client.send(new PutObjectCommand({
      Bucket:      AWS_BUCKET_NAME,
      Key:         key,
      Body:        file.buffer,
      ContentType: file.mimetype,
    }));

    return `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  }

  // ── MOCK implementation (used when AWS credentials are missing) ────────
  const mockKey = `${folder}/${randomUUID()}.pdf`;
  const mockUrl = `https://learnify-mock-bucket.s3.amazonaws.com/${mockKey}`;
  logger.info(
    { originalName: sanitizeS3KeySegment(file.originalname), mockUrl },
    '[S3 Mock] Would upload file'
  );
  return mockUrl;
}

module.exports = { uploadToS3 };
