// ─── Local File Storage Service ─────────────────────────────
// Abstraction layer for file storage operations.
//
// Current Implementation: Local disk storage
// Future Migration: Cloudflare R2 / AWS S3
//
// Architecture:
//   This service provides a clean interface for file operations.
//   When migrating to cloud storage, only this file needs to change —
//   controllers and routes remain untouched.
//
// Methods:
//   - handleUpload(file): Store file and return URL path
//   - deleteFile(fileUrl): Remove file from storage
//   - getAbsolutePath(fileUrl): Resolve relative URL to absolute path

'use strict';

const fs   = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');

// Base directory for uploaded files — using centralized path.resolve to prevent silent failures
const UPLOADS_BASE_DIR = path.resolve(__dirname, '../public/uploads');

/**
 * Handles file upload and returns the relative URL path.
 *
 * @param {Express.Multer.File} file - The uploaded file object from multer
 * @returns {string} Relative URL path (e.g., '/uploads/materials/123456.mp4')
 *
 * @todo Future: Replace with Cloudflare R2 upload logic
 *   - Upload file.buffer to R2 bucket
 *   - Return CDN URL or R2 public URL
 */
function handleUpload(file) {
  if (!file) {
    return null;
  }

  // Construct relative URL path
  // File is already saved to disk by multer, we just return the path
  const relativePath = `/uploads/materials/${file.filename}`;
  
  return relativePath;
}

/**
 * Deletes a file from storage given its URL path.
 *
 * @param {string} fileUrl - Relative URL path (e.g., '/uploads/materials/123456.mp4')
 * @returns {boolean} True if deleted successfully, false if file didn't exist
 *
 * @todo Future: Replace with Cloudflare R2 deleteObject logic
 */
async function deleteFile(fileUrl) {
  if (!fileUrl) {
    return false;
  }

  try {
    // Convert URL path to absolute filesystem path
    const absolutePath = getAbsolutePath(fileUrl);
    
    // Use async fs to prevent blocking the event loop
    try {
      await fsPromises.access(absolutePath);
      await fsPromises.unlink(absolutePath);
      return true;
    } catch {
      // File doesn't exist
      return false;
    }
  } catch (error) {
    logger.error(
      { err: error, fileUrl },
      '[StorageService] Failed to delete file'
    );
    return false;
  }
}

/**
 * Resolves a relative URL path to an absolute filesystem path.
 *
 * @param {string} fileUrl - Relative URL path (e.g., '/uploads/materials/123456.mp4')
 * @returns {string} Absolute filesystem path
 */
function getAbsolutePath(fileUrl) {
  if (!fileUrl) {
    return null;
  }

  const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
  const baseDir = path.resolve(UPLOADS_BASE_DIR);
  const absolutePath = path.resolve(baseDir, relativePath);
  const baseDirPrefix = baseDir.endsWith(path.sep) ? baseDir : `${baseDir}${path.sep}`;

  if (absolutePath !== baseDir && !absolutePath.startsWith(baseDirPrefix)) {
    const forbiddenError = new Error('Forbidden: Invalid file path.');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  return absolutePath;
}

/**
 * Gets the absolute filesystem path for the uploads directory.
 * Useful for admin operations or bulk file management.
 *
 * @returns {string} Absolute path to uploads base directory
 */
function getUploadsBaseDir() {
  return UPLOADS_BASE_DIR;
}

module.exports = {
  handleUpload,
  deleteFile,
  getAbsolutePath,
  getUploadsBaseDir,
};
