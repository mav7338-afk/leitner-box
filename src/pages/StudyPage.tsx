import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudySession from '../components/StudySession';
import { useCardStore } from '../store/useCardStore';

export default function StudyPage() {
  const navigate = useNavigate();
  const { todayCards, isLoading, initializeCards, loadCards } = useCardStore();

  // H1 수정: 초기화 완료 전에 "오늘 공부 끝!" 화면이 잠깐 표시되는 flash 방지
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeCards().then(() => {
      // cards 유무와 관계없이 항상 loadCards 호출하여 todayCards를 채움
      return loadCards(false);
    }).then(() => {
      setInitialized(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFinish = async () => {
    // Session stats are now accumulated card-by-card in StudySession.tsx
    // so we no longer need to save the result here.
    useCardStore.getState().loadCards();
    navigate('/');
  };

  // 초기화 완료 전 또는 로딩 중에는 스피너 표시 (flash 방지)
  if (!initialized || isLoading) {
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
            useCardStore.getState().loadCards();
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
