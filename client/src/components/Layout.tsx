import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, isHostAccount } from '../services/firebase';
import Icon from './Icon';
const NAV_ITEMS = [
  { path: '/dashboard', label: 'My Quizzes', icon: 'quizzes' },
  { path: '/discover', label: 'Discover', icon: 'discover' },
  { path: '/groups', label: 'Groups', icon: 'groups' },
  { path: '/assignments', label: 'Assignments', icon: 'assignments' },
  { path: '/reports', label: 'Reports', icon: 'reports' },
];
export default function Layout() {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  useEffect(() => onAuthStateChanged(auth, user => {
    void isHostAccount(user).then(ok => { if (!ok) navigate('/login', { replace: true }); setChecking(false); }).catch(() => { navigate('/login', { replace: true }); setChecking(false); });
  }), [navigate]);
  if (checking) return <div className="loading-space" role="status">Opening your workspace…</div>;
  return <Workspace username={auth.currentUser?.displayName || 'Quiz host'} onLogout={async () => { await signOut(auth); localStorage.removeItem('animplay_token'); localStorage.removeItem('animplay_host'); navigate('/'); }} />;
}

export function Workspace({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const current = NAV_ITEMS.find(item => location.pathname.startsWith(item.path))?.label || 'Quiz studio';
  useEffect(() => { setSidebarOpen(false); document.title = `${current} · AnimPlay`; }, [location.pathname, current]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [sidebarOpen]);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    {sidebarOpen && <button aria-label="Close navigation" className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
    <aside id="app-navigation" className={`app-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <Link to="/" className="brand"><span className="brand-mark">A<span>✦</span></span>AnimPlay<span className="brand-dot">.</span></Link>
      <div className="sidebar-caption">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{NAV_ITEMS.map(item => {
        const active = current === item.label;
        return <Link key={item.path} to={item.path} className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span>{active && <span className="nav-dot" />}</Link>;
      })}</nav>
      <div className="sidebar-note"><span className="note-spark">✦</span><strong>A little curiosity.<br />A lot of possibility.</strong><p>Your next great game starts with a question.</p><Link to="/quiz/new">Create something fun <Icon name="arrow" size={16} /></Link></div>
      <div className="sidebar-account"><span className="avatar">{username.slice(0,1).toUpperCase()}</span><div><strong>{username}</strong><span>Host workspace</span></div><button aria-label="Sign out" title="Sign out" onClick={onLogout}><Icon name="logout" size={18} /></button></div>
    </aside>
    <div className="workspace"><header className="workspace-bar"><div className="workspace-breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={sidebarOpen} aria-controls="app-navigation" onClick={() => setSidebarOpen(!sidebarOpen)}><Icon name="menu" /></button><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{current}</strong></div><Link className="join-link" to="/join"><Icon name="play" size={14} /> Join a game</Link></header>
      <main id="main-content" className="workspace-main"><Outlet /></main>
      <footer className="workspace-footer"><span>Made for curious minds.</span><a href="/quiz-sources.html" target="_blank" rel="noreferrer">Question sources & credits ↗</a></footer>
    </div>
  </div>;
}
