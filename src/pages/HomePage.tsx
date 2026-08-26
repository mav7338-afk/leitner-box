import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useCardStore } from '../store/useCardStore';
import StreakBadge from '../components/StreakBadge';
import TodayProgress from '../components/TodayProgress';
import BoxStatus from '../components/BoxStatus';
import BadgePopup from '../components/BadgePopup';
import { DECKS, type DeckId } from '../data/decks';


export default function HomePage() {
  const navigate = useNavigate();
  // M2: 필요한 상태만 선택적으로 구독 (voiceEnabled, lastAction 등 무관한 상태 변경 시 리렌더 방지)
  const { 
    activeDeckId, 
    setActiveDeckId, 
    todayCards, 
    cards, 
    streakDays, 
    isLoading, 
    initializeCards, 
    loadCards, 
    startExtraStudy,
    pendingBadge, 
    dismissBadge 
  } = useCardStore(useShallow(s => ({
    activeDeckId: s.activeDeckId,
    setActiveDeckId: s.setActiveDeckId,
    todayCards: s.todayCards,
    cards: s.cards,
    streakDays: s.streakDays,
    isLoading: s.isLoading,
    initializeCards: s.initializeCards,
    loadCards: s.loadCards,
    startExtraStudy: s.startExtraStudy,
    pendingBadge: s.pendingBadge,
    dismissBadge: s.dismissBadge,
  })));

  useEffect(() => {
    initializeCards().then(() => loadCards(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { studiedToday } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let studied = 0;
    for (const c of cards) {
      if (c.lastReviewed === today) studied++;
    }
    return { studiedToday: studied };
  }, [cards]);

  const dueCount = todayCards.length;

  const handleBoxSelect = (boxNum: 1 | 2 | 3 | 4 | 5) => {
    startExtraStudy('box', { boxNum, count: undefined });
    navigate('/study');
  };

  return (
    <>
    {/* C6: AnimatePresence로 감싸야 exit 애니메이션이 동작함 */}
    <AnimatePresence>
      {pendingBadge && <BadgePopup badge={pendingBadge} onDismiss={dismissBadge} />}
    </AnimatePresence>
    <div className="flex flex-col gap-4 p-4 pb-12 max-w-lg mx-auto">
      {/* ── 앱 제목 ── */}
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center pt-4 pb-2 flex flex-col items-center"
      >
        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">암기박스 🗂️</h1>
        
        {/* ── 덱 선택 탭 ── */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 items-center shadow-inner mt-4 max-w-full overflow-x-auto scrollbar-none">
          {(Object.values(DECKS)).map((deck) => (
            <button
              key={deck.id}
              onClick={() => setActiveDeckId(deck.id as DeckId)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeDeckId === deck.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {deck.title}
            </button>
          ))}
        </div>
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

      {/* ── 5-박스 현황 (클릭 가능) ── */}
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
          <BoxStatus cards={cards} onSelectBox={handleBoxSelect} />
        )}
      </motion.div>

      {/* ── 오늘 복습 시작 CTA 버튼 (dueCount > 0 인 경우) ── */}
      {dueCount > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/study')}
          className="w-full py-5 text-2xl font-bold rounded-2xl shadow-xl transition-all mt-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white active:brightness-95 flex items-center justify-center gap-2"
        >
          🚀 오늘 복습 시작! ({dueCount}개)
        </motion.button>
      )}

      {/* ── 정규 복습 완료 배너 (dueCount === 0 인 경우) ── */}
      {dueCount === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.24 }}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl p-5 shadow-lg flex items-center gap-4 mt-1"
        >
          <span className="text-4xl">🎉</span>
          <div>
            <h3 className="text-xl font-bold">오늘 정규 복습 완료!</h3>
            <p className="text-emerald-100 text-xs mt-0.5">
              오늘 목표를 모두 달성했습니다. 언제든지 더 공부할 수 있어요!
            </p>
          </div>
        </motion.div>
      )}


    </div>
    </>
  );
}
