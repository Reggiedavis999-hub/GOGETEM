import { apiRaw } from './api';

export interface TeamMember { username: string; online: boolean }
export interface MeSocial {
  username: string;
  team: TeamMember[];
  pending: { username: string }[];
  requests: { username: string }[];
  blocked: { username: string }[];
}
export interface SocMsg { id: string; t: number; from: string; mine: boolean; text: string }
export interface PollResp { messages: SocMsg[]; online: string[] }
export interface FindResp { found: boolean; username?: string; onTeam?: boolean; requested?: boolean }

/** One call to the team and room endpoints. */
export const soc = <T,>(act: string, body: Record<string, unknown> = {}): Promise<T> => apiRaw<T>('soc', { act, ...body });

const cache = new Map<string, Promise<string>>();

/** Base64 JPEG of a person's profile picture, or '' when they have none. Cached for the session. */
export function avatarOf(username: string): Promise<string> {
  const k = username.toLowerCase();
  let p = cache.get(k);
  if (!p) {
    p = soc<{ data: string }>('avatar', { username: k }).then((r) => r.data || '', () => '');
    cache.set(k, p);
  }
  return p;
}
export const forgetAvatar = (username: string) => { cache.delete(username.toLowerCase()); };
