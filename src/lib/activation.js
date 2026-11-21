// Scanner activation with a QR code.
// The QR code holds one person's API key (and optionally their name), e.g.
//   anini-rajoni:aktivacija?k=sk-ant-…&n=Ana
// It is made on /aktivacija/ (on the owner's own device, nothing is sent or saved there)
// and scanned inside the app, so the key lands in the app's own storage.

const PREFIX = 'anini-rajoni:aktivacija?';
const MODELS_URL = 'https://api.anthropic.com/v1/models?limit=1';

/** Builds the text for the QR code. */
export function buildPayload(key, name = '') {
  const p = new URLSearchParams({ k: key.trim() });
  if (name.trim()) p.set('n', name.trim());
  return PREFIX + p.toString();
}

/** Reads a scanned QR text. Returns { key, name } or null if it isn't an activation code. */
export function parsePayload(text) {
  if (typeof text !== 'string' || !text.startsWith(PREFIX)) return null;
  const p = new URLSearchParams(text.slice(PREFIX.length));
  const key = (p.get('k') || '').trim();
  if (!looksLikeKey(key)) return null;
  return { key, name: (p.get('n') || '').trim() };
}

export const looksLikeKey = (key) => /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key);

/**
 * Checks the key with one free request (lists models; no reading, no cost).
 * Returns 'ok' | 'invalid' | 'unknown' (no internet or server problem: can't tell).
 */
export async function verifyKey(key) {
  try {
    const res = await fetch(MODELS_URL, {
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });
    if (res.ok) return 'ok';
    if (res.status === 401 || res.status === 403) return 'invalid';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
