/**
 * Synthetic demo data. Every person, message and account here is made up.
 *
 * Instead of hand-crafting stats, we generate *export files* (WhatsApp .txt in four different
 * phone formats + an Instagram JSON export with Meta's mojibake encoding) and run them through the
 * real parsers — so the demo doubles as an end-to-end test of the pipeline.
 */

export const DEMO_ME = 'Aarav';

type Format = 'android-dmy-24h' | 'android-mdy-12h' | 'ios-dmy-24h' | 'ios-mdy-12h';

interface Persona {
  name: string;
  fileName: string;
  format: Format;
  /** probability of chatting on a given day */
  daily: number;
  /** days of year (0-based) with guaranteed silence, to shape streaks */
  gaps?: number[];
  sessions: [number, number];
  hours: number[]; // 24 weights
  turns: [number, number];
  theirReplyMin: number; // median minutes
  myReplyMin: number;
  phrases: string[];
  myPhrases: string[];
}

// ---------- seeded RNG ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ME_PHRASES = [
  'haan bhai pakka', 'kya scene hai aaj?', 'chai pe chalein? ☕', 'office se nikal raha hu', 'omg 😂😂😂', 'sach mein?? 😳',
  'kal milte hai', 'pizza order karte hai 🍕', 'match dekh raha hai? 🏏', 'bas chill kar raha', 'neend nahi aa rahi 😩',
  'movie plan karte hai weekend pe 🍿', 'traffic is insane today', 'running late, 10 min', 'love you yaar ❤️', 'hahaha dead 💀',
  'send pics!', 'that’s so true', 'kya bakwas hai 😂', 'gym jaa raha hu 💪', 'call karu?', 'ok done 👍', 'sorry was in a meeting',
  'goa wale photos bhej', 'aaj ka plan?', 'mera bhi same scene', 'arre wah 🔥', 'party kab hai?', 'pakka?', 'good night 🌙',
  'deadline kal hai 😭', 'coffee first ☕', 'monsoon vibes 🌧️', 'biryani khaani hai', 'sun na', 'brb', 'scene on hai 🔥🔥',
];

const PERSONAS: Persona[] = [
  {
    name: 'Priya',
    fileName: 'WhatsApp Chat with Priya.txt',
    format: 'android-dmy-24h',
    daily: 1,
    gaps: [44, 46, 189],
    sessions: [4, 8],
    hours: w({ 8: 1, 12: 2, 13: 2, 18: 2, 20: 3, 21: 5, 22: 8, 23: 9, 0: 6, 1: 3 }),
    turns: [8, 18],
    theirReplyMin: 1.2,
    myReplyMin: 2.5,
    phrases: [
      'hahaha 😂😂', 'tu pagal hai 😂', 'kya kar raha hai?', 'omg same', 'chai pe chalein? ☕', 'I miss college yaar 🥺', 'scene kya hai',
      'aaj office mein drama hua 😤', 'pizza night? 🍕', 'reel bheji dekh', 'kal ka plan pakka?', 'love you ❤️', 'stop it 😂',
      'mujhe neend aa rahi hai 😴', 'good night 🌙', 'arre sun na', 'goa photos are 🔥', 'party kab hai??', 'that’s literally us 😂',
    ],
    myPhrases: ME_PHRASES,
  },
  {
    name: 'Rohan Mehta',
    fileName: 'WhatsApp Chat - Rohan Mehta.txt',
    format: 'ios-mdy-12h',
    daily: 0.55,
    sessions: [1, 3],
    hours: w({ 0: 5, 1: 7, 2: 6, 3: 5, 23: 4, 22: 2, 15: 1 }),
    turns: [4, 10],
    theirReplyMin: 55,
    myReplyMin: 4,
    phrases: ['bhai so gaya kya', 'match dekha?? 🏏', 'scene on hai kal', 'haan', 'ok', 'baad mein baat karte', 'bro 😂', 'neend nahi aa rahi', 'gym kal pakka 💪', '3am thoughts hitting different'],
    myPhrases: ['bhai reply kar 😤', 'awake?', ...ME_PHRASES],
  },
  {
    name: 'Mummy',
    fileName: 'WhatsApp Chat with Mummy.txt',
    format: 'android-dmy-24h',
    daily: 0.9,
    sessions: [1, 2],
    hours: w({ 7: 5, 8: 6, 9: 4, 13: 2, 20: 3, 21: 2 }),
    turns: [2, 6],
    theirReplyMin: 6,
    myReplyMin: 70,
    phrases: ['Good morning beta 🌸🙏', 'Khana khaya?', 'Call karna', 'Jai Shri Krishna 🙏', 'Paise bhej diye', 'Dhyan rakhna ❤️', 'Kab aa rahe ho ghar?', 'Garam kapde pehen 🧥'],
    myPhrases: ['haan mummy', 'kha liya ❤️', 'call karta hu', 'good morning 🙏', 'ok mummy', 'love you mummy ❤️'],
  },
  {
    name: 'Maya Chen',
    fileName: 'ios-maya.txt',
    format: 'ios-dmy-24h',
    daily: 0.35,
    sessions: [1, 2],
    hours: w({ 9: 2, 10: 3, 18: 3, 19: 4, 22: 2 }),
    turns: [4, 10],
    theirReplyMin: 9,
    myReplyMin: 12,
    phrases: ['lol yes', 'that’s amazing!!', 'send me the recipe 🍜', 'how was the trip?', 'omg 😭', 'coffee this weekend? ☕', 'proud of you 🥹'],
    myPhrases: ME_PHRASES,
  },
  {
    name: 'Kabir',
    fileName: 'WhatsApp Chat with Kabir.txt',
    format: 'android-mdy-12h',
    daily: 0.4,
    sessions: [1, 2],
    hours: w({ 6: 4, 7: 3, 18: 3, 19: 3 }),
    turns: [3, 8],
    theirReplyMin: 3,
    myReplyMin: 6,
    phrases: ['gym? 💪', 'leg day bro', 'protein shake 🥤', 'chal aa ja', 'PR today 🔥', 'rest day 😴'],
    myPhrases: ['aa raha hu', 'pakka', 'aaj skip 😅', 'leg day 💀', ...ME_PHRASES.slice(0, 10)],
  },
];

