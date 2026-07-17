import { WORDS } from './words';
import { NGSL_WORDS } from './ngsl';

export const DECKS = {
  elementary: {
    id: 'elementary',
    title: '초등영단어 800',
    words: WORDS,
    dbName: 'leitner-db',
  },
  ngsl: {
    id: 'ngsl',
    title: 'NGSL 필수 영단어',
    words: NGSL_WORDS,
    dbName: 'leitner-db-ngsl',
  }
} as const;

export type DeckId = keyof typeof DECKS;
