import { describe, it, expect } from 'vitest';
import { reviewCard, getBoxCards, getTodayCards, todayStr } from './leitner';
import type { Card } from '../types/card';

function makeCard(box: 1 | 2 | 3 | 4 | 5, overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    word: 'test',
    meaning: '테스트',
    box,
    correctCount: 0,
    wrongCount: 0,
    graduated: false,
    ...overrides,
  };
}

// ─── reviewCard ───────────────────────────────────────────────────────────────

describe('reviewCard — 정답 처리', () => {
  it('Box 1 정답 → Box 2 이동', () => {
    const card = makeCard(1);
    const result = reviewCard(card, true, 0);
    expect(result.box).toBe(2);
    expect(result.correctCount).toBe(1);
    expect(result.graduated).toBe(false);
  });

  it('Box 2 정답 → Box 3 이동', () => {
    const result = reviewCard(makeCard(2), true, 1);
    expect(result.box).toBe(3);
  });

  it('Box 3 정답 → Box 4 이동, box4EntryIndex 저장', () => {
    const result = reviewCard(makeCard(3), true, 5);
    expect(result.box).toBe(4);
    expect(result.box4EntryIndex).toBe(5);
    expect(result.correctCount).toBe(1);
  });

  it('Box 4 정답 → Box 5 이동 + graduated = true', () => {
    const card = makeCard(4, { box4EntryIndex: 3 });
    const result = reviewCard(card, true, 8);
    expect(result.box).toBe(5);
    expect(result.graduated).toBe(true);
    expect(result.correctCount).toBe(1);
  });

  it('Box 5 정답 → graduated = true (이미 최고 박스)', () => {
    const card = makeCard(5);
    const result = reviewCard(card, true, 0);
    expect(result.graduated).toBe(true);
    expect(result.correctCount).toBe(1);
  });

  it('정답 시 lastReviewed를 오늘 날짜(로컬)로 갱신', () => {
    // M7 수정: toISOString()은 UTC 기준 → KST 오전에 날짜 불일치. todayStr()(로컬)로 비교
    const result = reviewCard(makeCard(1), true, 0);
    expect(result.lastReviewed).toBe(todayStr());
  });
});

describe('reviewCard — 오답 처리', () => {
  it('Box 1 오답 → Box 1 유지, wrongCount + 1, lastReviewed 오늘로 갱신', () => {
    const result = reviewCard(makeCard(1), false, 0);
    expect(result.box).toBe(1);
    expect(result.wrongCount).toBe(1);
    expect(result.correctCount).toBe(0);
    expect(result.lastReviewed).toBe(todayStr());
  });

  it('Box 3 오답 → Box 1로 강등, wrongCount + 1', () => {
    const result = reviewCard(makeCard(3), false, 2);
    expect(result.box).toBe(1);
    expect(result.wrongCount).toBe(1);
  });

  it('Box 4 오답 → Box 1로 강등, wrongCount + 1', () => {
    const card = makeCard(4, { box4EntryIndex: 2 });
    const result = reviewCard(card, false, 7);

    expect(result.box).toBe(1);
    expect(result.wrongCount).toBe(1);
  });

  it('오답 시 lastReviewed가 갱신되어 오늘 학습 큐에서 제거됨', () => {
    const card = makeCard(1, { lastReviewed: '2026-01-01' });
    const result = reviewCard(card, false, 0);
    expect(result.lastReviewed).toBe(todayStr());
  });
});

// ─── getBoxCards ──────────────────────────────────────────────────────────────

describe('getBoxCards', () => {
  const cards: Card[] = [
    makeCard(1, { id: 1 }),
    makeCard(1, { id: 2 }),
    makeCard(2, { id: 3 }),
    makeCard(3, { id: 4, graduated: true }),
  ];

  it('Box 1 카드를 올바르게 필터링', () => {
    expect(getBoxCards(cards, 1)).toHaveLength(2);
  });

  it('graduated 카드는 제외', () => {
    expect(getBoxCards(cards, 3)).toHaveLength(0);
  });
});

