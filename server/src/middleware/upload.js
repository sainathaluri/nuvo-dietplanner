import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
