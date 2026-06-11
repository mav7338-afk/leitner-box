# 암기박스 (Leitner Box) 영단어 학습 앱

교육부 지정 초등 영단어 800개를 라이트너 5-박스 시스템으로 학습하는 React SPA.

## 기술 스택

- React 19 + TypeScript + Vite
- Tailwind CSS v3 (스타일링)
- Dexie (IndexedDB ORM — 카드 상태 영속 저장)
- Zustand (전역 UI 상태)
- Framer Motion (플립 카드 애니메이션)
- react-router-dom v7 (클라이언트 사이드 라우팅)
- canvas-confetti (졸업 축하 이펙트)
- vite-plugin-pwa (PWA 지원)
- Vitest (단위 테스트)

## 개발 명령어

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드 (tsc + vite)
npm run test       # Vitest 단위 테스트 (1회 실행)
npm run test:watch # Vitest watch 모드
npm run lint       # ESLint
npm run preview    # 빌드 결과 미리보기
```

## 라이트너 5-박스 규칙

| Box | 복습 간격 | 정답 시 | 오답 시 |
|-----|----------|--------|--------|
| 1   | 1일       | → Box 2 | box 유지 (세션 큐 맨 뒤로 이동) |
| 2   | 2일       | → Box 3 | box 유지 (세션 큐 맨 뒤로 이동) |
| 3   | 4일       | → Box 4 | box 유지 (세션 큐 맨 뒤로 이동) |
| 4   | 8일       | → Box 5 + `graduated=true` 즉시 | box 유지 (큐를 `box4EntryIndex` 위치로 복귀) |
| 5   | (해당 없음) | `graduated=true` | (해당 없음) |

- `box4EntryIndex`: Box 3 → Box 4 전환 시 해당 시점의 세션 인덱스를 저장 (Box 4 오답 시 큐 복귀 위치로 사용)
- `graduated: true` 카드는 복습 대상에서 제외
- 오답 시 box 번호는 변경되지 않음 (이전 박스로 내려가지 않음)

## 컴포넌트 구조

```
src/
├── types/
│   ├── card.ts          # Card, SessionResult 인터페이스
│   └── badge.ts         # BadgeId, BadgeInfo, BADGES 상수
├── data/
│   └── words.ts         # WORDS[] — 800개 원본 단어 데이터
├── lib/
│   ├── leitner.ts       # 라이트너 순수 함수 (reviewCard, getTodayCards, getBoxCards)
│   └── leitner.test.ts  # Vitest 단위 테스트
├── store/
│   └── useCardStore.ts  # Dexie DB 정의 + Zustand 스토어 통합
├── pages/
│   ├── HomePage.tsx     # 오늘 학습 카드 수, streak, 박스 현황
│   ├── StudyPage.tsx    # 플래시카드 학습 (세션 종료 후 DB 저장 + 뱃지 체크)
│   ├── WordListPage.tsx # 전체 단어 목록
│   └── SettingsPage.tsx # 초기화, 음성 설정
└── components/
    ├── FlashCard.tsx    # 플립 카드 (Framer Motion)
    ├── BoxStatus.tsx    # 5-박스 현황 표시
    ├── StudySession.tsx # 학습 세션 컨트롤러
    ├── BottomNav.tsx    # 하단 네비게이션 (/study 에서는 숨김)
    ├── StreakBadge.tsx  # 연속 학습일 표시
    ├── TodayProgress.tsx # 오늘 진행률
    └── BadgePopup.tsx   # 뱃지 획득 팝업
```

## 라우팅 구조

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | HomePage | 오늘 복습 카드 수, streak, 박스별 현황 |
| `/study` | StudyPage | 플래시카드 학습 (BottomNav 숨김) |
| `/wordlist` | WordListPage | 전체 단어 목록 탐색 |
| `/settings` | SettingsPage | 데이터 초기화, 음성 on/off |

## DB 스키마 (Dexie / IndexedDB)

`useCardStore.ts` 안에 `LeitnerDB` 클래스로 정의됨.

```
cards    : id, box, graduated, lastReviewed
sessions : ++id, date, cardsStudied, correct, wrong, durationSeconds
```

세션 종료 시 `StudyPage`에서 `db.sessions.add(...)` 직접 호출.

## localStorage 사용처

| 키 | 값 | 설명 |
|----|-----|------|
| `seen_badges` | `BadgeId[]` (JSON) | 이미 표시한 뱃지 ID 목록 |
| `voice_enabled` | `'true'` / `'false'` | 영어 발음 자동재생 on/off |

## 뱃지 시스템

5종류의 뱃지가 있으며, 세션 종료 후 `checkSessionBadges()` 호출로 조건 판정.
달성 시 `pendingBadge` 상태에 저장 → `BadgePopup`으로 표시 → `dismissBadge()`로 해제.

| ID | 조건 |
|----|------|
| `first_step` | 첫 세션 완료 |
| `hundred_box2` | Box 2 이상 카드 100개 |
| `ten_graduated` | 졸업 카드 10개 |
| `week_streak` | 7일 연속 학습 |
| `all_graduated` | 전체 800개 졸업 |

## 아키텍처 원칙

- `lib/leitner.ts` — 순수 함수만. DB·스토어 의존성 없음. Vitest로 단위 테스트.
- `useCardStore.ts` — Dexie DB 정의와 Zustand 스토어가 한 파일에 통합.
- `useCardStore.reviewCard()` — `leitnerReview()` 순수 함수로 새 카드 상태를 계산한 뒤, 큐 재배치(오답 시 위치 이동)는 스토어에서 처리.

## 핵심 스토어 액션 (`useCardStore`)

| 액션 | 역할 |
|------|------|
| `loadCards()` | DB에서 카드 로드, todayCards 필터링, streak 계산 |
| `reviewCard(id, isCorrect)` | 라이트너 규칙 적용 후 DB 저장 + 세션 큐 재배치 |
| `initializeCards()` | 첫 실행 시 800개 카드를 Box 1으로 DB 삽입 |
| `checkSessionBadges()` | 뱃지 달성 조건 판정 → `pendingBadge` 설정 |
| `dismissBadge()` | 뱃지 팝업 닫기 + localStorage에 표시 완료 기록 |
| `setVoiceEnabled(bool)` | 음성 설정 변경 + localStorage 저장 |
| `resetAll()` | DB 전체 초기화 후 카드 재삽입 |

## 데이터 초기화

앱 첫 실행 시 `initializeCards()`가 `WORDS` 배열을 순회하여 모든 카드를 `box: 1`, `correctCount: 0`, `wrongCount: 0`, `graduated: false` 로 DB에 삽입. 이미 카드가 존재하면 아무 작업도 하지 않음.
