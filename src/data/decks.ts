import { WORDS } from './words';
import type { Card } from '../types/card';

// 단어 엔트리 타입 (DB 저장 전 원본 데이터)
export type WordEntry = Omit<Card, 'box' | 'lastReviewed' | 'correctCount' | 'wrongCount' | 'box4EntryIndex' | 'graduated'>;

export interface DeckConfig {
  id: string;
  title: string;
  dbName: string;
  /** 덱 전체 단어 수 (뱃지 조건 계산용 — loadWords 없이 즉시 참조 가능) */
  wordCount: number;
  /** 단어 목록을 반환하는 비동기 로더 (NGSL은 dynamic import로 지연 로딩) */
  loadWords: () => Promise<readonly WordEntry[]>;
}

export const DECKS: Record<string, DeckConfig> = {
  elementary: {
    id: 'elementary',
    title: '초등영단어 800',
    dbName: 'leitner-db',
    wordCount: WORDS.length,
    loadWords: async () => WORDS,
  },
  ngsl: {
    id: 'ngsl',
    title: 'NGSL 필수 영단어',
    dbName: 'leitner-db-ngsl',
    wordCount: 2807,
    loadWords: () => import('./ngsl').then(m => m.NGSL_WORDS),
  },
};

export type DeckId = keyof typeof DECKS;