interface GroupDef {
  title: string;
  fileName: string;
  format: Format;
  members: string[];
  daily: number;
  sessions: [number, number];
  hours: number[];
  turns: [number, number];
  phrases: string[];
}

const GROUPS: GroupDef[] = [
  {
    title: 'Goa Trip 2026 🌴',
    fileName: 'WhatsApp Chat - Goa Trip 2026 🌴.txt',
    format: 'ios-dmy-24h',
    members: ['Priya', 'Rohan Mehta', 'Kabir', 'Zoe Park', 'Ishaan'],
    daily: 0.5,
    sessions: [1, 3],
    hours: w({ 13: 2, 17: 3, 20: 4, 21: 5, 22: 4, 23: 2 }),
    turns: [8, 25],
    phrases: ['tickets book karo 🎫', 'beach pe sunset 🌅', 'who’s bringing the speaker 🔊', 'budget kitna hai?', 'GOA GOA GOA 🌴🌴', 'villa final?', 'scene set hai 🔥', 'packing kar li?', 'hahaha 😂'],
  },
  {
    title: 'College Gang 🎓',
    fileName: 'WhatsApp Chat with College Gang 🎓.txt',
    format: 'android-dmy-24h',
    members: ['Priya', 'Neha', 'Arjun', 'Rohan Mehta', 'Sana', 'Dev'],
    daily: 0.45,
    sessions: [1, 2],
    hours: w({ 11: 2, 14: 2, 19: 3, 22: 4, 23: 3 }),
    turns: [6, 18],
    phrases: ['reunion kab? 🥹', 'remember canteen samosa 😂', 'happy birthday!! 🎂🎉', 'throwback 📸', 'meme bhejo', 'sab kahan ho', 'party scene?'],
  },
];

function w(map: Record<number, number>): number[] {
  return Array.from({ length: 24 }, (_, h) => map[h] ?? 0.15);
}

export interface DemoFile {
  name: string;
  blob: Blob;
}

