import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useCardStore } from '../store/useCardStore';

import TodayProgress from '../components/TodayProgress';
import BoxStatus from '../components/BoxStatus';
import BadgePopup from '../components/BadgePopup';
import StreakBadge from '../components/StreakBadge';
import { DECKS, type DeckId } from '../data/decks';
import { todayStr } from '../lib/leitner';
import { BADGES } from '../types/badge';
import { getSeenBadges } from '../store/useCardStore';
export default function HomePage() {
  const navigate = useNavigate();
  // M2: 필요한 상태만 선택적으로 구독 (voiceEnabled, lastAction 등 무관한 상태 변경 시 리렌더 방지)
  const { 
    activeDeckId, 
    setActiveDeckId, 
    todayCards, 
    cards, 
    isLoading, 
    initializeCards, 
    loadCards, 
    badgeQueue, 
    dismissBadge,
    streakDays
  } = useCardStore(useShallow(s => ({
    activeDeckId: s.activeDeckId,
    setActiveDeckId: s.setActiveDeckId,
    todayCards: s.todayCards,
    cards: s.cards,
    isLoading: s.isLoading,
    initializeCards: s.initializeCards,
    loadCards: s.loadCards,
    badgeQueue: s.badgeQueue,
    dismissBadge: s.dismissBadge,
    streakDays: s.streakDays,
  })));

  useEffect(() => {
    initializeCards().then(() => loadCards(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { studiedToday } = useMemo(() => {
    const today = todayStr();
    let studied = 0;
    for (const c of cards) {
      if (c.lastReviewed === today) studied++;
    }
    return { studiedToday: studied };
  }, [cards]);

  const seenBadges = useMemo(() => getSeenBadges(activeDeckId), [activeDeckId, badgeQueue]);

  const dueCount = todayCards.length;

  return (
    <>
    {/* C6: AnimatePresence로 감싸야 exit 애니메이션이 동작함 */}
    <AnimatePresence mode="wait">
      {badgeQueue.length > 0 && (
        <BadgePopup key={badgeQueue[0].id} badge={badgeQueue[0]} onDismiss={dismissBadge} />
      )}
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


      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="flex flex-col gap-4"
      >
        {streakDays > 0 && <StreakBadge streakDays={streakDays} />}
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
          <BoxStatus cards={cards} />
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
      {!isLoading && dueCount === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.24 }}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl p-5 shadow-lg flex items-center gap-4 mt-1"
        >
          <span className="text-4xl">🎉</span>
          <div>
            <h3 className="text-xl font-bold">오늘 정규 복습 완료!</h3>
          </div>
        </motion.div>
      )}

      {/* ── 내 뱃지 모음 ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-3xl shadow-md p-5 flex flex-col gap-3 mt-2"
      >
        <h3 className="text-gray-500 font-bold text-sm ml-1">나의 뱃지</h3>
        <div className="flex justify-between items-center px-2">
          {Object.values(BADGES).map(badge => {
            const isEarned = seenBadges.has(badge.id);
            return (
              <div key={badge.id} className="flex flex-col items-center gap-1.5" title={badge.title}>
                <div
                  className={`w-12 h-12 flex items-center justify-center text-2xl rounded-full transition-all duration-300 ${
                    isEarned ? 'bg-amber-100 shadow-sm scale-110' : 'bg-gray-100 grayscale opacity-40'
                  }`}
                >
                  {isEarned ? badge.emoji : '🔒'}
                </div>
                <span className={`text-[10px] font-semibold text-center leading-tight ${isEarned ? 'text-gray-700' : 'text-gray-400'}`}>
                  {badge.title.split(' ').map((word, i) => (
                    <span key={i} className="block">{word}</span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

    </div>
    </>
  );
}
