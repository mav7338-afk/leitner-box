import { useState, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCardStore } from '../store/useCardStore';
import type { Card } from '../types/card';

type BoxFilter = 'all' | '1' | '2' | '3' | '4' | 'graduated';

const BOX_TABS: { key: BoxFilter; label: string }[] = [
  { key: 'all',       label: '전체' },
  { key: '1',         label: 'Box 1' },
  { key: '2',         label: 'Box 2' },
  { key: '3',         label: 'Box 3' },
  { key: '4',         label: 'Box 4' },
  { key: 'graduated', label: '졸업' },
];

function matchesFilter(card: Card, filter: BoxFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'graduated') return card.graduated;
  return !card.graduated && card.box === Number(filter);
}

/** M1: 검색 입력 debounce — 타이핑마다 수천 개 필터링 방지 */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function WordListPage() {
  const { cards } = useCardStore();
  const [query, setQuery] = useState('');
  const [boxFilter, setBoxFilter] = useState<BoxFilter>('all');
  const debouncedQuery = useDebounce(query, 300);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return cards.filter(card => {
      if (!matchesFilter(card, boxFilter)) return false;
      if (!q) return true;
      return card.word.toLowerCase().includes(q) || card.meaning.includes(q);
    });
  }, [cards, debouncedQuery, boxFilter]);

  const total = cards.length;
  const graduated = useMemo(() => cards.filter(c => c.graduated).length, [cards]);

  // M1: 가상 스크롤 설정 — 실제 DOM에는 보이는 항목만 렌더링
  const parentRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 56; // px — 카드 행 높이 (py-3 + 콘텐츠)

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 10, // 화면 밖 위아래로 10개씩 미리 렌더링
  });

  return (
    <div className="p-5 pt-8 flex flex-col gap-4 h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-700 mb-1">단어장 📚</h1>
        <p className="text-gray-400 text-sm">전체 {total}개 · 졸업 {graduated}개</p>
      </div>

      {/* 검색 */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="단어 또는 뜻 검색..."
          className="w-full bg-white rounded-2xl shadow-sm pl-10 pr-4 py-3 text-gray-700 placeholder-gray-300 outline-none focus:ring-2 focus:ring-sky-300"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* 박스 필터 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {BOX_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setBoxFilter(tab.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${boxFilter === tab.key
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-white text-gray-500 shadow-sm'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 결과 카운트 */}
      <p className="text-sm text-gray-400">{filtered.length}개</p>

      {/* M1: 가상 스크롤 컨테이너 — 전체 높이를 고정하고 내부 항목만 렌더링 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
          검색 결과가 없어요 😅
        </div>
      ) : (
        <div
          ref={parentRef}
          className="flex-1 overflow-auto"
          style={{ contain: 'strict' }}
        >
          {/* 전체 목록 높이를 CSS로 확보해야 스크롤바가 올바르게 동작함 */}
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(virtualRow => {
              const card = filtered[virtualRow.index];
              return (
                <div
                  key={card.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '8px',
                  }}
                >
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between h-full">
                    <div className="flex-1 min-w-0 mr-3">
                      <span className="font-semibold text-gray-800">{card.word}</span>
                      <span className="text-gray-400 text-sm ml-2">{card.meaning}</span>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full
                        ${card.graduated
                          ? 'bg-purple-100 text-purple-600'
                          : card.box === 1
                            ? 'bg-gray-100 text-gray-500'
                            : card.box === 2
                              ? 'bg-sky-100 text-sky-600'
                              : card.box === 3
                                ? 'bg-green-100 text-green-600'
                                : 'bg-orange-100 text-orange-600'}`}
                    >
                      {card.graduated ? '졸업' : `Box ${card.box}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
