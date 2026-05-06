export type BadgeId =
  | 'first_step'
  | 'hundred_box2'
  | 'ten_graduated'
  | 'week_streak'
  | 'all_graduated';

export interface BadgeInfo {
  id: BadgeId;
  title: string;
  emoji: string;
}

export const BADGES: Record<BadgeId, BadgeInfo> = {
  first_step:    { id: 'first_step',    title: '첫 발걸음!',  emoji: '🐣' },
  hundred_box2:  { id: 'hundred_box2',  title: '100개 돌파!', emoji: '🚀' },
  ten_graduated: { id: 'ten_graduated', title: '10개 졸업!',  emoji: '🎓' },
  week_streak:   { id: 'week_streak',   title: '1주일 개근!', emoji: '🔥' },
  all_graduated: { id: 'all_graduated', title: '완전 정복!',  emoji: '🏆' },
};
