import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Component, type ReactNode, type ErrorInfo } from 'react';
import HomePage from './pages/HomePage';
import StudyPage from './pages/StudyPage';
import WordListPage from './pages/WordListPage';
import SettingsPage from './pages/SettingsPage';
import BottomNav from './components/BottomNav';

// ── M7: 컴포넌트 오류 발생 시 흰 화면 대신 안내 UI를 표시하는 ErrorBoundary ──
interface EBState { hasError: boolean; }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center">
          <span className="text-6xl">😵</span>
          <h2 className="text-2xl font-bold text-gray-700">문제가 발생했어요</h2>
          <p className="text-gray-400 text-sm">앱을 새로고침하면 대부분 해결됩니다.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="bg-sky-500 text-white font-bold py-3 px-8 rounded-2xl shadow active:brightness-90"
          >
            새로고침 🔄
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// useLocation은 BrowserRouter 내부에서만 쓸 수 있으므로 내부 컴포넌트로 분리
function AppContent() {
  const { pathname } = useLocation();
  // 학습 화면은 몰입 모드 — BottomNav 숨김
  const showNav = pathname !== '/study';

  return (
    <div className="bg-sky-50 min-h-screen">
      <div className="max-w-md mx-auto min-h-screen">
        {/* 하단 네비게이션 높이만큼 padding 확보 */}
        <main className={showNav ? 'pb-20' : ''}>
          <Routes>
            <Route path="/"         element={<HomePage />} />
            <Route path="/study"    element={<StudyPage />} />
            <Route path="/wordlist" element={<WordListPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* M7: 정의되지 않은 경로는 홈으로 리다이렉트 */}
            <Route path="*"         element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {showNav && <BottomNav />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
