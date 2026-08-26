import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudySession from '../components/StudySession';
import { useCardStore } from '../store/useCardStore';
import type { SessionResult } from '../types/card';
import { todayStr } from '../lib/leitner';

export default function StudyPage() {
  const navigate = useNavigate();
  const { todayCards, isLoading, initializeCards, loadCards, addSession } = useCardStore();

  useEffect(() => {
    initializeCards().then(() => {
      if (useCardStore.getState().cards.length === 0) {
        loadCards();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFinish = async (result: SessionResult) => {
    await addSession({
      date: todayStr(),
      cardsStudied: result.cardsStudied,
      correct: result.correct,
      wrong: result.wrong,
      durationSeconds: result.durationSeconds,
    });
    useCardStore.getState().resetExtraStudy();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-lg">불러오는 중...</p>
      </div>
    );
  }

  if (todayCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6 text-center">
        <span className="text-7xl">😊</span>
        <h2 className="text-3xl font-bold text-gray-700">오늘 공부 끝!</h2>
        <p className="text-gray-400 text-lg">내일 다시 만나요</p>
        <button
          onClick={() => {
            useCardStore.getState().resetExtraStudy();
            navigate('/');
          }}
          className="mt-4 bg-sky-500 text-white text-lg font-bold py-4 px-10 rounded-2xl shadow active:brightness-90"
        >
          홈으로 🏠
        </button>
      </div>
    );
  }

  return <StudySession cards={todayCards} onFinish={handleFinish} />;
}
