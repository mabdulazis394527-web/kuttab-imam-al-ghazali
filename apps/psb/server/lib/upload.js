import multer from 'multer';
import { config } from './config.js';
import { EXT } from './storage.js';

// Berkas ditahan di memori lalu disimpan lewat lib/storage.js (Supabase Storage / disk lokal).
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    const e = new Error('Format berkas harus JPG, PNG, WEBP, atau PDF.'); e.status = 400; cb(e);
  },
});
