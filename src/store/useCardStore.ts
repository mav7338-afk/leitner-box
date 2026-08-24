import Dexie, { type Table } from 'dexie';
import { create } from 'zustand';
import type { Card } from '../types/card';
import { type BadgeId, type BadgeInfo, BADGES } from '../types/badge';
import { DECKS, type DeckId } from '../data/decks';
import { 
  reviewCard as leitnerReview, 
  getTodayCards,
  getReviewAheadCards,
  getBoxStudyCards,
  getGraduatedPracticeCards,
  getRandomPracticeCards,
  getUnstudiedCards,
  type ExtraStudyMode
} from '../lib/leitner';

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

  constructor(dbName: string) {
    super(dbName);
    this.version(1).stores({
      cards: 'id, box, graduated, lastReviewed',
      sessions: '++id, date',
    });
  }
}

// 초기 DB 설정
const savedDeck = localStorage.getItem('active_deck') as DeckId;
const initialDeckId = DECKS[savedDeck] ? savedDeck : 'elementary';
const initialDbName = DECKS[initialDeckId].dbName;
export let db = new LeitnerDB(initialDbName);

// ─── 연속 학습일(streak) 계산 ────────────────────────────────────────────────

async function calcStreak(): Promise<number> {
  const sessions = await db.sessions.orderBy('date').toArray();
  if (!sessions.length) return 0;

  const uniqueDates = [...new Set(sessions.map(s => s.date))].sort();

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // 오늘 학습 안 했으면 어제부터 역추적 (연속 기록 끊김 오해 방지)
  const todayStr = cursor.toISOString().split('T')[0];
  if (!uniqueDates.includes(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

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
  activeDeckId: DeckId;
  setActiveDeckId: (deckId: DeckId) => Promise<void>;
  addSession: (session: Omit<Session, 'id'>) => Promise<void>;

  cards: Card[];
  isLoading: boolean;
  todayCards: Card[];
  isExtraStudyMode: boolean;
  streakDays: number;
  totalStudyDays: number;
  pendingBadge: BadgeInfo | null;
  voiceEnabled: boolean;
  lastAction: LastAction | null;

  loadCards: (forceRefresh?: boolean) => Promise<void>;
  startExtraStudy: (mode: ExtraStudyMode, options?: { count?: number; boxNum?: 1 | 2 | 3 | 4 | 5 }) => void;
  resetExtraStudy: () => void;
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
  activeDeckId: initialDeckId,

  setActiveDeckId: async (deckId: DeckId) => {
    if (get().activeDeckId === deckId) return;
    localStorage.setItem('active_deck', deckId);
    db = new LeitnerDB(DECKS[deckId].dbName);
    set({ activeDeckId: deckId, cards: [], todayCards: [], isExtraStudyMode: false, streakDays: 0, totalStudyDays: 0, pendingBadge: null, lastAction: null });
    await get().initializeCards();
    await get().loadCards(true);
  },

  addSession: async (session) => {
    await db.sessions.add(session);
    await get().checkSessionBadges();
  },

  cards: [],
  isLoading: false,
  todayCards: [],
  isExtraStudyMode: false,
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
    } catch {
      // localStorage 접근 불가 시 무시 (시크릿 모드 등)
    }
    set({ extraQuota: newQuota });
    get().loadCards(true);
  },

  startExtraStudy: (mode: ExtraStudyMode, options?: { count?: number; boxNum?: 1 | 2 | 3 | 4 | 5 }) => {
    const { cards } = get();
    const count = options?.count ?? 20;
    let selected: Card[] = [];

    switch (mode) {
      case 'review_ahead':
        selected = getReviewAheadCards(cards, count);
        break;
      case 'box':
        selected = getBoxStudyCards(cards, options?.boxNum || 1, count);
        break;
      case 'graduated':
        selected = getGraduatedPracticeCards(cards, count);
        break;
      case 'all_random':
        selected = getRandomPracticeCards(cards, count);
        break;
      case 'new_words':
        selected = getUnstudiedCards(cards, count);
        break;
    }

    set({ todayCards: selected, isExtraStudyMode: true, lastAction: null });
  },

  resetExtraStudy: () => {
    set({ isExtraStudyMode: false });
    get().loadCards(true);
  },

  loadCards: async (forceRefresh: boolean = false) => {
    const deckIdAtStart = get().activeDeckId;
    set({ isLoading: true });
    try {
      const cards = await db.cards.toArray();
      // 비동기 작업 중 덱이 전환되었으면 stale 결과 무시
      if (get().activeDeckId !== deckIdAtStart) return;
      const { activeDeckId, isExtraStudyMode, todayCards: currentTodayCards } = get();
      const deckWords = DECKS[activeDeckId].words;
      
      const wordMap = new Map(deckWords.map(w => [w.word, w.meaning]));
      const updates = [];
      for (const c of cards) {
        const newMeaning = wordMap.get(c.word);
        if (newMeaning && c.meaning !== newMeaning) {
          c.meaning = newMeaning;
          updates.push(c);
        }
      }
      if (updates.length > 0) {
        await db.cards.bulkPut(updates);
      }
      
      const { extraQuota } = get();
      const calculatedTodayCards = getTodayCards(cards, extraQuota);
      const streakDays = await calcStreak();
      const allDates = await db.sessions.orderBy('date').uniqueKeys();
      const totalStudyDays = allDates.length;

      // 비동기 작업 중 덱이 전환되었으면 stale 결과 무시
      if (get().activeDeckId !== deckIdAtStart) return;

      const nextTodayCards = (isExtraStudyMode && !forceRefresh && currentTodayCards.length > 0)
        ? currentTodayCards
        : calculatedTodayCards;

      set({ 
        cards, 
        todayCards: nextTodayCards, 
        isExtraStudyMode: forceRefresh ? false : isExtraStudyMode,
        streakDays, 
        totalStudyDays, 
        isLoading: false 
      });
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
      const insertAt = Math.min(card.box4EntryIndex ?? newQueue.length, newQueue.length);
      // 새 객체 참조를 만들어 React(AnimatePresence)가 key 변경을 감지하도록 함
      newQueue.splice(insertAt, 0, { ...updated });
    } else {
      // 새 객체 참조를 만들어 React(AnimatePresence)가 key 변경을 감지하도록 함
      newQueue.push({ ...updated });
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

    const { activeDeckId } = get();
    const totalWords = DECKS[activeDeckId].words.length;
    if (graduated >= totalWords && !seen.has('all_graduated'))
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

    const { activeDeckId } = get();
    const deckWords = DECKS[activeDeckId].words;

    const initial: Card[] = deckWords.map(w => ({
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
