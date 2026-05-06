import { motion } from 'framer-motion';

interface Props {
  streakDays: number;
}

export default function StreakBadge({ streakDays }: Props) {
  const isActive = streakDays > 0;

  return (
    <motion.div
      // pulse: 활성 상태에서만 반복 박동
      animate={isActive ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={isActive ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : {}}
      className={`flex items-center gap-3 rounded-2xl px-5 py-3 w-full justify-center
        ${isActive
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-gray-50 border border-gray-200'}`}
    >
      <span className="text-2xl">{isActive ? '🔥' : '💤'}</span>
      <span className={`font-bold text-base ${isActive ? 'text-amber-700' : 'text-gray-400'}`}>
        {isActive ? `${streakDays}일 연속 학습 중!` : '오늘부터 시작해요!'}
      </span>
    </motion.div>
  );
}
