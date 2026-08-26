import { useEffect } from 'react';
import { useCardStore } from '../store/useCardStore';
import { DECKS } from '../data/decks';

export default function SettingsPage() {
  const { resetAll, cards, totalStudyDays, voiceEnabled, setVoiceEnabled, activeDeckId, initializeCards, loadCards } = useCardStore();

  // H2 수정: 직접 URL 접근/새로고침 시 cards가 비어있으면 초기화
  useEffect(() => {
    if (cards.length === 0) {
      initializeCards().then(() => loadCards(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const graduated = cards.filter(c => c.graduated).length;
  const total = cards.length;
  const box2plus = cards.filter(c => c.box >= 2 || c.graduated).length;

  const handleReset = () => {
    const ok = window.confirm('모든 학습 기록을 초기화할까요?\n이 작업은 되돌릴 수 없습니다.');
    if (ok) resetAll();
  };

  return (
    <div className="p-5 pt-8 flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-700">설정 ⚙️</h1>

      {/* 학습 통계 */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-500 mb-3">학습 통계</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-sky-500">{total}</p>
            <p className="text-xs text-gray-400 mt-1">전체 단어</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{box2plus}</p>
            <p className="text-xs text-gray-400 mt-1">Box 2 이상</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-500">{graduated}</p>
            <p className="text-xs text-gray-400 mt-1">졸업 완료</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <p className="text-2xl font-bold text-orange-400">{totalStudyDays}</p>
          <p className="text-xs text-gray-400 mt-1">총 학습 일수</p>
        </div>
      </div>

      {/* 학습 설정 */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-500 mb-3">학습 설정</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">발음 듣기 (🔊)</p>
            <p className="text-xs text-gray-400 mt-0.5">카드 앞면에 발음 버튼 표시</p>
          </div>
          <button
            role="switch"
            aria-checked={voiceEnabled}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`relative inline-flex h-7 w-12 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 ring-sky-300 ring-offset-2
              ${voiceEnabled ? 'bg-sky-500' : 'bg-gray-200'}`}
            aria-label="발음 토글"
          >
            <span
              className={`inline-block w-5 h-5 bg-white rounded-full shadow mt-1 transition-transform duration-200
                ${voiceEnabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>

      {/* 앱 정보 */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-500 mb-3">앱 정보</p>
        <div className="flex flex-col gap-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>버전</span>
            <span className="text-gray-400">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>단어 데이터</span>
            <span className="text-gray-400">{DECKS[activeDeckId]?.title ?? '알 수 없음'}</span>
          </div>
          <div className="flex justify-between">
            <span>알고리즘</span>
            <span className="text-gray-400">라이트너 5-박스</span>
          </div>
        </div>
      </div>

      {/* 초기화 */}
      <button
        onClick={handleReset}
        className="bg-red-50 border border-red-200 text-red-500 font-semibold py-4 rounded-2xl w-full text-base"
      >
        학습 기록 초기화 🗑️
      </button>
    </div>
  );
}
