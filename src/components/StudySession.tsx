import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FlashCard from './FlashCard';
import { useCardStore } from '../store/useCardStore';
import type { Card } from '../types/card';
import type { SessionResult } from '../types/card';

interface Props {
  cards: Card[];
  onFinish: (result: SessionResult) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${String(s).padStart(2, '0')}초` : `${s}초`;
}

export default function StudySession({ cards, onFinish }: Props) {
  const { todayCards, reviewCard } = useCardStore();

  // useState 이니셜라이저로 마운트 시 한 번만 캡처
  const [initialTotal] = useState(() => cards.length);

  // 결과 계산용 ref (클로저 stale 방지)
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // 화면 표시용 state
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const current = todayCards[0] as Card | undefined;

  // 세션 큐가 비면 결과 확정
  useEffect(() => {
    if (todayCards.length === 0 && result === null && initialTotal > 0) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setResult({
        correct: correctRef.current,
        wrong: wrongRef.current,
        durationSeconds: elapsed,
        cardsStudied: initialTotal,
      });
    }
  // 의도적으로 todayCards.length와 initialTotal만 감시
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayCards.length, initialTotal]);

  const handleAnswer = async (isCorrect: boolean) => {
    if (reviewing || !current) return;
    setReviewing(true);

    if (isCorrect) {
      correctRef.current++;
      setCorrect(correctRef.current);
    } else {
      wrongRef.current++;
      setWrong(wrongRef.current);
    }

    await reviewCard(current.id, isCorrect);
    setReviewing(false);
  };

  const progress = initialTotal > 0 ? (correct / initialTotal) * 100 : 0;

  // ── 세션 완료 결과 화면 ──
  if (result !== null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="bg-white rounded-3xl shadow-xl p-8 w-full flex flex-col gap-5 text-center"
        >
          <span className="text-6xl">🎉</span>
          <h2 className="text-3xl font-bold text-gray-800">잘했어요!</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-2xl p-5">
              <p className="text-4xl font-bold text-green-500">{result.correct}</p>
              <p className="text-sm text-gray-500 mt-1">정답</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-5">
              <p className="text-4xl font-bold text-red-400">{result.wrong}</p>
              <p className="text-sm text-gray-500 mt-1">오답</p>
            </div>
          </div>

          <div className="bg-sky-50 rounded-2xl p-4">
            <p className="text-2xl font-bold text-sky-500">
              {formatTime(result.durationSeconds)}
            </p>
            <p className="text-sm text-gray-500 mt-1">소요 시간</p>
          </div>

          <p className="text-gray-400 text-sm">
            총 {result.cardsStudied}개 학습
          </p>

          <button
            onClick={() => onFinish(result)}
            className="bg-sky-500 text-white text-xl font-bold py-4 rounded-2xl w-full shadow-md active:brightness-90"
          >
            홈으로 🏠
          </button>
        </motion.div>
      </div>
    );
  }

  if (!current) return null;

  // ── 학습 화면 ──
  return (
    <div className="flex flex-col gap-5 p-4 pt-6">
      {/* 진행 바 */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-green-500 font-semibold">✅ {correct}개</span>
          <span className="text-gray-400">{todayCards.length}개 남음</span>
          <span className="text-red-400 font-semibold">❌ {wrong}개</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <motion.div
            className="bg-blue-400 h-3 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* 박스 뱃지 */}
      <div className="flex justify-center gap-2">
        {([1, 2, 3, 4, 5] as const).map(n => (
          <span
            key={n}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${current.box === n
                ? 'bg-sky-500 text-white shadow'
                : 'bg-gray-200 text-gray-400'}`}
          >
            {n}
          </span>
        ))}
      </div>

      {/* 플래시카드 (카드 전환 슬라이드 애니메이션) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -80, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <FlashCard
            card={current}
            onCorrect={() => handleAnswer(true)}
            onWrong={() => handleAnswer(false)}
          />
        </motion.div>
      </AnimatePresence>

      {/* 처리 중 인디케이터 */}
      <AnimatePresence>
        {reviewing && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-gray-400 text-sm"
          >
            처리 중...
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
