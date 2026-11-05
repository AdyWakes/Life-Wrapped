/**
 * Regexes and phrase lists for WhatsApp exports.
 *
 * WhatsApp has no documented export format, and it varies by OS, app version, and phone locale.
 * The line header below accepts every variant we know of:
 *
 *   Android:  31/12/23, 23:59 - Name: text          12/31/23, 11:59 PM - Name: text
 *             31.12.2023, 23:59 - Name: text        2023-12-31, 23:59 - Name: text
 *             31/12/2023 23:59 - Name: text (no comma)
 *   iOS:      [31/12/23, 23:59:59] Name: text       [12/31/23, 11:59:59 PM] Name: text
 *             ‎[31/12/23, 23:59:59] Name: ‎image omitted   (leading U+200E marks)
 *   12h variants: "PM", "pm", "p.m.", "p. m.", with normal, no-break or narrow no-break spaces (U+202F).
 */

/** Invisible direction / formatting marks WhatsApp sprinkles into exports. */
export const INVISIBLE = /[‎‏‪-‮⁦-⁩﻿]/g;
const INV = '[\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]*';

export const HEADER_RE = new RegExp(
  '^' +
    INV +
    '(\\[)?' + // 1: opening bracket (iOS)
    '\\s*(\\d{1,4})[\\/.\\-](\\d{1,2})[\\/.\\-](\\d{1,4})\\.?' + // 2,3,4: date parts
    ',?\\s+' +
    '(\\d{1,2})[:.](\\d{2})(?:[:.](\\d{2}))?' + // 5,6,7: hh mm ss
    '(?:\\s*([AaPp])\\.?\\s?[Mm]\\.?)?' + // 8: am/pm marker
    '\\s*' +
    '(\\]\\s*|[-\\u2013\\u2014]\\s+|:\\s+)' + // 9: separator  "] "  " - "  ": "
    INV +
    '([\\s\\S]*)$', // 10: rest
);

/** Media placeholders (EN + common locales). Tested against text with invisible marks stripped. */
export const MEDIA_PATTERNS: RegExp[] = [
  /^<?\s*media omitted\s*>?$/i, // Android EN "<Media omitted>"
  /^<[^>]{0,40}(omit|omitid|oculta|ausgeschlossen|weggelassen|omis|omess|weggelaten|pominięt|опущ|हटा|छोड़)[^>]{0,40}>$/i,
  /^(image|video|audio|sticker|gif|document|photo|contact card|voice message|view once (photo|video|message))\s+omitted$/i, // iOS EN
  /^(imagen|video|audio|sticker|gif|documento|foto)\s+omitid[oa]$/i,
  /^(bild|video|audio|sticker|gif|dokument)\s+weggelassen$/i,
  /^(image|vidéo|audio|autocollant|gif|document)\s+absente?$/i,
  /^(immagine|video|audio|sticker|gif|documento)\s+omess[oa]$/i,
  /^<attached:\s[^>]+>$/i, // iOS with media: <attached: 00000012-PHOTO-2023-12-31-23-59-59.jpg>
  /^\S+\.\w{2,5}\s+\(file attached\)/i, // Android with media: IMG-2023...jpg (file attached)
  /^\S+\.\w{2,5}\s+\((archivo adjunto|arquivo anexado|fichier joint|Datei angehängt)\)/i,
  /^null$/, // Android view-once media
  /^(location|ubicación|standort|localização): https?:\/\//i,
  /^live location shared$/i,
  /^poll:/i,
  /^(you|\S.*) shared a (contact|location)/i,
];

export const DELETED_PATTERNS: RegExp[] = [
  /^this message was deleted\.?$/i,
  /^you deleted this message\.?$/i,
  /^se eliminó este mensaje\.?$/i,
  /^eliminaste este mensaje\.?$/i,
  /^este mensaje fue eliminado\.?$/i,
  /^diese nachricht wurde gelöscht\.?$/i,
  /^du hast diese nachricht gelöscht\.?$/i,
  /^ce message a été supprimé\.?$/i,
  /^vous avez supprimé ce message\.?$/i,
  /^essa mensagem foi apagada\.?$/i,
  /^mensagem apagada\.?$/i,
  /^यह मैसेज डिलीट कर दिया गया(था)?\.?$/,
  /^यह संदेश हटा दिया गया(था)?\.?$/,
  /^आपने यह मैसेज डिलीट किया\.?$/,
];

