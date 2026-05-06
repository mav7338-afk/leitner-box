import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { BadgeInfo } from '../types/badge';

interface Props {
  badge: BadgeInfo;
  onDismiss: () => void;
}

export default function BadgePopup({ badge, onDismiss }: Props) {
  useEffect(() => {
    confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'],
    });
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-5 max-w-xs w-full"
      >
        <motion.span
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: 2, duration: 0.5 }}
          className="text-7xl"
        >
          {badge.emoji}
        </motion.span>

        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">뱃지 획득!</p>
          <h2 className="text-2xl font-bold text-gray-800">{badge.title}</h2>
        </div>

        <button
          onClick={onDismiss}
          className="bg-sky-500 text-white font-bold py-3 rounded-2xl text-lg shadow active:brightness-90 w-full"
        >
          확인 🎉
        </button>
      </motion.div>
    </div>
  );
}
