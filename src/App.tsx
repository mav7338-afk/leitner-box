import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import StudyPage from './pages/StudyPage';
import WordListPage from './pages/WordListPage';
import SettingsPage from './pages/SettingsPage';
import BottomNav from './components/BottomNav';

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
      <AppContent />
    </BrowserRouter>
  );
}
