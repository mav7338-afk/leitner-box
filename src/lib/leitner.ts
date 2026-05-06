import type { Card } from '../types/card';

// 각 박스의 복습 간격 (일 단위)
const BOX_INTERVALS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: Infinity, // Box 5 도달 시 graduated=true이므로 실제로 필터되지 않음
};

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function daysSince(isoDateStr: string): number {
  const then = new Date(isoDateStr);
  then.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

/**
 * 라이트너 암기박스 규칙
 *
 * 정답(isCorrect=true):
 *   Box 1~3 → box + 1 (Box 3→4 전환 시 currentIndex를 box4EntryIndex에 저장)
 *   Box 4   → Box 5 + graduated = true
 *   Box 5   → graduated = true (이미 박스에 있다면 즉시 졸업)
 *
 * 오답(isCorrect=false):
 *   Box 1~3 → box 유지, wrongCount + 1 (store가 세션 큐 맨 뒤로 이동)
 *   Box 4   → box 유지, wrongCount + 1 (store가 큐를 box4EntryIndex 위치로 복귀)
 */
export function reviewCard(card: Card, isCorrect: boolean, currentIndex: number): Card {
  if (isCorrect) {
    if (card.box === 5) {
      return {
        ...card,
        graduated: true,
        correctCount: card.correctCount + 1,
        lastReviewed: todayStr(),
      };
    }

    if (card.box === 4) {
      // Box 4 정답 → Box 5 진입과 동시에 졸업
      return {
        ...card,
        box: 5,
        graduated: true,
        correctCount: card.correctCount + 1,
        lastReviewed: todayStr(),
      };
    }

    if (card.box === 3) {
      // Box 3 정답 → Box 4, 현재 세션 인덱스를 box4EntryIndex로 저장
      return {
        ...card,
        box: 4,
        box4EntryIndex: currentIndex,
        correctCount: card.correctCount + 1,
        lastReviewed: todayStr(),
      };
    }

    // Box 1 또는 2 정답 → box + 1
    return {
      ...card,
      box: (card.box + 1) as 2 | 3,
      correctCount: card.correctCount + 1,
      lastReviewed: todayStr(),
    };
  }

  // ----- 오답 -----
  if (card.box === 4) {
    // 특수 규칙: box 유지, box4EntryIndex 보존 (store가 큐 복귀 처리)
    return { ...card, wrongCount: card.wrongCount + 1 };
  }

  // Box 1~3 오답: box 유지 (store가 세션 큐 맨 뒤로 이동)
  return { ...card, wrongCount: card.wrongCount + 1 };
}

/** 특정 박스에 속한 미졸업 카드 목록 반환 */
export function getBoxCards(allCards: Card[], box: 1 | 2 | 3 | 4 | 5): Card[] {
  return allCards.filter(c => c.box === box && !c.graduated);
}

/** 오늘 복습 대상 카드 필터링 (박스별 간격 기준) */
export function getTodayCards(allCards: Card[]): Card[] {
  return allCards.filter(card => {
    if (card.graduated) return false;
    if (!card.lastReviewed) return true; // 한 번도 복습 안 한 카드는 항상 포함

    return daysSince(card.lastReviewed) >= BOX_INTERVALS[card.box];
  });
}