export function generateDemoFiles(now: Date = new Date(), seed = 2026): DemoFile[] {
  const rnd = mulberry32(seed);
  const year = now.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = Math.min(now.getTime(), new Date(year, 11, 31, 23, 59).getTime());
  const days = Math.max(30, Math.floor((end - start) / 86_400_000));

  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]!;
  const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const weighted = (weights: number[]) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    for (let i = 0; i < weights.length; i++) if ((r -= weights[i]!) <= 0) return i;
    return weights.length - 1;
  };
  // log-normal-ish delay with the given median (minutes) -> ms
  const delay = (medianMin: number) => Math.max(15_000, medianMin * 60_000 * Math.exp((rnd() - 0.5) * 2.2));

  const files: DemoFile[] = [];

  for (const p of PERSONAS) {
    const msgs: Line[] = [];
    for (let d = 0; d < days; d++) {
      if (p.gaps?.includes(d)) continue;
      if (rnd() > p.daily) continue;
      const n = int(p.sessions[0], p.sessions[1]);
      for (let s = 0; s < n; s++) {
        let t = start + d * 86_400_000 + weighted(p.hours) * 3_600_000 + int(0, 59) * 60_000;
        let mine = rnd() < 0.5;
        const turns = int(p.turns[0], p.turns[1]);
        for (let k = 0; k < turns; k++) {
          const burst = int(1, 4);
          for (let b = 0; b < burst; b++) {
            msgs.push({ ts: t, sender: mine ? DEMO_ME : p.name, text: lineText(rnd, mine ? p.myPhrases : p.phrases, p.format) });
            t += int(5, 40) * 1000;
          }
          mine = !mine;
          t += delay(mine ? p.myReplyMin : p.theirReplyMin);
        }
      }
    }
    files.push({ name: p.fileName, blob: new Blob([render(p.format, msgs, p.name, false)]) });
  }

  for (const g of GROUPS) {
    const msgs: Line[] = [];
    const people = [DEMO_ME, ...g.members];
    for (let d = 0; d < days; d++) {
      if (rnd() > g.daily) continue;
      const n = int(g.sessions[0], g.sessions[1]);
      for (let s = 0; s < n; s++) {
        let t = start + d * 86_400_000 + weighted(g.hours) * 3_600_000 + int(0, 59) * 60_000;
        const turns = int(g.turns[0], g.turns[1]);
        for (let k = 0; k < turns; k++) {
          const sender = rnd() < 0.25 ? DEMO_ME : pick(people);
          msgs.push({ ts: t, sender, text: lineText(rnd, sender === DEMO_ME ? ME_PHRASES : g.phrases, g.format) });
          t += int(20, 600) * 1000;
        }
      }
    }
    files.push({ name: g.fileName, blob: new Blob([render(g.format, msgs, g.title, true, g.members[0]!)]) });
  }

  files.push(...instagramFiles(rnd, start, days));
  return files;
}

interface Line {
  ts: number;
  sender: string;
  text: string;
}

