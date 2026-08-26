export type BadgeId =
  | 'habit_start'
  | 'habit_master'
  | 'long_term_mem'
  | 'half_success'
  | 'all_graduated';

export interface BadgeInfo {
  id: BadgeId;
  title: string;
  emoji: string;
}

export const BADGES: Record<BadgeId, BadgeInfo> = {
  habit_start:    { id: 'habit_start',    title: '작은 습관의 시작', emoji: '🌱' },
  habit_master:   { id: 'habit_master',   title: '꾸준함의 달인',   emoji: '🔥' },
  long_term_mem:  { id: 'long_term_mem',  title: '장기기억 진입',   emoji: '🧠' },
  half_success:   { id: 'half_success',   title: '절반의 고지',     emoji: '⛰️' },
  all_graduated:  { id: 'all_graduated',  title: '단어 마스터',     emoji: '🏆' },
};
