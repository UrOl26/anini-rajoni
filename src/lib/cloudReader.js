// Reads family names from a mailbox label photo with Claude Haiku (Claude API).
// The image is sent once for reading and is not stored by the app.
// The API key lives only on Ana's phone (localStorage), never in the code.

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-5-5';

// USD per million tokens for prompts up to 100K tokens (Claude Haiku 5.5).
const PRICE_IN = 0.1;
const PRICE_OUT = 0.5;

const KEY_STORAGE = 'anini.apiKey';

export function getApiKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* storage unavailable */
  }
}

const SYSTEM_PROMPT = `You read name labels on residential mailboxes in Slovenia.
The image shows one mailbox label (printed, handwritten, engraved or embossed metal, stickers, possibly faded or reflective).
Return the FAMILY NAMES (surnames) on the label:
- One item per family name, spelled exactly as on the label, with correct Slovenian/Balkan letters (č, š, ž, ć, đ). Write them in normal capitalisation (Novak, not NOVAK).
- Keep hyphenated double surnames as one item ("Novak-Kranjc").
- If a first name is given with the surname, return only the surname. "Ana in Marko Novak" → ["Novak"].
- Leave out words such as "družina", "fam.", titles, apartment or house numbers, and company or advertising text.
- At most 5 items.
- If no family name is clearly readable, return an empty list. Never guess.`;

const SCHEMA = {
  type: 'object',
  properties: {
    names: { type: 'array', items: { type: 'string' } },
  },
  required: ['names'],
  additionalProperties: false,
};

export class CloudReaderError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // 'auth' | 'network' | 'busy' | 'other'
  }
}

/** Turns a canvas into base64 JPEG data (without the data: prefix). */
export function canvasToJpegBase64(canvas, quality = 0.8) {
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}

/**
 * Sends one label image and returns { names, ms, costUsd }.
 */
export async function readNames(base64Jpeg, apiKey, { signal } = {}) {
  const t0 = performance.now();
  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: SCHEMA },
        },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: base64Jpeg },
              },
              { type: 'text', text: 'Which family names are on this mailbox label?' },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new CloudReaderError('network', String(err));
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) throw new CloudReaderError('auth', body);
    if (res.status === 429 || res.status === 529 || res.status >= 500)
      throw new CloudReaderError('busy', body);
    throw new CloudReaderError('other', `${res.status} ${body}`);
  }

  const data = await res.json();
  const ms = performance.now() - t0;
  const text = data.content?.find((b) => b.type === 'text')?.text ?? '{"names":[]}';
  let names = [];
  try {
    names = JSON.parse(text).names ?? [];
  } catch {
    names = [];
  }
  names = names
    .map((n) => String(n).trim())
    .filter(Boolean)
    .slice(0, 5);

  const u = data.usage ?? {};
  const costUsd =
    ((u.input_tokens ?? 0) * PRICE_IN + (u.output_tokens ?? 0) * PRICE_OUT) / 1_000_000;

  return { names, ms, costUsd };
}
