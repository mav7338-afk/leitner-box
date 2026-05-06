export interface Card {
  id: number;
  word: string;
  meaning: string;
  box: 1 | 2 | 3 | 4 | 5;
  lastReviewed?: string;
  correctCount: number;
  wrongCount: number;
  box4EntryIndex?: number;
  graduated: boolean;
}

export interface SessionResult {
  correct: number;
  wrong: number;
  durationSeconds: number;
  cardsStudied: number;
}
