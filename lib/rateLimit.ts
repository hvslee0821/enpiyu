
const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS_VERIFY = 15 * 60 * 1000; // 15 min
const MAX_VERIFY = 15; // attempts per IP per window
const WINDOW_MS_GENERATE = 60 * 1000; // 1 min
const MAX_GENERATE = 5;
const WINDOW_MS_CARD = 60 * 1000; // 1 min
const MAX_CARD_SIGN = 10;
const MAX_CARD_VALIDATE = 30;

function getClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) return realIp.trim();
  return 'unknown';
}

function checkLimit(
  key: string,
  windowMs: number,
  max: number,
  prefix: string
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entryKey = `${prefix}:${key}`;
  let entry = store.get(entryKey);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(entryKey, entry);
    return { allowed: true };
  }
  if (entry.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

// Clean old entries periodically
function prune() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.resetAt) store.delete(k);
  }
}
if (typeof setInterval !== 'undefined') {
  setInterval(prune, 60 * 1000);
}

export function rateLimitVerify(request: Request): { allowed: boolean; retryAfter?: number } {
  return checkLimit(getClientKey(request), WINDOW_MS_VERIFY, MAX_VERIFY, 'v');
}

export function rateLimitGenerate(request: Request): { allowed: boolean; retryAfter?: number } {
  return checkLimit(getClientKey(request), WINDOW_MS_GENERATE, MAX_GENERATE, 'g');
}

export function rateLimitCardSign(request: Request): { allowed: boolean; retryAfter?: number } {
  return checkLimit(getClientKey(request), WINDOW_MS_CARD, MAX_CARD_SIGN, 'cs');
}

export function rateLimitCardValidate(request: Request): { allowed: boolean; retryAfter?: number } {
  return checkLimit(getClientKey(request), WINDOW_MS_CARD, MAX_CARD_VALIDATE, 'cv');
}
