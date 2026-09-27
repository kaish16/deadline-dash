// DEADLINE DASH — core tuning constants

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// World is bigger than the viewport; camera follows the player
export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1600;

// Round length in milliseconds
export const ROUND_LENGTH_MS = 120_000; // 2 minutes
export const BOSS_PHASE_MS = 60_000; // final 60s = boss chaos

export const PLAYER_SPEED = 240;
export const PLAYER_SPEED_FOCUSED = 360;

// Focus ability
export const FOCUS_DURATION_MS = 5000;
export const FOCUS_COOLDOWN_MS = 14000;

// Task tuning
export const MAX_ACTIVE_TASKS = 9;
export const BOSS_PHASE_MAX_TASKS = 16;
export const TASK_SPAWN_INTERVAL_MS = 2600;
export const BOSS_TASK_SPAWN_INTERVAL_MS = 1100;

// Stats
export const STAT_MAX = 100;

// Exhaustion: completing tasks raises it; high exhaustion slows the player
export const EXHAUSTION_PER_TASK = 6;
export const EXHAUSTION_DECAY_PER_SEC = 1.5;
export const EXHAUSTION_SPEED_PENALTY = 0.45; // at max exhaustion

// Reputation: missing deadlines drops it
export const REPUTATION_LOSS_PER_MISS = 9;

// Productivity: completing tasks raises it
export const PRODUCTIVITY_PER_TASK = 7;

// Chaos
export const CHAOS_PER_ACTIVE_TASK = 9; // each active task adds chaos
export const CHAOS_DECAY_PER_SEC = 6;

// Task types and their properties
export interface TaskTypeConfig {
  key: TaskType;
  label: string;
  color: number;
  glow: number;
  baseTime: number; // ms allotted
  icon: string;
  minBossTime: number;
}

export type TaskType =
  | 'EMAIL'
  | 'REPORT'
  | 'PRESENTATION'
  | 'CLIENT_CALL'
  | 'BUG_FIX'
  | 'MEETING'
  | 'DOCUMENT'
  | 'URGENT_REQUEST';

export const TASK_TYPES: Record<TaskType, TaskTypeConfig> = {
  EMAIL: { key: 'EMAIL', label: 'EMAIL', color: 0xf2e9ff, glow: 0xb388ff, baseTime: 14000, icon: 'mail', minBossTime: 9000 },
  REPORT: { key: 'REPORT', label: 'REPORT', color: 0xfff3e0, glow: 0xffb74d, baseTime: 18000, icon: 'file-text', minBossTime: 11000 },
  PRESENTATION: { key: 'PRESENTATION', label: 'PRESENT', color: 0xe1ffe0, glow: 0x76ff03, baseTime: 22000, icon: 'presentation', minBossTime: 13000 },
  CLIENT_CALL: { key: 'CLIENT_CALL', label: 'CALL', color: 0xffe0f0, glow: 0xff4081, baseTime: 12000, icon: 'phone', minBossTime: 8000 },
  BUG_FIX: { key: 'BUG_FIX', label: 'BUG FIX', color: 0xffe0e0, glow: 0xff5252, baseTime: 16000, icon: 'bug', minBossTime: 10000 },
  MEETING: { key: 'MEETING', label: 'MEETING', color: 0xe0f7ff, glow: 0x40c4ff, baseTime: 20000, icon: 'users', minBossTime: 12000 },
  DOCUMENT: { key: 'DOCUMENT', label: 'DOC', color: 0xf5f5f5, glow: 0xbdbdbd, baseTime: 15000, icon: 'file', minBossTime: 9500 },
  URGENT_REQUEST: { key: 'URGENT_REQUEST', label: 'URGENT!', color: 0xffd180, glow: 0xff6f00, baseTime: 9000, icon: 'alert', minBossTime: 6500 },
};

export const TASK_TYPE_KEYS = Object.keys(TASK_TYPES) as TaskType[];

// Room definitions
export interface RoomConfig {
  key: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  accent: number;
}

// Office layout — a grid of rooms across the world
export const ROOMS: RoomConfig[] = [
  { key: 'cubicles', name: 'CUBICLES', x: 40, y: 40, w: 760, h: 520, color: 0x1a1a22, accent: 0x2a2a3a },
  { key: 'meeting', name: 'MEETING ROOM', x: 840, y: 40, w: 460, h: 320, color: 0x1c1620, accent: 0x3a2240 },
  { key: 'boss', name: 'BOSS OFFICE', x: 1360, y: 40, w: 420, h: 320, color: 0x201818, accent: 0x402a2a },
  { key: 'server', name: 'SERVER ROOM', x: 1820, y: 40, w: 540, h: 320, color: 0x101820, accent: 0x1a3a4a },
  { key: 'cafeteria', name: 'CAFETERIA', x: 840, y: 400, w: 520, h: 480, color: 0x182018, accent: 0x2a3a2a },
  { key: 'printing', name: 'PRINTING ROOM', x: 1400, y: 400, w: 380, h: 480, color: 0x202018, accent: 0x3a3a22 },
  { key: 'stairwell', name: 'STAIRWELL', x: 1820, y: 400, w: 540, h: 480, color: 0x181818, accent: 0x2a2a2a },
];

// Stations — fixed interactive furniture positions where tasks can attach
export interface StationConfig {
  room: string;
  x: number;
  y: number;
  type: 'desk' | 'meeting' | 'server' | 'printer' | 'phone' | 'boss' | 'cafeteria';
}

