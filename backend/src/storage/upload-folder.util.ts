import { BadRequestException } from '@nestjs/common';

const DEFAULT_FOLDER = 'foods';

/** Allowed logical folders (e.g. menu, foods). Safe path segment only. */
export function sanitizeUploadFolder(raw: string | undefined): string {
  const s = String(raw ?? DEFAULT_FOLDER)
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
  if (s.length === 0) {
    return DEFAULT_FOLDER;
  }
  if (!/^[a-z0-9_-]{1,32}$/.test(s)) {
    throw new BadRequestException(
      'Invalid folder: use 1–32 chars (letters, digits, _ or -), e.g. menu or foods',
    );
  }
  if (s === 'uploads' || s === '.' || s === '..') {
    throw new BadRequestException('Invalid folder name');
  }
  return s;
}
