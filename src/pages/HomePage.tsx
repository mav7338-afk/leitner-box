import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useCardStore } from '../store/useCardStore';
import StreakBadge from '../components/StreakBadge';
import TodayProgress from '../components/TodayProgress';
import BoxStatus from '../components/BoxStatus';
import BadgePopup from '../components/BadgePopup';
import { DECKS, type DeckId } from '../data/decks';
import type { ExtraStudyMode } from '../lib/leitner';

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

  const [selectedCount, setSelectedCount] = useState<number>(20);
  const [showExtraMenu, setShowExtraMenu] = useState<boolean>(false);

  useEffect(() => {
    initializeCards().then(() => loadCards(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // M2: cards 4회 별도 filter → 단일 useMemo로 한 번에 집계
  const { studiedToday, graduatedCount, nonGraduatedCount, unstudiedCount } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let studied = 0, graduated = 0, nonGraduated = 0, unstudied = 0;
    for (const c of cards) {
      if (c.lastReviewed === today) studied++;
      if (c.graduated) graduated++;
      else {
        nonGraduated++;
        if (!c.lastReviewed) unstudied++;
      }
    }
    return { studiedToday: studied, graduatedCount: graduated, nonGraduatedCount: nonGraduated, unstudiedCount: unstudied };
  }, [cards]);

  const dueCount = todayCards.length;

  const handleExtraStudy = (mode: ExtraStudyMode, boxNum?: 1 | 2 | 3 | 4 | 5) => {
    startExtraStudy(mode, { count: selectedCount, boxNum });
    navigate('/study');
  };

  const handleBoxSelect = (boxNum: 1 | 2 | 3 | 4 | 5) => {
    startExtraStudy('box', { boxNum, count: selectedCount });
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

      {/* ── 자율 추가 학습 메뉴 (Always Available) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="bg-white rounded-3xl shadow-md p-5 mt-2 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <div>
              <h2 className="text-base font-bold text-gray-800">공부 더 하기 (자율 학습)</h2>
              <p className="text-xs text-gray-400">일정과 상관없이 원하는 만큼 복습/퀴즈를 진행해요</p>
            </div>
          </div>
          {dueCount > 0 && (
            <button
              onClick={() => setShowExtraMenu(!showExtraMenu)}
              className="text-xs font-semibold text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
            >
              {showExtraMenu ? '접기 ▲' : '열기 ▼'}
            </button>
          )}
        </div>

        {/* dueCount > 0 일 땐 펼침 선택 / dueCount === 0 일 땐 항상 표시 */}
        <AnimatePresence initial={false}>
          {(dueCount === 0 || showExtraMenu) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-4 overflow-hidden"
            >
              {/* 학습 수량 선택 칩 */}
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl">
                <span className="text-xs font-semibold text-gray-500 pl-2">학습 분량:</span>
                {[10, 20, 50, cards.length].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedCount(num)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      selectedCount === num
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {num === cards.length ? '전체' : `${num}개`}
                  </button>
                ))}
              </div>

              {/* 자율 학습 버튼 목록 */}
              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. 미복습 카드 미리 학습 */}
                {nonGraduatedCount > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleExtraStudy('review_ahead')}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl text-left hover:border-blue-300 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">미리 추가 복습하기</p>
                        <p className="text-xs text-gray-500">Box 1~4 카드 중 오래된 순서대로 복습</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full">
                      {Math.min(selectedCount, nonGraduatedCount)}개 시작 ➔
                    </span>
                  </motion.button>
                )}

                {/* 2. 졸업 카드 챌린지 */}
                {graduatedCount > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleExtraStudy('graduated')}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl text-left hover:border-purple-300 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎓</span>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">졸업 카드 기억 점검</p>
                        <p className="text-xs text-gray-500">졸업(Box 5)한 {graduatedCount}개 단어 랜덤 퀴즈</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-purple-600 bg-purple-100 px-3 py-1.5 rounded-full">
                      {Math.min(selectedCount, graduatedCount)}개 시작 ➔
                    </span>
                  </motion.button>
                )}

                {/* 3. 전체 랜덤 퀴즈 */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleExtraStudy('all_random')}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 rounded-2xl text-left hover:border-sky-300 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎲</span>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">전체 무작위 퀴즈</p>
                      <p className="text-xs text-gray-500">전체 {cards.length}개 단어 중 랜덤 테스트</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-sky-600 bg-sky-100 px-3 py-1.5 rounded-full">
                    {Math.min(selectedCount, cards.length)}개 시작 ➔
                  </span>
                </motion.button>

                {/* 4. 새 단어 추가 학습 */}
                {unstudiedCount > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleExtraStudy('new_words')}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl text-left hover:border-emerald-300 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌱</span>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">새 단어 추가 학습</p>
                        <p className="text-xs text-gray-500">아직 시작하지 않은 {unstudiedCount}개 새 단어</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-full">
                      {Math.min(selectedCount, unstudiedCount)}개 시작 ➔
                    </span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    </>
  );
}
