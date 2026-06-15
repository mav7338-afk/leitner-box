import Dexie, { type Table } from 'dexie';
import { create } from 'zustand';
import type { Card } from '../types/card';
import { type BadgeId, type BadgeInfo, BADGES } from '../types/badge';
import { WORDS } from '../data/words';
import { reviewCard as leitnerReview, getTodayCards } from '../lib/leitner';

// ─── IndexedDB 스키마 ────────────────────────────────────────────────────────

interface Session {
  id?: number;
  date: string;
  cardsStudied: number;
  correct: number;
  wrong: number;
  durationSeconds: number;
}

class LeitnerDB extends Dexie {
  cards!: Table<Card, number>;
  sessions!: Table<Session, number>;

  constructor() {
    super('leitner-db');
    this.version(1).stores({
      cards: 'id, box, graduated, lastReviewed',
      sessions: '++id, date',
    });
  }
}

export const db = new LeitnerDB();

// ─── 연속 학습일(streak) 계산 ────────────────────────────────────────────────

async function calcStreak(): Promise<number> {
  const sessions = await db.sessions.orderBy('date').toArray();
  if (!sessions.length) return 0;

  const uniqueDates = [...new Set(sessions.map(s => s.date))].sort();

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = uniqueDates.length - 1; i >= 0; i--) {
    const expected = cursor.toISOString().split('T')[0];
    if (uniqueDates[i] === expected) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ─── 뱃지 유틸 ──────────────────────────────────────────────────────────────

function getSeenBadges(): Set<BadgeId> {
  try {
    const raw = localStorage.getItem('seen_badges');
    return new Set<BadgeId>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<BadgeId>();
  }
}

function markBadgeSeen(id: BadgeId): void {
  const seen = getSeenBadges();
  seen.add(id);
  localStorage.setItem('seen_badges', JSON.stringify([...seen]));
}

// ─── 음성 설정 ──────────────────────────────────────────────────────────────

function getVoiceEnabled(): boolean {
  try {
    return localStorage.getItem('voice_enabled') !== 'false';
  } catch {
    return true;
  }
}

interface LastAction {
  prevCard: Card;
  prevQueue: Card[];
  wasCorrect: boolean;
}

// ─── Zustand 스토어 타입 ─────────────────────────────────────────────────────

interface CardStoreState {
  cards: Card[];
  isLoading: boolean;
  todayCards: Card[];
  streakDays: number;
  totalStudyDays: number;
  pendingBadge: BadgeInfo | null;
  voiceEnabled: boolean;
  lastAction: LastAction | null;

  loadCards: () => Promise<void>;
  reviewCard: (id: number, isCorrect: boolean) => Promise<void>;
  undoLastAction: () => Promise<boolean | null>;
  initializeCards: () => Promise<void>;
  resetAll: () => Promise<void>;
  checkSessionBadges: () => Promise<void>;
  dismissBadge: () => void;
  setVoiceEnabled: (enabled: boolean) => void;

  extraQuota: number;
  addExtraQuota: (amount: number) => void;
}

// ─── Zustand 스토어 ──────────────────────────────────────────────────────────

export const useCardStore = create<CardStoreState>()((set, get) => ({
  cards: [],
  isLoading: false,
  todayCards: [],
  streakDays: 0,
  totalStudyDays: 0,
  pendingBadge: null,
  voiceEnabled: getVoiceEnabled(),
  lastAction: null,
  extraQuota: (() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      return parseInt(localStorage.getItem(`extra_quota_${today}`) || '0', 10);
    } catch {
      return 0;
    }
  })(),

  addExtraQuota: (amount: number) => {
    const newQuota = get().extraQuota + amount;
    try {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(`extra_quota_${today}`, String(newQuota));
    } catch {}
    set({ extraQuota: newQuota });
    get().loadCards();
  },

  loadCards: async () => {
    set({ isLoading: true });
    try {
      const cards = await db.cards.toArray();
      const { extraQuota } = get();
      const todayCards = getTodayCards(cards, extraQuota);
      const streakDays = await calcStreak();
      const allDates = await db.sessions.orderBy('date').uniqueKeys();
      const totalStudyDays = allDates.length;
      set({ cards, todayCards, streakDays, totalStudyDays, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  reviewCard: async (id: number, isCorrect: boolean) => {
    const { todayCards, cards } = get();
    const currentIndex = todayCards.findIndex(c => c.id === id);
    if (currentIndex === -1) return;

    const card = todayCards[currentIndex];
    
    // 되돌리기를 위한 백업
    const prevCard = { ...card };
    const prevQueue = [...todayCards];

    const wasBox4 = card.box === 4;
    const updated = leitnerReview(card, isCorrect, currentIndex);

    await db.cards.put(updated);

    const newCards = cards.map(c => (c.id === id ? updated : c));

    const newQueue = [...todayCards];
    newQueue.splice(currentIndex, 1);

    if (isCorrect || updated.graduated) {
      // 정답/졸업: 큐에서 제거
    } else if (wasBox4) {
      const insertAt = Math.min(card.box4EntryIndex ?? 0, newQueue.length);
      newQueue.splice(insertAt, 0, updated);
    } else {
      newQueue.push(updated);
    }

    set({ 
      cards: newCards, 
      todayCards: newQueue,
      lastAction: { prevCard, prevQueue, wasCorrect: isCorrect }
    });
  },

  undoLastAction: async () => {
    const { lastAction, cards } = get();
    if (!lastAction) return null;

    const { prevCard, prevQueue, wasCorrect } = lastAction;

    // DB 원복
    await db.cards.put(prevCard);

    // 전역 카드 상태 원복
    const newCards = cards.map(c => (c.id === prevCard.id ? prevCard : c));

    set({ 
      cards: newCards, 
      todayCards: prevQueue, 
      lastAction: null 
    });

    return wasCorrect;
  },

  checkSessionBadges: async () => {
    const { cards } = get();
    const seen = getSeenBadges();

    const graduated = cards.filter(c => c.graduated).length;
    const box2plus = cards.filter(c => c.box >= 2 || c.graduated).length;
    const sessionCount = await db.sessions.count();
    const streak = await calcStreak();

    let badge: BadgeInfo | null = null;

    if (graduated >= 800 && !seen.has('all_graduated'))
      badge = BADGES.all_graduated;
    else if (graduated >= 10 && !seen.has('ten_graduated'))
      badge = BADGES.ten_graduated;
    else if (box2plus >= 100 && !seen.has('hundred_box2'))
      badge = BADGES.hundred_box2;
    else if (streak >= 7 && !seen.has('week_streak'))
      badge = BADGES.week_streak;
    else if (sessionCount >= 1 && !seen.has('first_step'))
      badge = BADGES.first_step;

    if (badge) {
      set({ pendingBadge: badge });
    }
  },

  dismissBadge: () => {
    const { pendingBadge } = get();
    if (pendingBadge) {
      markBadgeSeen(pendingBadge.id);
      set({ pendingBadge: null });
    }
  },

  setVoiceEnabled: (enabled: boolean) => {
    localStorage.setItem('voice_enabled', String(enabled));
    set({ voiceEnabled: enabled });
  },

  initializeCards: async () => {
    const count = await db.cards.count();
    if (count > 0) return;

    const initial: Card[] = WORDS.map(w => ({
      ...w,
      box: 1 as const,
      correctCount: 0,
      wrongCount: 0,
      graduated: false,
    }));

    await db.cards.bulkAdd(initial);
  },

  resetAll: async () => {
    await db.cards.clear();
    await db.sessions.clear();
    localStorage.removeItem('seen_badges');
    set({ cards: [], todayCards: [], streakDays: 0, totalStudyDays: 0, pendingBadge: null, lastAction: null });
    await get().initializeCards();
    await get().loadCards();
  },
}));
