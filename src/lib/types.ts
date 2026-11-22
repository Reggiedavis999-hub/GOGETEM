export type Platform = 'flex' | 'doordash' | 'ubereats';
export type ExpPlatform = Platform | 'all';
export type BlockStatus = 'planned' | 'done' | 'cancelled';

interface Base {
  id: string;
  who: string;
  created?: number;
}

export interface Block extends Base {
  type: 'block';
  platform: Platform;
  status: BlockStatus;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  hours: number;
  pay: number;
  tips: number;
  miles: number;
  orders: number;
  station: string;
  note: string;
}

export interface Drop extends Base {
  type: 'drop';
  ts: number;
  station: string;
  got: boolean | null;
  pay: number;
}

export interface Expense extends Base {
  type: 'expense';
  platform: ExpPlatform;
  date: string;
  amt: number;
  cat: string;
  note: string;
}

export type Entry = Block | Drop | Expense;

export interface Settings {
  nameA: string;
  nameB: string;
  goal: number;
  setAside: number;
  station: string;
  rate: string;
}

export interface User {
  id: string;
  name: string;
}

export interface LiveDelivery {
  ts: number;
  pay: number;
  tip: number;
  mi: number;
}

export interface LiveDash {
  plat: Platform;
  start: number;
  paused: number;
  pausedMs: number;
  rate?: number;
  deliveries: LiveDelivery[];
}

export interface Problems {
  future: Block[];
  dups: string[];
  odd: Block[];
  overlap: Block[];
  n: number;
}

export interface BlockSum {
  gross: number;
  pay: number;
  tips: number;
  hours: number;
  miles: number;
  orders: number;
  n: number;
  deduct: number;
  perHr: number;
  perOrder: number;
}

export interface ExpSum {
  n: number;
  total: number;
  veh: number;
  other: number;
  byCat: Record<string, number>;
}
