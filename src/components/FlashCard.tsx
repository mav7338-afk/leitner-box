import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../types/card';
import { useCardStore } from '../store/useCardStore';

interface Props {
  card: Card;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function FlashCard({ card, onCorrect, onWrong }: Props) {
  // 상태 변경과 애니메이션 사이의 깜박임을 방지하기 위해 마운트 시점의 카드를 고정
  const [initialCard] = useState(card);
  const [isFlipped, setIsFlipped] = useState(false);
  const voiceEnabled = useCardStore(s => s.voiceEnabled);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 새 카드가 마운트될 때 자동 발음 (AnimatePresence exiting 중 중복 실행 방지)
  useEffect(() => {
    if (voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      // iOS Safari 버그 우회: cancel() 직후 바로 speak()하면 중복 발음되거나 씹히는 현상 방지
      speakTimerRef.current = setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(initialCard.word);
        utt.lang = 'en-US';
        utt.rate = 0.9;
        window.speechSynthesis.speak(utt);
      }, 50);

      return () => {
        if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 언마운트 시 speak 타이머 정리
  useEffect(() => {
    return () => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      speakTimerRef.current = setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(initialCard.word);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
        case 'Enter':
          e.preventDefault();
          if (!isFlipped) setIsFlipped(true);
          break;
        case 'Digit1':
        case 'Numpad1':
        case 'ArrowLeft':
          if (isFlipped) {
            e.preventDefault();
            onWrong();
          }
          break;
        case 'Digit2':
        case 'Numpad2':
        case 'ArrowRight':
          if (isFlipped) {
            e.preventDefault();
            onCorrect();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, onCorrect, onWrong]);

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
          className="absolute inset-0 bg-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-5 px-6 focus:outline-none focus-visible:ring-4 ring-sky-300"
          role="button"
          tabIndex={isFlipped ? -1 : 0}
          aria-hidden={isFlipped}
        >
          <p className="text-4xl font-bold text-gray-800 text-center leading-tight">
            {initialCard.word}
          </p>
          <p className="text-sm text-gray-400">탭해서 뜻 보기 👆</p>
          {voiceEnabled && (
            <button
              onClick={speak}
              tabIndex={isFlipped ? -1 : 0}
              className="text-3xl active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 ring-sky-300 rounded-full"
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
          aria-hidden={!isFlipped}
        >
          <p className="text-gray-400 text-base">{initialCard.word}</p>
          <p className="text-3xl font-semibold text-sky-700 text-center leading-snug">
            {initialCard.meaning}
          </p>
          <div className="flex flex-col gap-3 w-full mt-1">
            <button
              onClick={handleCorrect}
              tabIndex={isFlipped ? 0 : -1}
              className="bg-green-500 text-white py-4 text-xl w-full rounded-2xl font-bold shadow-md active:brightness-90 focus:outline-none focus-visible:ring-4 ring-green-300"
            >
              알았어요 ✅
            </button>
            <button
              onClick={handleWrong}
              tabIndex={isFlipped ? 0 : -1}
              className="bg-red-400 text-white py-4 text-xl w-full rounded-2xl font-bold shadow-md active:brightness-90 focus:outline-none focus-visible:ring-4 ring-red-300"
            >
              몰랐어요 ❌
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
