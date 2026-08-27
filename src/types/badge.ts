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
  description: string;
}

export const BADGES: Record<BadgeId, BadgeInfo> = {
  habit_start:    { id: 'habit_start',    title: '작은 습관의 시작', emoji: '🌱', description: '3일 연속으로 학습을 완료했을 때' },
  habit_master:   { id: 'habit_master',   title: '꾸준함의 달인',   emoji: '🔥', description: '14일 연속으로 학습을 완료했을 때' },
  long_term_mem:  { id: 'long_term_mem',  title: '장기기억 진입',   emoji: '🧠', description: '100개 이상의 단어가 Box 4 이상에 도달했을 때' },
  half_success:   { id: 'half_success',   title: '절반의 고지',     emoji: '⛰️', description: '현재 덱 단어의 절반 이상을 졸업(마스터)시켰을 때' },
  all_graduated:  { id: 'all_graduated',  title: '단어 마스터',     emoji: '🏆', description: '현재 덱의 모든 단어를 졸업시켰을 때' },
};
