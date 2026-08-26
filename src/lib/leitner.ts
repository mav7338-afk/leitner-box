import type { Card } from '../types/card';

// 각 박스의 복습 간격 (일 단위)
const BOX_INTERVALS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: Infinity, // Box 5 도달 시 graduated=true이므로 실제로 필터되지 않음
};

export function todayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysSince(isoDateStr: string): number {
  const [year, month, day] = isoDateStr.split('-').map(Number);
  const then = new Date(year, month - 1, day);
  then.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - then.getTime()) / 86_400_000);
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
  // 오답 시 Box 1로 강등, wrongCount + 1
  // lastReviewed 갱신하여 오늘 학습 큐에서 제거되고 내일(Box 1 간격인 1일 후) 출제됨
  return { 
    ...card, 
    box: 1,
    wrongCount: card.wrongCount + 1,
    lastReviewed: todayStr()
  };
}

/** 특정 박스에 속한 카드 목록 반환 (Box 5 = 졸업 카드) */
export function getBoxCards(allCards: Card[], box: 1 | 2 | 3 | 4 | 5): Card[] {
  // M3 수정: Box 5 카드는 모두 graduated=true이므로 !c.graduated 조건 대신 별도 처리
  if (box === 5) return allCards.filter(c => c.graduated);
  return allCards.filter(c => c.box === box && !c.graduated);
}

export const DAILY_LIMIT = 200;

/** 오늘 복습 대상 카드 필터링 (박스별 간격 기준 + 일일 제한 옵션 A) */
export function getTodayCards(allCards: Card[], extraQuota: number = 0): Card[] {
  const today = todayStr();
  const studiedToday = allCards.filter(card => card.lastReviewed === today).length;

  // 1. 복습 대상 카드 필터링
  const reviewCards = allCards.filter(card => {
    if (card.graduated) return false;
    if (!card.lastReviewed) return false; // 한 번도 안 본 새 카드는 일단 제외

    return daysSince(card.lastReviewed) >= BOX_INTERVALS[card.box];
  });

  // 2. 남은 할당량 계산 (일일 제한 + 추가 할당량 - 오늘 공부한 카드 수 - 오늘 복습해야 할 카드 수)
  // 복습 카드는 할당량을 초과하더라도 밀리면 안 되므로 무조건 반환합니다
  const remainingQuota = (DAILY_LIMIT + extraQuota) - studiedToday - reviewCards.length;

  if (remainingQuota <= 0) {
    return reviewCards;
  }

  // 3. 남은 할당량만큼 새 단어로 채우기
  const newCards = allCards.filter(card => !card.graduated && !card.lastReviewed);

  return [...reviewCards, ...newCards.slice(0, remainingQuota)];
}

// ─── 자율 추가 학습 유틸 ───────────────────────────────────────────────────

export type ExtraStudyMode = 'review_ahead' | 'box' | 'graduated' | 'all_random' | 'new_words';

/** 복습 일정과 상관없이 이미 학습한 미졸업(Box 1~4) 카드 미리 복습 (Box 낮은 순 → lastReviewed 예전 순) */
export function getReviewAheadCards(allCards: Card[], count: number = 20): Card[] {
  // M2 수정: lastReviewed가 없는 새 단어는 ''로 정렬돼 맨 앞에 오는 버그 방지
  // 한 번이라도 학습한 카드(lastReviewed 있음)만 대상으로 삼음
  const nonGraduated = allCards.filter(c => !c.graduated && c.lastReviewed);
  const sorted = [...nonGraduated].sort((a, b) => {
    if (a.box !== b.box) return a.box - b.box;
    return (a.lastReviewed ?? '').localeCompare(b.lastReviewed ?? '');
  });
  return sorted.slice(0, count);
}

/** 특정 박스(1~5) 카드만 선택하여 복습 */
export function getBoxStudyCards(allCards: Card[], box: 1 | 2 | 3 | 4 | 5, count?: number): Card[] {
  let targetCards: Card[];
  if (box === 5) {
    targetCards = allCards.filter(c => c.graduated);
  } else {
    targetCards = allCards.filter(c => c.box === box && !c.graduated);
  }
  const shuffled = [...targetCards].sort(() => Math.random() - 0.5);
  return count ? shuffled.slice(0, count) : shuffled;
}

/** 졸업(Box 5) 카드 무작위 퀴즈 복습 */
export function getGraduatedPracticeCards(allCards: Card[], count: number = 20): Card[] {
  const graduated = allCards.filter(c => c.graduated);
  const shuffled = [...graduated].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** 전체 카드(1~5) 대상 무작위 퀴즈 */
export function getRandomPracticeCards(allCards: Card[], count: number = 20): Card[] {
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** 새 단어 (lastReviewed 없는 미졸업 카드) */
export function getUnstudiedCards(allCards: Card[], count: number = 20): Card[] {
  const unstudied = allCards.filter(c => !c.graduated && !c.lastReviewed);
  return unstudied.slice(0, count);
}

