import { randomBytes, createHash, createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const token = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('hex');
export const secureEqual = (a, b) => timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
export const privateKey = (secret, value) => createHmac('sha256', secret).update(value).digest('hex');
export function validPassword(value) {
  return typeof value === 'string' && value.trim().length >= 12 && value.length <= 128;
}
export async function hashPassword(value) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(value, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(value, encoded) {
  if (!encoded || typeof value !== 'string' || value.length > 128) return false;
  const [method, salt, hex] = encoded.split('$');
  if (method !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(hex)) return false;
  const hash = await scrypt(value, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(hash, Buffer.from(hex, 'hex'));
}
