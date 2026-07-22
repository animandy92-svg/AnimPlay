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
    <div className="relative min-h-screen flex">
      <div className="absolute inset-0 bg-gradient-to-br from-[#512da8] via-[#9c27b0] via-[30%] via-[#ff1744] via-[60%] to-[#3f51b5] bg-[length:400%_400%] animate-gradient-bg" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 text-white z-40
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
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
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
          <div className="text-white/70 text-xs mb-2 truncate">{host.username}</div>
          <button
            onClick={handleLogout}
            className="text-white/50 hover:text-white text-xs transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="relative z-10 flex-1 flex flex-col min-h-screen">
        <header className="bg-black/10 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/" className="font-display text-xl text-white">AnimPlay</Link>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
