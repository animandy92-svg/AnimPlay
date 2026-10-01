import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';

const Layout = lazy(() => import('./components/Layout'));
const JoinGame = lazy(() => import('./pages/JoinGame'));
const Lobby = lazy(() => import('./pages/Lobby'));
const PlayerGame = lazy(() => import('./pages/PlayerGame'));
const Results = lazy(() => import('./pages/Results'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateQuiz = lazy(() => import('./pages/CreateQuiz'));
const HostLobby = lazy(() => import('./pages/HostLobby'));
const HostGame = lazy(() => import('./pages/HostGame'));
const Discover = lazy(() => import('./pages/Discover'));
const Groups = lazy(() => import('./pages/Groups'));
const Assignments = lazy(() => import('./pages/Assignments'));
const Reports = lazy(() => import('./pages/Reports'));
const ReportDetail = lazy(() => import('./pages/ReportDetail'));
const Practice = lazy(() => import('./pages/Practice'));

function App() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#15113a] text-white"><div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-300" /></div>}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/join" element={<JoinGame />} />
      <Route path="/practice/:id" element={<Practice />} />
      <Route path="/game/lobby" element={<Lobby />} />
      <Route path="/game/play" element={<PlayerGame />} />
      <Route path="/game/results" element={<Results />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/quiz/new" element={<CreateQuiz />} />
        <Route path="/quiz/:id/edit" element={<CreateQuiz />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/:gameId" element={<ReportDetail />} />
      </Route>

      <Route path="/host/lobby" element={<HostLobby />} />
      <Route path="/host/game" element={<HostGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default App;