function lineText(rnd: () => number, phrases: string[], format: Format): string {
  const r = rnd();
  const ios = format.startsWith('ios');
  if (r < 0.05) return ios ? '‎image omitted' : '<Media omitted>';
  if (r < 0.06) return ios ? '‎sticker omitted' : '<Media omitted>';
  if (r < 0.065) return 'This message was deleted';
  const a = phrases[Math.floor(rnd() * phrases.length)]!;
  if (r > 0.97) return `${a}\n${phrases[Math.floor(rnd() * phrases.length)]!}`; // multi-line
  return a;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function header(format: Format, ts: number): string {
  const d = new Date(ts);
  const dd = d.getDate();
  const mm = d.getMonth() + 1;
  const yy = d.getFullYear() % 100;
  const H = d.getHours();
  const M = pad(d.getMinutes());
  const S = pad(d.getSeconds());
  const h12 = H % 12 === 0 ? 12 : H % 12;
  const ap = H < 12 ? 'AM' : 'PM';
  switch (format) {
    case 'android-dmy-24h':
      return `${pad(dd)}/${pad(mm)}/${pad(yy)}, ${pad(H)}:${M} - `;
    case 'android-mdy-12h':
      return `${mm}/${dd}/${yy}, ${h12}:${M} ${ap} - `;
    case 'ios-dmy-24h':
      return `[${pad(dd)}/${pad(mm)}/${d.getFullYear()}, ${pad(H)}:${M}:${S}] `;
    case 'ios-mdy-12h':
      return `[${mm}/${dd}/${yy}, ${h12}:${M}:${S} ${ap}] `;
  }
}

function render(format: Format, msgs: Line[], title: string, group: boolean, creator?: string): string {
  msgs.sort((a, b) => a.ts - b.ts);
  const first = msgs[0]?.ts ?? Date.now();
  const ios = format.startsWith('ios');
  const out: string[] = [];
  const enc = 'Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.';
  if (ios) {
    out.push(`‎${header(format, first - 120_000)}${title}: ‎${enc}`);
    if (group) out.push(`‎${header(format, first - 60_000)}${title}: ‎${creator} created group “${title}”`);
  } else {
    out.push(`${header(format, first - 120_000)}${enc} Tap to learn more.`);
    if (group) out.push(`${header(format, first - 60_000)}${creator} created group "${title}"`, `${header(format, first - 60_000)}${creator} added you`);
  }
  for (const m of msgs) {
    const lrm = ios && m.text.startsWith('‎') ? '‎' : '';
    out.push(`${lrm}${header(format, m.ts)}${m.sender}: ${m.text}`);
  }
  return out.join('\n') + '\n';
}

// ---------------------------------- Instagram ----------------------------------

function metaJson(obj: unknown): string {
  // Write strings the way Meta does: UTF-8 bytes as \u00XX escapes.
  const json = JSON.stringify(obj);
  const enc = new TextEncoder();
  let out = '';
  for (const ch of json) {
    if (ch.charCodeAt(0) < 0x80) out += ch;
    else for (const b of enc.encode(ch)) out += '\\u00' + b.toString(16).padStart(2, '0');
  }
  return out;
}

const IG_ACCOUNTS = [
  'memes.daily', 'travelwithzoe', 'foodie.mumbai', 'priya.clicks', 'cricket.updates', 'kabir.lifts', 'desi.humour', 'design.inspo',
  'bollywood.bytes', 'chai.and.code', 'goa.diaries', 'streetfood.india', 'maya.bakes', 'tech.tok', 'sunset.chaser', 'dog.of.delhi',
  'indie.music.hub', 'f1.fanatic', 'plant.parent', 'study.with.sana',
];

function instagramFiles(rnd: () => number, start: number, days: number): DemoFile[] {
  const zipf = () => IG_ACCOUNTS[Math.min(IG_ACCOUNTS.length - 1, Math.floor(Math.pow(rnd(), 2.2) * IG_ACCOUNTS.length))]!;
  const when = () => Math.floor((start + rnd() * days * 86_400_000) / 1000);
  const base = 'instagram-aarav.codes/your_instagram_activity';
  const likes = Array.from({ length: 1460 }, () => ({
    title: zipf(),
    string_list_data: [{ href: 'https://www.instagram.com/p/demo/', value: '👍', timestamp: when() }],
  }));
  const saved = Array.from({ length: 186 }, () => ({
    title: zipf(),
    string_map_data: { 'Saved on': { href: 'https://www.instagram.com/p/demo/', timestamp: when() } },
  }));
  const stories = Array.from({ length: 342 }, () => ({ title: zipf(), string_list_data: [{ timestamp: when() }] }));
  const comments = Array.from({ length: 57 }, () => ({
    string_map_data: { Comment: { value: 'so good 😍' }, 'Media Owner': { value: zipf() }, Time: { timestamp: when() } },
  }));

  const dm = (name: string, n: number, phrases: string[], theirMin: number) => {
    const messages = [];
    const sessions = Math.max(1, Math.floor(n / 6));
    for (let s = 0; s < sessions; s++) {
      let t = start + Math.floor(rnd() * days) * 86_400_000 + (18 + Math.floor(rnd() * 6)) * 3_600_000;
      let mine = rnd() < 0.5;
      for (let i = 0; i < 6; i++) {
        messages.push({ sender_name: mine ? DEMO_ME : name, timestamp_ms: t, content: phrases[Math.floor(rnd() * phrases.length)]! });
        mine = !mine;
        t += Math.floor((mine ? 4 : theirMin) * 60_000 * (0.4 + rnd() * 1.2));
      }
    }
    // Meta writes newest first
    return { participants: [{ name }, { name: DEMO_ME }], title: name, messages: messages.sort((a, b) => b.timestamp_ms - a.timestamp_ms) };
  };

  const json = (name: string, obj: unknown): DemoFile => ({ name, blob: new Blob([metaJson(obj)]) });
  return [
    json(`${base}/likes/liked_posts.json`, { likes_media_likes: likes }),
    json(`${base}/saved/saved_posts.json`, { saved_saved_media: saved }),
    json(`${base}/story_sticker_interactions/story_likes.json`, { story_activities_story_likes: stories }),
    json(`${base}/comments/post_comments_1.json`, comments),
    json(`${base}/messages/inbox/zoepark_123/message_1.json`, dm('Zoe Park', 380, ['haha this reel 😂', 'omg same', 'sending you a meme', 'are you coming to goa?? 🌴', 'lol', 'nooo 😭'], 6)),
    json(`${base}/messages/inbox/mayachen_456/message_1.json`, dm('Maya Chen', 160, ['look at this 🍜', 'so cute 🥹', 'hahaha', 'we need to go here'], 10)),
    json('instagram-aarav.codes/personal_information/personal_information/personal_information.json', {
      profile_user: [{ string_map_data: { Username: { value: 'aarav.codes' }, Name: { value: DEMO_ME } } }],
    }),
  ];
}
