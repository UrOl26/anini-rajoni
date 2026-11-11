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

/** Sends one image with instructions and a JSON schema; returns { result, ms, costUsd }. */
async function ask(base64Jpeg, apiKey, { system, schema, text, maxTokens = 200, signal }) {
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
        max_tokens: maxTokens,
        system,
        output_config: { effort: 'low', format: { type: 'json_schema', schema } },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Jpeg } },
              { type: 'text', text },
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
  const out = data.content?.find((b) => b.type === 'text')?.text ?? '{}';
  let result = {};
  try {
    result = JSON.parse(out);
  } catch {
    result = {};
  }
  const u = data.usage ?? {};
  const costUsd =
    ((u.input_tokens ?? 0) * PRICE_IN + (u.output_tokens ?? 0) * PRICE_OUT) / 1_000_000;
  return { result, ms, costUsd };
}

const cleanList = (list, max) =>
  (Array.isArray(list) ? list : [])
    .map((n) => String(n).trim())
    .filter(Boolean)
    .slice(0, max);

/** Reads the family names on one mailbox label. Returns { names, ms, costUsd }. */
export async function readNames(base64Jpeg, apiKey, { signal } = {}) {
  const { result, ms, costUsd } = await ask(base64Jpeg, apiKey, {
    system: SYSTEM_PROMPT,
    schema: SCHEMA,
    text: 'Which family names are on this mailbox label?',
    signal,
  });
  return { names: cleanList(result.names, 5), ms, costUsd };
}

const LETTER_PROMPT = `You read the recipient on a letter or parcel in Slovenia.
You get a list of family names that exist on this mailbox wall.
- "matches": the names FROM THE LIST that are the recipient's family name. Use the list spelling exactly. Ignore differences in capital letters, č/š/ž and small misreadings. Empty if none fits.
- "words": every word on the envelope that could be the recipient's family name (not street, town, post code, sender, or words like "ga.", "g.", "družina"), spelled exactly with č, š, ž, in normal capitalisation. Most likely first. At most 8.`;

const LETTER_SCHEMA = {
  type: 'object',
  properties: {
    matches: { type: 'array', items: { type: 'string' } },
    words: { type: 'array', items: { type: 'string' } },
  },
  required: ['matches', 'words'],
  additionalProperties: false,
};

/** Reads the recipient on a letter and matches it to the names on the wall. */
export async function readLetter(base64Jpeg, apiKey, wallNames, { signal } = {}) {
  const { result } = await ask(base64Jpeg, apiKey, {
    system: LETTER_PROMPT,
    schema: LETTER_SCHEMA,
    text: `Names on this wall: ${JSON.stringify(wallNames)}\nWho is this letter for?`,
    maxTokens: 300,
    signal,
  });
  const allowed = new Set(wallNames);
  return {
    matches: cleanList(result.matches, 10).filter((n) => allowed.has(n)),
    words: cleanList(result.words, 8),
  };
}

const ADDRESS_PROMPT = `You read a street address in Slovenia from a house number sign or a letter.
Return it as "<street> <house number>", for example "Celovška cesta 12" or "Trg OF 7a". Use correct č, š, ž and normal capitalisation. Leave out post code, town and names. If an entrance is shown (vhod A), add ", vhod A". If no address is readable, return an empty string.`;

const ADDRESS_SCHEMA = {
  type: 'object',
  properties: { address: { type: 'string' } },
  required: ['address'],
  additionalProperties: false,
};

/** Reads a street address. Returns '' if none was found. */
export async function readAddress(base64Jpeg, apiKey, { signal } = {}) {
  const { result } = await ask(base64Jpeg, apiKey, {
    system: ADDRESS_PROMPT,
    schema: ADDRESS_SCHEMA,
    text: 'What is the address?',
    signal,
  });
  return String(result.address ?? '').trim();
}
