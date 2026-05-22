import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.CARD_SIGNING_SECRET || '';
const SIGN_TOKEN_TTL_MS = 60 * 1000; // 1 min

export interface CardPayload {
  text1: string;
  text2: string;
  text3: string;
  text4: string;
  text5: string;
  text6: string;
  text7: string;
  text8: string;
  uploadedImage: string | null;
  userName: string;
}

function canonicalPayload(payload: CardPayload): string {
  const keys = Object.keys(payload).sort();
  const obj: Record<string, string | null> = {};
  for (const k of keys) {
    obj[k] = payload[k as keyof CardPayload] ?? null;
  }
  return JSON.stringify(obj);
}

export function signPayload(payload: CardPayload): string {
  if (!SECRET) throw new Error('CARD_SIGNING_SECRET is not set');
  const canonical = canonicalPayload(payload);
  return createHmac('sha256', SECRET).update(canonical).digest('hex');
}

export function verifySignature(payload: CardPayload, signature: string): boolean {
  if (!SECRET || !signature) return false;
  try {
    const expected = signPayload(payload);
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

export function createSignToken(): string {
  if (!SECRET) throw new Error('CARD_SIGNING_SECRET is not set');
  const exp = String(Date.now() + SIGN_TOKEN_TTL_MS);
  const mac = createHmac('sha256', SECRET).update(exp).digest('base64url');
  return `${exp}.${mac}`;
}

export function verifySignToken(token: string): boolean {
  if (!SECRET || !token) return false;
  const [expStr, mac] = token.split('.');
  if (!expStr || !mac) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = createHmac('sha256', SECRET).update(expStr).digest('base64url');
  try {
    if (expected.length !== mac.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
  } catch {
    return false;
  }
}
