import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCardStore } from '../store/useCardStore';
import StreakBadge from '../components/StreakBadge';
import TodayProgress from '../components/TodayProgress';
import BoxStatus from '../components/BoxStatus';
import BadgePopup from '../components/BadgePopup';

export default function HomePage() {
  const navigate = useNavigate();
  const { todayCards, cards, streakDays, isLoading, initializeCards, loadCards, pendingBadge, dismissBadge } = useCardStore();

  useEffect(() => {
    initializeCards().then(() => loadCards());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 오늘 날짜(YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  // 오늘 이미 복습한 카드 수 (lastReviewed === today)
  const studiedToday = cards.filter(c => c.lastReviewed === todayStr).length;
  const dueCount = todayCards.length;

  return (
    <>
    {pendingBadge && <BadgePopup badge={pendingBadge} onDismiss={dismissBadge} />}
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* ── 앱 제목 ── */}
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center pt-6 pb-2"
      >
        <h1 className="text-3xl font-bold text-gray-800">암기박스 🗂️</h1>
        <p className="text-gray-400 text-sm mt-1">교육부 지정 초등 영단어 800</p>
      </motion.header>

      {/* ── 연속 학습 뱃지 ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <StreakBadge streakDays={streakDays} />
      </motion.div>

      {/* ── 오늘 학습 현황 ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
      >
        <TodayProgress dueCount={dueCount} studiedToday={studiedToday} />
      </motion.div>

      {/* ── 5-박스 현황 ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="bg-white rounded-3xl shadow-md p-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-sky-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <BoxStatus cards={cards} />
        )}
      </motion.div>

      {/* ── 공부 시작 CTA 버튼 ── */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26 }}
        whileTap={dueCount > 0 ? { scale: 0.97 } : {}}
        onClick={() => { if (dueCount > 0) navigate('/study'); }}
        disabled={dueCount === 0}
        className={`w-full py-5 text-2xl font-bold rounded-2xl shadow-lg transition-colors mt-1
          ${dueCount > 0
            ? 'bg-blue-500 text-white active:brightness-95'
            : 'bg-gray-300 text-gray-400 cursor-not-allowed'}`}
      >
        {dueCount > 0
          ? `오늘 공부 시작! → (${dueCount}개)`
          : '오늘 공부 완료 😊'}
      </motion.button>
    </div>
    </>
  );
}
