# 암기박스 (Leitner Box) 영단어 학습 앱

교육부 지정 초등 영단어 800개를 라이트너 5-박스 시스템으로 학습하는 React SPA.

## 기술 스택

- React 18 + TypeScript + Vite
- Tailwind CSS v3 (스타일링)
- Dexie (IndexedDB ORM — 카드 상태 영속 저장)
- Zustand (전역 UI 상태)
- Framer Motion (플립 카드 애니메이션)

## 라이트너 5-박스 규칙

| Box | 복습 주기 | 정답 시 | 오답 시 |
|-----|----------|--------|--------|
| 1   | 매 세션   | → Box 2 | Box 1 유지 |
| 2   | 격일      | → Box 3 | → Box 1 |
| 3   | 3일마다   | → Box 4 | → Box 1 |
| 4   | 7일마다 (누적 5회 정답 후 졸업) | 졸업 카운트 +1, 5회 시 → graduated | → Box 1 |
| 5   | (예비 박스) | → graduated | → Box 1 |

- `box4EntryIndex`: Box 4 첫 진입 시 세션 인덱스 기록 (7일 주기 계산용)
- `graduated: true` 카드는 복습 대상에서 제외

## 컴포넌트 구조

```
src/
├── types/
│   └── card.ts          # Card 인터페이스
├── data/
│   └── words.ts         # WORDS[] — 800개 원본 단어 데이터
├── db/
│   └── db.ts            # Dexie DB 정의 (cards 테이블)
├── store/
│   └── useCardStore.ts  # Zustand 스토어
├── hooks/
│   └── useLeitner.ts    # 라이트너 로직 훅
├── components/
│   ├── FlashCard.tsx    # 플립 카드 (Framer Motion)
│   ├── BoxStatus.tsx    # 5-박스 현황 표시
│   ├── StudySession.tsx # 학습 세션 컨트롤러
│   └── Progress.tsx     # 진행률 바
└── App.tsx
```

## 핵심 훅 역할

### `useLeitner`
- 오늘 복습할 카드 목록을 Box별 주기에 따라 필터링
- `answerCard(id, correct)` — 정답/오답 처리 후 DB 업데이트
- 졸업 조건 판정 (Box 4에서 5회 연속 정답)

### `useCardStore` (Zustand)
- `currentCardIndex`: 현재 보고 있는 카드 인덱스
- `isFlipped`: 카드 뒷면(뜻) 표시 여부
- `sessionQueue`: 이번 세션에서 학습할 카드 ID 배열
- `flip()` / `next()` / `initSession(cards)` 액션

## 데이터 초기화

앱 첫 실행 시 `WORDS` 배열을 순회하여 모든 카드를 `box: 1`, `correctCount: 0`, `wrongCount: 0`, `graduated: false` 로 DB에 삽입.
