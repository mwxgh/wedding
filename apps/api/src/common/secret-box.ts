import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

import { config } from '../config';

/**
 * Encrypts settings stored in the database (e.g. payment keys) with
 * AES-256-GCM. Format: `v1.<iv>.<tag>.<ciphertext>`, base64url parts.
 * Losing or changing SETTINGS_SECRET makes stored secrets unreadable; they
 * must then be entered again in the admin.
 */
const key = () => createHash('sha256').update(config.settingsSecret()).digest();

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    data.toString('base64url'),
  ].join('.');
}

export function open(sealed: string): string {
  const [version, iv, tag, data] = sealed.split('.');
  if (version !== 'v1' || !iv || !tag || !data)
    throw new Error('Unknown secret format');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** `••••abcd`: enough to recognise a key without revealing it. */
export const hint = (secret: string) =>
  secret.length > 8 ? `••••${secret.slice(-4)}` : '••••';
