/** Shared data model. Everything here is plain data so it can cross the worker boundary. */

export type Platform = 'whatsapp' | 'instagram';

export type MessageKind =
  | 'text'
  | 'media' // image/video/sticker/audio/document omitted or attached
  | 'deleted' // "This message was deleted"
  | 'call' // missed voice / video call lines (iOS)
  | 'system'; // encryption notice, joined/left/added, subject changes...

export interface Message {
  /** Milliseconds since epoch. WhatsApp wall-clock times are interpreted in the browser's local time zone. */
  ts: number;
  /** Display name of the sender, '' for system messages. */
  sender: string;
  kind: MessageKind;
  /** Message text ('' for media/system/deleted). Multi-line messages keep their \n. */
  text: string;
}

export interface Chat {
  id: string;
  platform: Platform;
  title: string;
  isGroup: boolean;
  /** Everyone who sent at least one non-system message, plus known members. */
  participants: string[];
  messages: Message[];
  sourceFile: string;
  /** Names that are definitely NOT the exporting user (e.g. "WhatsApp Chat with X"). */
  notMeHints: string[];
  /** Names that are definitely the exporting user (e.g. sender of "You deleted this message"). */
  meHints: string[];
}

export type InteractionKind = 'like' | 'saved' | 'story' | 'comment';

export interface Interaction {
  ts: number;
  /** Account (username) the interaction was with, when the export says so. */
  account?: string;
  kind: InteractionKind;
  /** For stories: story_likes / polls / quizzes / emoji_sliders / ... */
  detail?: string;
}

export interface InstagramActivity {
  interactions: Interaction[];
  profile?: { username?: string; name?: string };
  /** Which data sources were found, for the UI ("found likes, saved, DMs"). */
  sources: string[];
}

export interface Dataset {
  chats: Chat[];
  instagram: InstagramActivity | null;
  warnings: string[];
}

// ---------- Summary shown on the setup screen (who are you? which year?) ----------

export interface ParticipantSummary {
  name: string;
  platforms: Platform[];
  chatCount: number;
  messageCount: number;
}

export interface DatasetSummary {
  chatCount: number;
  messageCount: number;
  whatsappChats: number;
  instagramThreads: number;
  instagramSources: string[];
  participants: ParticipantSummary[];
  suggestedMe: string[];
  years: { year: number; count: number }[];
  defaultYear: number | 'all';
  warnings: string[];
}

export interface StatsOptions {
  me: string[];
  year: number | 'all';
}
