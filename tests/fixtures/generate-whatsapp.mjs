// Generates SYNTHETIC WhatsApp export fixtures. Every name and message here is made up.
// Run: node tests/fixtures/generate-whatsapp.mjs
import { writeFileSync } from 'node:fs';

const LRM = '‎';
const NNBSP = ' '; // narrow no-break space used before AM/PM by newer exports
const out = new URL('./whatsapp/', import.meta.url);
const w = (name, lines) => writeFileSync(new URL(name, out), lines.join('\n') + '\n');

// 1. Android, dd/mm/yy, 24h, group, Hinglish + emoji, multi-line, system messages
w('android-dmy-24h-group.txt', [
  '01/01/26, 00:00 - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them. Tap to learn more.',
  '01/01/26, 00:01 - Rohan Mehta created group "Goa Trip 🌴"',
  '01/01/26, 00:01 - Rohan Mehta added Priya, Aarav Sharma',
  '01/01/26, 00:02 - Rohan Mehta: Happy new year guys!! 🎉🎉',
  '01/01/26, 00:03 - Priya: Happy new year 🥳 kal milte hai na?',
  '01/01/26, 00:05 - Aarav Sharma: haan bhai pakka',
  'kitne baje?',
  'aur kahan?',
  '13/01/26, 09:15 - Priya: <Media omitted>',
  '13/01/26, 09:16 - Aarav Sharma: This message was deleted',
  '13/01/26, 09:17 - Aarav Sharma: You deleted this message',
  '13/01/26, 21:40 - Rohan Mehta changed the subject from "Goa Trip 🌴" to "Goa Trip: Final 🌴"',
  '14/01/26, 03:12 - Aarav Sharma: neend nahi aa rahi 😂😂',
  '14/01/26, 03:13 - Priya: same yaar 😭',
  '20/02/26, 18:00 - +91 98765 43210 joined using this group\'s invite link',
  '20/02/26, 18:01 - +91 98765 43210: hi everyone',
  '21/02/26, 10:00 - Priya left',
  '21/02/26, 10:05 - Rohan Mehta: Note: time is 10:30 sharp',
]);

// 2. Android, mm/dd/yy, 12h with narrow no-break space, 1:1
w('WhatsApp Chat with Maya Chen.txt', [
  `12/31/25, 11:58${NNBSP}PM - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them. Tap to learn more.`,
  `12/31/25, 11:59${NNBSP}PM - Maya Chen: almost midnight!!`,
  `1/1/26, 12:00${NNBSP}AM - Alex Rivera: HAPPY NEW YEAR 🎆`,
  `1/1/26, 12:01${NNBSP}AM - Maya Chen: 🥂🥂🥂`,
  `1/13/26, 12:30${NNBSP}PM - Alex Rivera: lunch?`,
  `1/13/26, 12:45${NNBSP}PM - Maya Chen: <Media omitted>`,
  `1/13/26, 1:05${NNBSP}PM - Maya Chen: omw <This message was edited>`,
  `2/14/26, 9:00${NNBSP}AM - Alex Rivera: IMG-20260214-WA0001.jpg (file attached)`,
  'look at this',
]);

// 3. iOS, dd/mm/yyyy, 24h with seconds, brackets, LRM marks, 1:1
w('ios-dmy-24h-1to1.txt', [
  `${LRM}[02/01/2026, 10:00:00] Kabir Singh: ${LRM}Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.`,
  '[02/01/2026, 10:00:05] Aarav Sharma: Bhai kya scene hai aaj?',
  '[02/01/2026, 10:01:30] Kabir Singh: kuch nahi yaar, office 😩',
  `${LRM}[02/01/2026, 10:02:00] Kabir Singh: ${LRM}image omitted`,
  `${LRM}[02/01/2026, 10:02:10] Aarav Sharma: ${LRM}sticker omitted`,
  `${LRM}[15/01/2026, 22:30:00] Kabir Singh: ${LRM}Missed voice call`,
  '[15/01/2026, 22:31:00] Aarav Sharma: sorry was driving',
  'call you in 5',
  `[16/01/2026, 08:00:00] Aarav Sharma: ${LRM}<attached: 00000012-PHOTO-2026-01-16-08-00-00.jpg>`,
  `[16/01/2026, 08:05:00] Kabir Singh: ${LRM}This message was deleted.`,
]);

// 4. iOS, m/d/yy, 12h, group with LRM system messages
w('ios-mdy-12h-group.txt', [
  `${LRM}[3/5/26, 9:00:00${NNBSP}AM] Book Club: ${LRM}Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.`,
  `${LRM}[3/5/26, 9:00:00${NNBSP}AM] Book Club: ${LRM}Zoe Park created this group`,
  `${LRM}[3/5/26, 9:00:01${NNBSP}AM] Book Club: ${LRM}Zoe Park added you`,
  `[3/5/26, 9:01:00${NNBSP}AM] Zoe Park: Welcome to book club 📚`,
  `[3/15/26, 11:45:10${NNBSP}PM] Sam Okafor: finished chapter 3 at midnight lol`,
  `[3/16/26, 12:15:00${NNBSP}AM] ~${NNBSP}Lena Fischer: same 😴`,
  `${LRM}[3/16/26, 12:20:00${NNBSP}AM] Book Club: ${LRM}Sam Okafor left`,
  `[3/20/26, 7:05:00${NNBSP}PM] Zoe Park: ${LRM}GIF omitted`,
]);

// 5. Ambiguous dates (all ≤ 12) — only chronology can tell. This one is dd/mm.
w('ambiguous-dmy.txt', [
  '05/01/26, 10:00 - Ana: one',
  '09/01/26, 10:00 - Ben: two',
  '12/01/26, 10:00 - Ana: three',
  '03/02/26, 10:00 - Ben: four',
  '07/02/26, 10:00 - Ana: five',
  '11/02/26, 10:00 - Ben: six',
  '02/03/26, 10:00 - Ana: seven',
]);

// 6. German style dots, 4-digit year, 24h
w('android-dots-de.txt', [
  '31.12.2025, 23:59 - Jonas: Guten Rutsch!',
  '01.01.2026, 00:01 - Mia: Frohes neues 🎆',
  '01.01.2026, 00:02 - Jonas: <Medien ausgeschlossen>',
]);

// 7. Hindi (Devanagari) + emoji, no comma after date, lowercase am/pm with dots
w('hindi-ampm-dots.txt', [
  '10/03/2026 9:15 a.m. - दादी: बेटा खाना खाया? 🍛',
  '10/03/2026 9:20 a.m. - Aarav Sharma: हाँ दादी, खा लिया ❤️',
  '10/03/2026 10:05 p.m. - दादी: शुभ रात्रि 🙏',
  '11/03/2026 12:10 a.m. - Aarav Sharma: good night dadi',
]);

// 8. ISO-ish year-first dates
w('ymd.txt', [
  '2026-04-01, 08:00 - Nora: april fools 🤡',
  '2026-04-02, 18:30 - Omar: not funny',
]);
console.log('fixtures written');
