import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import JoinGame from './pages/JoinGame';
import Lobby from './pages/Lobby';
import PlayerGame from './pages/PlayerGame';
import Results from './pages/Results';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import HostLobby from './pages/HostLobby';
import HostGame from './pages/HostGame';
import Discover from './pages/Discover';
import Groups from './pages/Groups';
import Assignments from './pages/Assignments';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/join" element={<JoinGame />} />
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
  );
}

export default App;