// ─── getTodayCards ────────────────────────────────────────────────────────────

describe('getTodayCards', () => {
  // M7 수정: toISOString()은 UTC 기준 → KST 오전에 날짜가 하루 어긋남
  // 로컬 날짜(getFullYear/getMonth/getDate)로 계산
  const past = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  it('lastReviewed 없는 카드는 항상 포함', () => {
    const card = makeCard(1, { id: 1 });
    expect(getTodayCards([card], 200)).toHaveLength(1);
  });

  it('graduated 카드는 제외', () => {
    const card = makeCard(1, { id: 1, graduated: true });
    expect(getTodayCards([card], 200)).toHaveLength(0);
  });

  it('Box 1(간격 1일): 1일 경과 시 포함', () => {
    const card = makeCard(1, { id: 1, lastReviewed: past(1) });
    expect(getTodayCards([card], 200)).toHaveLength(1);
  });

  it('Box 1(간격 1일): 오늘 복습했으면 제외', () => {
    const card = makeCard(1, { id: 1, lastReviewed: past(0) });
    expect(getTodayCards([card], 200)).toHaveLength(0);
  });

  it('Box 2(간격 2일): 1일 경과는 제외, 2일 경과는 포함', () => {
    const notYet = makeCard(2, { id: 1, lastReviewed: past(1) });
    const ready  = makeCard(2, { id: 2, lastReviewed: past(2) });
    expect(getTodayCards([notYet], 200)).toHaveLength(0);
    expect(getTodayCards([ready], 200)).toHaveLength(1);
  });

  it('Box 4(간격 8일): 7일 경과는 제외, 8일 경과는 포함', () => {
    const notYet = makeCard(4, { id: 1, lastReviewed: past(7) });
    const ready  = makeCard(4, { id: 2, lastReviewed: past(8) });
    expect(getTodayCards([notYet], 200)).toHaveLength(0);
    expect(getTodayCards([ready], 200)).toHaveLength(1);
  });
});

// ─── 자율 추가 학습 유틸 테스트 ──────────────────────────────────────────

describe('자율 추가 학습 유틸', () => {
  const cards: Card[] = [
    makeCard(1, { id: 1, lastReviewed: '2026-07-20' }),
    makeCard(2, { id: 2, lastReviewed: '2026-07-25' }),
    makeCard(3, { id: 3, lastReviewed: '2026-07-27' }),
    makeCard(5, { id: 4, graduated: true }),
    makeCard(5, { id: 5, graduated: true }),
  ];

  it('getReviewAheadCards — 미졸업 카드를 Box 낮은 순으로 가져옴', () => {
    const result = import('./leitner').then(({ getReviewAheadCards }) => {
      const res = getReviewAheadCards(cards, 2);
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe(1);
      expect(res[1].id).toBe(2);
    });
    return result;
  });

  it('getBoxStudyCards — 지정한 박스 카드만 반환', () => {
    const result = import('./leitner').then(({ getBoxStudyCards }) => {
      const res1 = getBoxStudyCards(cards, 1);
      expect(res1).toHaveLength(1);
      expect(res1[0].id).toBe(1);

      const res5 = getBoxStudyCards(cards, 5);
      expect(res5).toHaveLength(2);
      expect(res5.every(c => c.graduated)).toBe(true);
    });
    return result;
  });

  it('getGraduatedPracticeCards — 졸업 카드만 반환', () => {
    const result = import('./leitner').then(({ getGraduatedPracticeCards }) => {
      const res = getGraduatedPracticeCards(cards, 1);
      expect(res).toHaveLength(1);
      expect(res[0].graduated).toBe(true);
    });
    return result;
  });

  it('getRandomPracticeCards — 전체 카드 중 요청 수량만큼 반환', () => {
    const result = import('./leitner').then(({ getRandomPracticeCards }) => {
      const res = getRandomPracticeCards(cards, 3);
      expect(res).toHaveLength(3);
    });
    return result;
  });
});

