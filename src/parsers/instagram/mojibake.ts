/**
 * Meta's JSON exports store UTF-8 text as if each byte were a separate Latin-1 character:
 *   "ð\u009f\u0098\u0082"  ->  "ðŸ˜‚"  (should be 😂)
 *   "à¤¹"        ->  "à¤¹"  (should be ह)
 * If a string only contains code points ≤ 0xFF and at least one ≥ 0x80, re-read those as bytes.
 * Genuine Latin-1 text ("café") is not valid UTF-8 when re-read, so it is left untouched.
 */
const strict = new TextDecoder('utf-8', { fatal: true });

export function fixMojibake(s: string): string {
  let high = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 0xff) return s;
    if (c >= 0x80) high = true;
  }
  if (!high) return s;
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  try {
    return strict.decode(bytes);
  } catch {
    return s;
  }
}

/** JSON.parse that fixes every string value (and key) on the way in. */
export function parseMetaJson(text: string): unknown {
  return JSON.parse(text, (_key, value) => (typeof value === 'string' ? fixMojibake(value) : value));
}
