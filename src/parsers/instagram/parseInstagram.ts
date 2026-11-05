import type { Chat, InstagramActivity } from '../../types';

// Placeholder — full implementation lands in phase 5.
export interface JsonSource {
  path: string;
  read(): Promise<string>;
}

export function isInstagramPath(_path: string): boolean {
  return false;
}

export async function parseInstagram(
  _sources: JsonSource[],
  _opts: { onWarning?: (w: string) => void } = {},
): Promise<{ chats: Chat[]; activity: InstagramActivity }> {
  return { chats: [], activity: { interactions: [], sources: [] } };
}
