import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../types/card';

interface Props {
  cards: Card[];
  onSelectBox?: (boxNum: 1 | 2 | 3 | 4 | 5) => void;
}

interface BoxMeta {
  icon: string;
  label: string;
  interval: string;
  bg: string;
  border: string;
  textColor: string;
  numColor: string;
}

const BOX_META: Record<1 | 2 | 3 | 4 | 5, BoxMeta> = {
  1: { icon: '🔴', label: 'Box 1', interval: '매일',    bg: 'bg-red-50',    border: 'border-red-200',    textColor: 'text-red-500',    numColor: 'text-red-600' },
  2: { icon: '🟠', label: 'Box 2', interval: '2일마다', bg: 'bg-orange-50', border: 'border-orange-200', textColor: 'text-orange-500', numColor: 'text-orange-600' },
  3: { icon: '🟡', label: 'Box 3', interval: '4일마다', bg: 'bg-yellow-50', border: 'border-yellow-200', textColor: 'text-yellow-600', numColor: 'text-yellow-700' },
  4: { icon: '🟢', label: 'Box 4', interval: '8일마다', bg: 'bg-green-50',  border: 'border-green-200',  textColor: 'text-green-600',  numColor: 'text-green-700' },
  5: { icon: '🎓', label: '졸업',   interval: '완료',   bg: 'bg-purple-100',border: 'border-purple-300', textColor: 'text-purple-600', numColor: 'text-purple-700' },
};

// 모듈 스코프 상수 (렌더마다 재생성 방지)
const BOXES = ([1, 2, 3, 4, 5] as const);

export default function BoxStatus({ cards, onSelectBox }: Props) {
  // M6: getCount(box) 5회 개별 호출 → useMemo 단일 O(N) 순회로 모든 박스 카운트 집계
  const counts = useMemo(() => {
    const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1|2|3|4|5, number>;
    for (const c of cards) {
      if (c.graduated) result[5]++;
      else if (c.box >= 1 && c.box <= 4) result[c.box as 1|2|3|4]++;
    }
    return result;
  }, [cards]);



  return (
    <div className="bg-white rounded-3xl shadow-md p-5 w-full">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-semibold text-gray-500">박스 현황</p>
        {onSelectBox && (
          <span className="text-xs text-blue-500 font-medium">💡 터치하여 지정 복습</span>
        )}
      </div>

      {/* ── 2열 그리드 (Box 1~4), Box 5는 full-width ── */}
      <div className="grid grid-cols-2 gap-3">
        {BOXES.map((box, i) => {
          const meta = BOX_META[box];
          const count = counts[box];
          const isGrad = box === 5;
          const isClickable = Boolean(onSelectBox && count > 0);

          return (
            <motion.div
              key={box}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={isClickable ? { scale: 1.02 } : {}}
              whileTap={isClickable ? { scale: 0.97 } : {}}
              onClick={() => isClickable && onSelectBox?.(box)}
              className={`
                ${isGrad ? 'col-span-2' : ''}
                ${meta.bg} border ${meta.border} rounded-2xl p-4
                flex ${isGrad ? 'flex-row items-center justify-between px-6' : 'flex-col items-center gap-1'}
                ${isClickable ? 'cursor-pointer hover:shadow-md transition-all' : ''}
              `}
            >
              {/* 아이콘 + 라벨 */}
              <div className={`flex items-center gap-2 ${isGrad ? '' : 'flex-col'}`}>
                <span className="text-xl">{meta.icon}</span>
                <span className={`text-xs font-semibold ${meta.textColor}`}>{meta.label}</span>
              </div>

              {/* 카드 수 */}
              <p className={`font-bold ${isGrad ? 'text-3xl' : 'text-2xl'} ${meta.numColor}`}>
                {count}
              </p>

              {/* 복습 간격 */}
              {isGrad ? (
                <span className="text-purple-400 text-sm">{count}개 졸업 완료 🎓</span>
              ) : (
                <span className={`text-xs ${meta.textColor} opacity-70`}>{meta.interval}</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
