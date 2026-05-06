import { useNavigate, useLocation } from 'react-router-dom';

interface Tab {
  path: string;
  icon: string;
  label: string;
}

const TABS: Tab[] = [
  { path: '/',         icon: '🏠', label: '홈' },
  { path: '/wordlist', icon: '📚', label: '단어장' },
  { path: '/settings', icon: '⚙️', label: '설정' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto bg-white border-t border-gray-200 px-2 py-2 safe-area-inset-bottom">
        <div className="flex justify-around">
          {TABS.map(tab => {
            const active = pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-colors
                  ${active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <span className="text-2xl leading-none">{tab.icon}</span>
                <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
