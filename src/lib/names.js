// Helpers for family names read from mailbox labels (NAVODILA 5.3).

export const MAX_NAMES_PER_MAILBOX = 5;

// Letters that can appear in a name, plus the separators we split on.
export const NAME_CHAR_WHITELIST =
  'ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWXYZŽabcčćdđefghijklmnopqrsštuvwxyzžÄÖÜäöüß' + " -/,&.'";

/**
 * Splits one label into separate names.
 * Separators: "/", ",", "&", the word "in", and new lines.
 * A hyphen is NOT a separator: "Novak-Kranjc" stays one name.
 */
export function splitNames(text) {
  return text
    .replace(/\s+in\s+/gi, '\n')
    .split(/[\/,&\n\r]+/)
    .map((s) =>
      s
        .replace(/\s*-\s*/g, '-') // "Novak - Kranjc" → "Novak-Kranjc"
        .replace(/[^\p{L}\s'-]/gu, '') // drop stray dots and other marks
        .replace(/\s+/g, ' ')
        .replace(/^[-'\s]+|[-'\s]+$/g, '')
        .trim(),
    )
    .filter((s) => (s.match(/\p{L}/gu) || []).length >= 2);
}

/** Lowercase and strip č, š, ž etc., for comparing names. */
export function normalizeName(text) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
