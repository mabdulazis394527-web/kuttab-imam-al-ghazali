import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { UPLOAD_DIR, config } from './config.js';

const ALLOWED = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + ALLOWED[file.mimetype]),
});

export const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    const e = new Error('Format berkas harus JPG, PNG, WEBP, atau PDF.'); e.status = 400; cb(e);
  },
});

export const uploadPath = (name) => path.join(UPLOAD_DIR, path.basename(name));
