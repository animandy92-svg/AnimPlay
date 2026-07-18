import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'My Quizzes', icon: '📝' },
  { path: '/discover', label: 'Discover', icon: '🔍' },
  { path: '/groups', label: 'Groups', icon: '👥' },
  { path: '/assignments', label: 'Assignments', icon: '📋' },
  { path: '/reports', label: 'Reports', icon: '📊' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const host = JSON.parse(localStorage.getItem('animplay_host') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('animplay_token');
    localStorage.removeItem('animplay_host');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-animplay-slate text-white z-40
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6">
          <Link to="/" className="font-display text-2xl text-white">AnimPlay</Link>
        </div>

        <nav className="px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-bold transition-colors
                  ${isActive
                    ? 'bg-animplay-brand text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="text-white/50 text-xs mb-2 truncate">{host.username}</div>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white text-xs transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/" className="font-display text-xl text-animplay-brand">AnimPlay</Link>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
