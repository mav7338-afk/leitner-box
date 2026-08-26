import { motion } from 'framer-motion';

interface Props {
  dueCount: number;
  studiedToday: number;
}

export default function TodayProgress({ dueCount, studiedToday }: Props) {
  const total = dueCount + studiedToday;
  const pct = total > 0 ? studiedToday / total : 0; // 0~1
  const isDone = dueCount === 0 && studiedToday > 0;
  const isEmpty = total === 0;

  return (
    <div className="bg-white rounded-3xl shadow-md p-5 w-full">
      <p className="text-sm font-semibold text-gray-500 mb-4">오늘의 학습</p>

      <div className="flex items-center gap-5">
        {/* ── SVG 원형 진행 바 ── */}
        <div 
          className="relative flex-shrink-0"
          role="progressbar"
          aria-valuenow={Math.round(pct * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="오늘 학습 진행도"
        >
          <svg
            viewBox="0 0 36 36"
            className="w-20 h-20 -rotate-90"
            aria-hidden="true"
          >
            {/* 배경 원 */}
            <circle
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3.5"
            />
            {/* 진행 원 (Framer Motion pathLength) */}
            <motion.circle
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke={isDone ? '#22c55e' : '#60a5fa'}
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: isEmpty ? 0 : pct }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </svg>
          {/* 중앙 퍼센트 텍스트 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-bold ${isDone ? 'text-green-500' : 'text-blue-400'}`}>
              {isEmpty ? '-' : `${Math.round(pct * 100)}%`}
            </span>
          </div>
        </div>

        {/* ── 텍스트 설명 ── */}
        {isDone ? (
          <div>
            <p className="text-xl font-bold text-green-500">오늘 완료! 🎉</p>
            <p className="text-gray-400 text-sm mt-1">{studiedToday}개 학습했어요</p>
          </div>
        ) : isEmpty ? (
          <div>
            <p className="text-base font-bold text-gray-600">복습할 카드 없음</p>
            <p className="text-gray-400 text-sm mt-1">모든 카드가 대기 중이에요</p>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-bold text-blue-500">{dueCount}개</p>
            <p className="text-gray-400 text-sm mt-0.5">남은 복습 카드</p>
            {studiedToday > 0 && (
              <p className="text-green-500 text-sm mt-1">✅ {studiedToday}개 완료</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