export const DELETED_BY_ME = [/^you deleted this message/i, /^eliminaste este mensaje/i, /^du hast diese nachricht/i, /^vous avez supprimé/i, /^आपने यह मैसेज/];

export const CALL_PATTERNS: RegExp[] = [
  /^missed (voice|video|group voice|group video) call/i,
  /^(voice|video) call(,|\s|$)/i,
  /^llamada (de voz|de video) perdida/i,
  /^call (ended|declined)/i,
];

/** Whole-line system messages (Android puts them with no sender). Tested without invisible marks. */
export const SYSTEM_PATTERNS: RegExp[] = [
  /end-to-end encrypted/i,
  /cifrados de extremo a extremo|ende-zu-ende-verschlüsselt|chiffrés de bout en bout|criptografia de ponta a ponta|एंड-टू-एंड एन्क्रिप्टेड/i,
  /^messages (to this group )?are now secured/i,
  /^[^:]{1,80} created (the )?group\b/i,
  /^[^:]{1,80} created this group/i,
  /^[^:]{1,80} changed (the|this group's|their|the group) (subject|icon|description|name|settings|phone number|group description)/i,
  /^[^:]{1,80} changed the subject (from|to)\b/i,
  /^[^:]{1,80} (added|removed) [^:]{1,200}$/i,
  /^[^:]{1,80} (left|joined)$/i,
  /^[^:]{1,80} joined (using|from) /i,
  /^[^:]{1,80} (is|are|is no longer|are no longer) (now )?an admin/i,
  /^[^:]{1,80} (deleted|reset|turned on|turned off) (this group's icon|the group icon|disappearing messages|the group invite link)/i,
  /^[^:]{1,80} pinned a message/i,
  /^[^:]{1,80} changed to [^:]+$/i, // "+91 ... changed to +91 ..."
  /^your security code with .* changed/i,
  /security code (with|changed)/i,
  /disappearing messages/i,
  /^you('re| are) now an admin/i,
  /^waiting for this message/i,
  /^this chat is with a business account/i,
  /^[^:]{1,80} (started|ended) a (video|voice) call/i,
  /^you (blocked|unblocked) this (contact|business)/i,
  /^tap to (learn more|change)/i,
];

/** System events that only happen in groups. */
export const GROUP_EVENT_PATTERNS: RegExp[] = [
  /created (the )?group|created this group/i,
  /changed (the|this group's) (subject|icon|description)/i,
  /changed the subject/i,
  /\b(added|removed)\b/i,
  /\b(left|joined)\b/i,
  /messages to this group/i,
  /\badmin\b/i,
];

/** Senders that are really the start of a system line that happened to contain ": ". */
export const FAKE_SENDER_RE = /["“”«»]| changed the (subject|group|description)| created (the )?group| added | removed /i;

/** Title from an export filename, across locales. Returns null when the name is generic (e.g. _chat.txt). */
export function titleFromFileName(fileName: string): string | null {
  let base = fileName.split(/[\\/]/).pop() ?? fileName;
  base = base.replace(/\.(txt|zip)$/i, '').replace(/\s*\(\d+\)$/, '').trim();
  if (!base || /^_?chat$/i.test(base)) return null;
  const prefixes = [
    /^whatsapp\s*chat\s*(with|-|–|—)\s*/i,
    /^whatsapp[-\s]chat\s+mit\s+/i,
    /^chat de whatsapp con\s+/i,
    /^conversa do whatsapp com\s+/i,
    /^discussion whatsapp avec\s+/i,
    /^chat whatsapp con\s+/i,
    /^whatsapp-chat met\s+/i,
  ];
  for (const p of prefixes) {
    if (p.test(base)) return base.replace(p, '').trim() || null;
  }
  const hindi = base.match(/^(.+?)\s*के साथ (WhatsApp|व्हाट्सऐप) चैट$/);
  if (hindi?.[1]) return hindi[1].trim();
  return /whatsapp/i.test(base) ? null : base;
}

export function cleanName(raw: string): string {
  return raw
    .replace(INVISIBLE, '')
    .replace(/[\s  ]+/g, ' ')
    .replace(/^~\s*/, '')
    .trim();
}
