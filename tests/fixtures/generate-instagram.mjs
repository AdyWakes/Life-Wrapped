// Generates SYNTHETIC Instagram JSON export fixtures (made-up people) in Meta's quirky encoding:
// UTF-8 bytes written as \u00XX escapes ("mojibake"). Run: node tests/fixtures/generate-instagram.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./instagram/', import.meta.url));

/** Encode like Meta: every UTF-8 byte becomes its own \u00XX code unit. */
function metaJson(obj) {
  const json = JSON.stringify(obj, null, 2);
  let out = '';
  for (const ch of json) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) out += ch;
    else for (const b of Buffer.from(ch, 'utf8')) out += '\\u00' + b.toString(16).padStart(2, '0');
  }
  return out;
}
function write(rel, obj) {
  const p = root + rel;
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, typeof obj === 'string' ? obj : metaJson(obj));
}
const ms = (y, m, d, h = 12, mi = 0) => new Date(Date.UTC(y, m - 1, d, h, mi)).getTime();

// --- Current layout: your_instagram_activity/... ---
const A = 'export-new/your_instagram_activity';
write(`${A}/messages/inbox/mayachen_1234567890/message_1.json`, {
  participants: [{ name: 'Maya Chen' }, { name: 'Aarav Sharma' }],
  title: 'Maya Chen',
  thread_path: 'inbox/mayachen_1234567890',
  messages: [
    { sender_name: 'Maya Chen', timestamp_ms: ms(2026, 3, 2, 10, 5), content: 'haha that reel 😂😂' },
    { sender_name: 'Aarav Sharma', timestamp_ms: ms(2026, 3, 2, 10, 1), content: 'dekh ye 👀' },
    { sender_name: 'Aarav Sharma', timestamp_ms: ms(2026, 3, 2, 10, 0), share: { link: 'https://www.instagram.com/reel/abc/' } },
    { sender_name: 'Maya Chen', timestamp_ms: ms(2026, 3, 1, 9, 0), content: 'Reacted 😂 to your message ' },
    { sender_name: 'Maya Chen', timestamp_ms: ms(2026, 2, 28, 23, 0), content: 'नमस्ते! कैसे हो?' },
  ],
});
// Older messages for the same thread live in message_2.json
write(`${A}/messages/inbox/mayachen_1234567890/message_2.json`, {
  participants: [{ name: 'Maya Chen' }, { name: 'Aarav Sharma' }],
  title: 'Maya Chen',
  thread_path: 'inbox/mayachen_1234567890',
  messages: [
    { sender_name: 'Aarav Sharma', timestamp_ms: ms(2026, 1, 5, 8, 0), content: 'happy new year!! 🎉' },
    { sender_name: 'Maya Chen', timestamp_ms: ms(2026, 1, 5, 7, 0), photos: [{ uri: 'photo.jpg' }] },
  ],
});
write(`${A}/messages/inbox/gangs_987/message_1.json`, {
  participants: [{ name: 'Aarav Sharma' }, { name: 'Kabir Singh' }, { name: 'Zoe Park' }],
  title: 'the gang 🔥',
  messages: [
    { sender_name: 'Kabir Singh', timestamp_ms: ms(2026, 4, 1), content: 'Kabir Singh named the group the gang 🔥.' },
    { sender_name: 'Zoe Park', timestamp_ms: ms(2026, 4, 2), content: 'yo' },
    { sender_name: 'Aarav Sharma', timestamp_ms: ms(2026, 4, 3), content: 'call?', call_duration: 0 },
    { sender_name: 'Aarav Sharma', timestamp_ms: ms(2026, 4, 3, 13), content: 'sup', is_unsent: false },
  ],
});
write(`${A}/messages/message_requests/spammer_1/message_1.json`, {
  participants: [{ name: 'Spam Bot' }, { name: 'Aarav Sharma' }],
  title: 'Spam Bot',
  messages: [{ sender_name: 'Spam Bot', timestamp_ms: ms(2026, 5, 1), content: 'win money' }],
});
// Classic likes format
write(`${A}/likes/liked_posts.json`, {
  likes_media_likes: [
    { title: 'travelwithzoe', string_list_data: [{ href: 'https://www.instagram.com/p/AAA/', value: '👍', timestamp: 1767268800 }] },
    { title: 'travelwithzoe', string_list_data: [{ href: 'https://www.instagram.com/p/BBB/', value: '👍', timestamp: 1767355200 }] },
    { title: 'memes.daily', string_list_data: [{ href: 'https://www.instagram.com/p/CCC/', value: '👍', timestamp: 1767441600 }] },
  ],
});
write(`${A}/saved/saved_posts.json`, {
  saved_saved_media: [
    { title: 'foodie.mumbai', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/p/DDD/', timestamp: 1767528000 } } },
  ],
});
write(`${A}/story_sticker_interactions/story_likes.json`, {
  story_activities_story_likes: [
    { title: 'kabir.singh', string_list_data: [{ timestamp: 1767614400 }] },
    { title: 'kabir.singh', string_list_data: [{ timestamp: 1767700800 }] },
  ],
});
write(`${A}/story_sticker_interactions/polls.json`, {
  story_activities_polls: [{ title: 'zoe.park', string_list_data: [{ value: 'Yes', timestamp: 1767787200 }] }],
});
write(`${A}/comments/post_comments_1.json`, [
  { string_map_data: { Comment: { value: 'so good 😍' }, 'Media Owner': { value: 'foodie.mumbai' }, Time: { timestamp: 1767873600 } } },
]);
write('export-new/personal_information/personal_information/personal_information.json', {
  profile_user: [{ string_map_data: { Username: { value: 'aarav.codes' }, Name: { value: 'Aarav Sharma' } } }],
});
// Media files that should be ignored
write(`${A}/messages/inbox/mayachen_1234567890/photos/photo.jpg`, 'not really a jpg');

// --- Older layout (2022): messages/inbox at the root, likes/ at the root ---
write('export-old/messages/inbox/rohan_42/message_1.json', {
  participants: [{ name: 'Rohan Mehta' }, { name: 'Aarav Sharma' }],
  title: 'Rohan Mehta',
  messages: [
    { sender_name: 'Rohan Mehta', timestamp_ms: ms(2025, 6, 1), content: 'bhai 😎' },
    { sender_name: 'Aarav Sharma', timestamp_ms: ms(2025, 6, 2), content: 'bolo' },
  ],
});
// --- Newest "label_values" style records (Meta started using these in late 2024) ---
write('export-new/your_instagram_activity/likes/liked_posts_2.json', [
  {
    timestamp: 1767960000,
    media: [],
    label_values: [
      { label: 'URL', value: 'https://www.instagram.com/p/EEE/', href: 'https://www.instagram.com/p/EEE/' },
      { title: 'Owner', dict: [{ dict: [{ label: 'URL', value: '' }, { label: 'Name', value: 'Zoe' }, { label: 'Username', value: 'travelwithzoe' }] }] },
    ],
    fbid: '1',
  },
]);
// HTML export (unsupported) for the warning path
write('export-html/your_instagram_activity/messages/inbox/x_1/message_1.html', '<html><body>hi</body></html>');
console.log('instagram fixtures written');
