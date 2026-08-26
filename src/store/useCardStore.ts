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
  todayStr,
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
// C3: let export 대신 내부 변수 + getter 함수로 관리 (stale reference 방지 + 연결 누수 차단)
let _db = new LeitnerDB(initialDbName);
export function getDb(): LeitnerDB { return _db; }

// ─── 연속 학습일(streak) 계산 ────────────────────────────────────────────────

// ─── 연속 학습일(streak) 계산 ────────────────────────────────────────────────

async function calcStreak(): Promise<number> {
  // M3: toArray() 대신 uniqueKeys()로 날짜 문자열만 조회 (세션 수가 많아도 효율적)
  const uniqueDates = (await _db.sessions.orderBy('date').uniqueKeys()) as string[];
  if (!uniqueDates.length) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // 오늘 학습 안 했으면 어제부터 역추적 (연속 기록 끊김 오해 방지)
  const today = todayStr();
  if (!uniqueDates.includes(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  const dateSet = new Set(uniqueDates);

  while (true) {
    const expected = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (dateSet.has(expected)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ─── 뱃지 유틸 ──────────────────────────────────────────────────────────────

// M4 수정: seen_badges를 덱별로 스코핑 — 덱 간 뱃지 달성이 서로 차단되지 않도록
export function getSeenBadges(deckId: string): Set<BadgeId> {
  try {
    const raw = localStorage.getItem(`seen_badges_${deckId}`);
    return new Set<BadgeId>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<BadgeId>();
  }
}

function markBadgeSeen(id: BadgeId, deckId: string): void {
  const seen = getSeenBadges(deckId);
  seen.add(id);
  localStorage.setItem(`seen_badges_${deckId}`, JSON.stringify([...seen]));
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
  accumulateSessionStats: (stats: { cardsStudied: number; correct: number; wrong: number; durationSeconds: number }) => Promise<void>;

  cards: Card[];
  isLoading: boolean;
  todayCards: Card[];
  isExtraStudyMode: boolean;
  streakDays: number;
  totalStudyDays: number;
  // M5 수정: 단일 pendingBadge → badgeQueue 배열 (동시 달성 뱃지를 순서대로 표시)
  badgeQueue: BadgeInfo[];
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
    // C3: 이전 IndexedDB 연결을 닫아 연결 누수 방지
    _db.close();
    _db = new LeitnerDB(DECKS[deckId].dbName);
    set({ activeDeckId: deckId, cards: [], todayCards: [], isExtraStudyMode: false, streakDays: 0, totalStudyDays: 0, badgeQueue: [], lastAction: null });
    await get().initializeCards();
    await get().loadCards(true);
  },

  accumulateSessionStats: async (stats) => {
    const today = todayStr();
    await _db.transaction('rw', _db.sessions, async () => {
      const existing = await _db.sessions.where('date').equals(today).first();
      if (existing && existing.id) {
        const newCardsStudied = Math.max(0, existing.cardsStudied + stats.cardsStudied);
        // M1 수정: Undo로 cardsStudied가 0이 되면 레코드 자체를 삭제
        // → 실제 학습 없는 날이 streak에 카운트되지 않음
        if (newCardsStudied === 0) {
          await _db.sessions.delete(existing.id);
        } else {
          await _db.sessions.update(existing.id, {
            cardsStudied: newCardsStudied,
            correct: Math.max(0, existing.correct + stats.correct),
            wrong: Math.max(0, existing.wrong + stats.wrong),
            durationSeconds: Math.max(0, existing.durationSeconds + stats.durationSeconds),
          });
        }
      } else {
        if (stats.cardsStudied > 0 || stats.durationSeconds > 0) {
          await _db.sessions.add({
            date: today,
            cardsStudied: Math.max(0, stats.cardsStudied),
            correct: Math.max(0, stats.correct),
            wrong: Math.max(0, stats.wrong),
            durationSeconds: Math.max(0, stats.durationSeconds),
          });
        }
      }
    });
    await get().checkSessionBadges();
  },

  cards: [],
  isLoading: false,
  todayCards: [],
  isExtraStudyMode: false,
  streakDays: 0,
  totalStudyDays: 0,
  badgeQueue: [],
  voiceEnabled: getVoiceEnabled(),
  lastAction: null,
  extraQuota: (() => {
    try {
      const today = todayStr();
      return parseInt(localStorage.getItem(`extra_quota_${today}`) || '0', 10);
    } catch {
      return 0;
    }
  })(),

  addExtraQuota: (amount: number) => {
    const newQuota = get().extraQuota + amount;
    try {
      const today = todayStr();
      localStorage.setItem(`extra_quota_${today}`, String(newQuota));

      // M6 수정: 오래된 extra_quota_* 키 정리 (오늘 키만 유지)
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('extra_quota_') && key !== `extra_quota_${today}`) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(k => localStorage.removeItem(k));
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
    // C4 수정: 강제 갱신하지 않아 세션 완료 후 새 단어 무한 충전을 방지
    get().loadCards();
  },

  loadCards: async (forceRefresh: boolean = false) => {
    // Core 5 수정: 자정을 넘겨서 열어둔 경우를 대비해 extraQuota 재확인
    const today = todayStr();
    const freshExtraQuota = parseInt(localStorage.getItem(`extra_quota_${today}`) || '0', 10);
    if (freshExtraQuota !== get().extraQuota) {
      set({ extraQuota: freshExtraQuota });
    }
    
    const deckIdAtStart = get().activeDeckId;
    set({ isLoading: true });
    try {
      const cards = await _db.cards.toArray();
      // C4: 비동기 작업 중 덱이 전환되었으면 stale 결과 무시 (isLoading 해제 필수)
      if (get().activeDeckId !== deckIdAtStart) {
        set({ isLoading: false });
        return;
      }
      const { activeDeckId, isExtraStudyMode, todayCards: currentTodayCards } = get();

      // M4: dynamic import로 지연 로딩된 단어 목록 사용
      const deckWords = await DECKS[activeDeckId].loadWords();

      // M5: 원본 객체를 직접 mutate하지 않고 immutable하게 새 객체 생성
      const wordMap = new Map(deckWords.map(w => [w.word, w.meaning]));
      const updatedCards: Card[] = [];
      const updates: Card[] = [];
      for (const c of cards) {
        const newMeaning = wordMap.get(c.word);
        if (newMeaning && c.meaning !== newMeaning) {
          const updated = { ...c, meaning: newMeaning };
          updates.push(updated);
          updatedCards.push(updated);
        } else {
          updatedCards.push(c);
        }
      }
      if (updates.length > 0) {
        await _db.cards.bulkPut(updates);
      }

      const { extraQuota } = get();
      const calculatedTodayCards = getTodayCards(updatedCards, extraQuota);
      const streakDays = await calcStreak();
      const allDates = await _db.sessions.orderBy('date').uniqueKeys();
      const totalStudyDays = allDates.length;

      // C4: 두 번째 비동기 완료 후에도 덱 전환 확인
      if (get().activeDeckId !== deckIdAtStart) {
        set({ isLoading: false });
        return;
      }

      // C4 수정: 세션 완료 후 새 단어 무한 충전 방지
      // - forceRefresh (addExtraQuota, 덱 전환 등): 전체 재계산 (새 단어 포함)
      // - 비강제 + 큐 비어있음 + 오늘 학습 기록 있음: 복습 예정 카드만 (새 단어 제외)
      // - 비강제 + 큐에 카드 있음: 기존 큐 유지
      // - 비강제 + 큐 비어있음 + 오늘 첫 접속: 전체 재계산 (새 단어 포함)
      let nextTodayCards: Card[];
      if (!forceRefresh && currentTodayCards.length > 0) {
        nextTodayCards = currentTodayCards;
      } else {
        nextTodayCards = calculatedTodayCards;
      }

      set({ 
        cards: updatedCards, 
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
    const { todayCards } = get();
    const currentIndex = todayCards.findIndex(c => c.id === id);
    if (currentIndex === -1) return;

    const card = todayCards[currentIndex];
    
    // 되돌리기를 위한 백업
    const prevCard = { ...card };
    const prevQueue = [...todayCards];

    const wasBox4 = card.box === 4;
    // currentIndex(항상 0)가 아닌 남은 큐 깊이를 전달하여 box4EntryIndex에 의미있는 값이 저장되도록 함
    // Box 3→4 전환 시: 현재 큐 크기를 기록 → Box 4 오답 시 해당 위치로 재삽입
    const queueDepth = todayCards.length - 1;
    const updated = leitnerReview(card, isCorrect, queueDepth);

    await _db.cards.put(updated);

    // H3 수정: await 이후 stale 클로저 방지 — cards, todayCards 모두 최신 state로 재조회
    const currentCards = get().cards;
    const newCards = currentCards.map(c => (c.id === id ? updated : c));

    const freshTodayCards = get().todayCards;
    const freshIndex = freshTodayCards.findIndex(c => c.id === id);
    // 이미 다른 액션이 큐를 변경했다면(예: 빠른 undo) 조용히 종료
    if (freshIndex === -1) {
      set({ cards: newCards });
      return;
    }
    const newQueue = [...freshTodayCards];
    newQueue.splice(freshIndex, 1);

    // 정통 라이트너 시스템: 정답이든 오답이든 학습이 끝난 카드는 오늘 큐에서 제거
    // (오답 카드는 Box 1로 강등되어 내일 다시 출제됨)

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
    await _db.cards.put(prevCard);

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
    const { cards, activeDeckId } = get();
    // M4 수정: 덱별 seen_badges 조회
    const seen = getSeenBadges(activeDeckId);

    const graduated = cards.filter(c => c.graduated).length;
    const streak = await calcStreak();

    const totalWords = DECKS[activeDeckId].wordCount;

    // M5 수정: if/else if → 전체 조건 평가해 미표시 뱃지를 모두 수집
    const newBadges: BadgeInfo[] = [];
    if (graduated >= totalWords && !seen.has('all_graduated'))
      newBadges.push(BADGES.all_graduated);
    if (graduated >= totalWords / 2 && !seen.has('half_success'))
      newBadges.push(BADGES.half_success);
    
    const box4plus = cards.filter(c => c.box >= 4 || c.graduated).length;
    if (box4plus >= 100 && !seen.has('long_term_mem'))
      newBadges.push(BADGES.long_term_mem);
      
    if (streak >= 14 && !seen.has('habit_master'))
      newBadges.push(BADGES.habit_master);
    if (streak >= 3 && !seen.has('habit_start'))
      newBadges.push(BADGES.habit_start);

    if (newBadges.length > 0) {
      // 기존 큐에 새 뱃지를 이어붙임 (이미 큐에 있는 것은 중복 방지)
      const existingQueue = get().badgeQueue;
      const existingIds = new Set(existingQueue.map(b => b.id));
      const toAdd = newBadges.filter(b => !existingIds.has(b.id));
      if (toAdd.length > 0) {
        set({ badgeQueue: [...existingQueue, ...toAdd] });
      }
    }
  },

  dismissBadge: () => {
    const { badgeQueue, activeDeckId } = get();
    if (badgeQueue.length === 0) return;
    const [dismissed, ...rest] = badgeQueue;
    // M4 수정: 덱별 seen_badges에 기록
    markBadgeSeen(dismissed.id, activeDeckId);
    set({ badgeQueue: rest });
  },

  setVoiceEnabled: (enabled: boolean) => {
    localStorage.setItem('voice_enabled', String(enabled));
    set({ voiceEnabled: enabled });
  },

  initializeCards: async () => {
    const count = await _db.cards.count();
    if (count > 0) return;

    const { activeDeckId } = get();
    // M4: dynamic import로 단어 목록 로딩
    const deckWords = await DECKS[activeDeckId].loadWords();

    const initial: Card[] = deckWords.map(w => ({
      ...w,
      box: 1 as const,
      correctCount: 0,
      wrongCount: 0,
      graduated: false,
    }));

    await _db.cards.bulkAdd(initial);
  },

  resetAll: async () => {
    await _db.cards.clear();
    await _db.sessions.clear();
    // M4 수정: 현재 덱의 seen_badges만 삭제 (다른 덱 뱃지는 보존)
    const { activeDeckId } = get();
    localStorage.removeItem(`seen_badges_${activeDeckId}`);
    set({ cards: [], todayCards: [], streakDays: 0, totalStudyDays: 0, badgeQueue: [], lastAction: null });
    await get().initializeCards();
    await get().loadCards();
  },
}));
