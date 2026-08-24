import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../types/card';
import { useCardStore } from '../store/useCardStore';

interface Props {
  card: Card;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function FlashCard({ card, onCorrect, onWrong }: Props) {
  const [isFlipped, setIsFlipped] = useState(false);
  const voiceEnabled = useCardStore(s => s.voiceEnabled);

  // 새 카드가 마운트될 때 한 번만 리셋 + 자동 발음 (AnimatePresence exiting 중 중복 실행 방지)
  useEffect(() => {
    setIsFlipped(false);
    if (voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      // iOS Safari 버그 우회: cancel() 직후 바로 speak()하면 중복 발음되거나 씹히는 현상 방지
      const timer = setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(card.word);
        utt.lang = 'en-US';
        utt.rate = 0.9;
        window.speechSynthesis.speak(utt);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(card.word);
        utt.lang = 'en-US';
        utt.rate = 0.9;
        window.speechSynthesis.speak(utt);
      }, 50);
    }
  };

  const handleCorrect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCorrect();
  };

  const handleWrong = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWrong();
  };

  return (
    // perspective 컨테이너 — 클릭 시 앞면에서 뒤집기
    <div
      style={{ perspective: '1000px' }}
      onClick={() => { if (!isFlipped) setIsFlipped(true); }}
      className="cursor-pointer w-full select-none"
    >
      <motion.div
        style={{ transformStyle: 'preserve-3d', position: 'relative' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, type: 'spring', stiffness: 260, damping: 28 }}
        className="w-full h-72"
      >
        {/* ── 앞면: 영어 단어 ── */}
        <div
          style={{ backfaceVisibility: 'hidden' }}
          className="absolute inset-0 bg-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-5 px-6"
        >
          <p className="text-4xl font-bold text-gray-800 text-center leading-tight">
            {card.word}
          </p>
          <p className="text-sm text-gray-400">탭해서 뜻 보기 👆</p>
          {voiceEnabled && (
            <button
              onClick={speak}
              className="text-3xl active:scale-90 transition-transform"
              aria-label="발음 듣기"
            >
              🔊
            </button>
          )}
        </div>

        {/* ── 뒷면: 한국어 뜻 + 정/오답 버튼 ── */}
        <div
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          className="absolute inset-0 bg-sky-50 rounded-3xl shadow-lg flex flex-col items-center justify-center gap-5 px-5"
        >
          <p className="text-gray-400 text-base">{card.word}</p>
          <p className="text-3xl font-semibold text-sky-700 text-center leading-snug">
            {card.meaning}
          </p>
          <div className="flex flex-col gap-3 w-full mt-1">
            <button
              onClick={handleCorrect}
              className="bg-green-500 text-white py-4 text-xl w-full rounded-2xl font-bold shadow-md active:brightness-90"
            >
              알았어요 ✅
            </button>
            <button
              onClick={handleWrong}
              className="bg-red-400 text-white py-4 text-xl w-full rounded-2xl font-bold shadow-md active:brightness-90"
            >
              몰랐어요 ❌
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