export const STATIONS: StationConfig[] = [
  // Cubicles — cluster of desks
  { room: 'cubicles', x: 180, y: 140, type: 'desk' },
  { room: 'cubicles', x: 360, y: 140, type: 'desk' },
  { room: 'cubicles', x: 540, y: 140, type: 'desk' },
  { room: 'cubicles', x: 180, y: 300, type: 'desk' },
  { room: 'cubicles', x: 360, y: 300, type: 'desk' },
  { room: 'cubicles', x: 540, y: 300, type: 'desk' },
  { room: 'cubicles', x: 180, y: 460, type: 'desk' },
  { room: 'cubicles', x: 360, y: 460, type: 'desk' },
  { room: 'cubicles', x: 540, y: 460, type: 'desk' },
  // Meeting room
  { room: 'meeting', x: 1070, y: 200, type: 'meeting' },
  // Boss office
  { room: 'boss', x: 1570, y: 200, type: 'boss' },
  // Server room
  { room: 'server', x: 1990, y: 130, type: 'server' },
  { room: 'server', x: 2120, y: 130, type: 'server' },
  { room: 'server', x: 1990, y: 260, type: 'server' },
  // Cafeteria
  { room: 'cafeteria', x: 1000, y: 520, type: 'cafeteria' },
  { room: 'cafeteria', x: 1180, y: 520, type: 'cafeteria' },
  // Printing room
  { room: 'printing', x: 1590, y: 520, type: 'printer' },
  // Stairwell — phones
  { room: 'stairwell', x: 1950, y: 520, type: 'phone' },
  { room: 'stairwell', x: 2120, y: 520, type: 'phone' },
];

// Palette
export const COLORS = {
  bg: 0x0a0a0f,
  floor: 0x14141c,
  wall: 0x2a2a3a,
  wallTop: 0x3a3a52,
  player: 0xff6f00,
  playerGlow: 0xffab40,
  focusTint: 0xb388ff,
  text: 0xf2e9ff,
  textDim: 0x8a8a9a,
  green: 0x76ff03,
  red: 0xff5252,
  orange: 0xff9100,
  magenta: 0xff4081,
  purple: 0xb388ff,
  lime: 0xc6ff00,
  warning: 0xffd180,
};

// Random events
export interface GameEventConfig {
  key: string;
  label: string;
  color: number;
  minTime: number; // earliest ms into round
  weight: number;
}

export const GAME_EVENTS: GameEventConfig[] = [
  { key: 'URGENT_EMAIL', label: 'URGENT EMAIL INCOMING', color: 0xff4081, minTime: 8000, weight: 3 },
  { key: 'BOSS_IS_COMING', label: 'BOSS IS COMING', color: 0xff5252, minTime: 15000, weight: 2 },
  { key: 'CLIENT_CALL', label: 'CLIENT CALL', color: 0x40c4ff, minTime: 10000, weight: 3 },
  { key: 'SERVER_DOWN', label: 'SERVER DOWN', color: 0xff9100, minTime: 20000, weight: 2 },
  { key: 'MEETING_MOVED', label: 'MEETING MOVED UP', color: 0xb388ff, minTime: 12000, weight: 2 },
  { key: 'PRINTER_JAM', label: 'PRINTER JAM', color: 0xffd180, minTime: 10000, weight: 3 },
  { key: 'NEW_DEADLINE', label: 'NEW DEADLINE PILE-ON', color: 0xc6ff00, minTime: 6000, weight: 4 },
];

export const EVENT_INTERVAL_MS = 9000;

// Achievements
export interface Achievement {
  key: string;
  name: string;
  desc: string;
  check: (s: ResultStats) => boolean;
}

export interface ResultStats {
  tasksCompleted: number;
  deadlinesMissed: number;
  productivity: number;
  reputation: number;
  stress: number; // peak chaos
  score: number;
  survived: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { key: 'first_blood', name: 'FIRST BLOOD', desc: 'Completed your first task', check: (s) => s.tasksCompleted >= 1 },
  { key: 'deadline_survivor', name: 'DEADLINE SURVIVOR', desc: 'Survived the full round', check: (s) => s.survived },
  { key: 'overachiever', name: 'OVERACHIEVER', desc: 'Completed 15+ tasks', check: (s) => s.tasksCompleted >= 15 },
  { key: 'flawless', name: 'FLAWLESS', desc: 'Missed 0 deadlines', check: (s) => s.deadlinesMissed === 0 && s.survived },
  { key: 'burnout', name: 'BURNOUT', desc: 'Reached max exhaustion', check: (s) => s.stress >= 95 },
  { key: 'rep_destroyer', name: 'REPUTATION CRISIS', desc: 'Reputation below 30', check: (s) => s.reputation < 30 },
  { key: 'machine', name: 'THE MACHINE', desc: 'Completed 25+ tasks', check: (s) => s.tasksCompleted >= 25 },
  { key: 'score_5k', name: 'HIGH PERFORMER', desc: 'Score over 5000', check: (s) => s.score >= 5000 },
];

export function calculateScore(s: ResultStats): number {
  return Math.max(0, Math.round(
    s.tasksCompleted * 250
    - s.deadlinesMissed * 180
    + s.productivity * 30
    + s.reputation * 20
    - s.stress * 5
    + (s.survived ? 1000 : 0)
  ));
}

export function calculateXp(s: ResultStats): number {
  return Math.max(0, Math.round(s.tasksCompleted * 40 + (s.survived ? 200 : 0) + s.productivity * 4));
}
