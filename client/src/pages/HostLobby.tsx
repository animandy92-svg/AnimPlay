import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

interface HostPlayer {
  playerId: string;
  nickname: string;
  teamId?: number;
  character?: string;
}

interface Team {
  id: number;
  name: string;
  color: string;
}

export default function HostLobby() {
  const [players, setPlayers] = useState<HostPlayer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [started, setStarted] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState('#E21B3C');
  const navigate = useNavigate();
  const { emit, on, connected } = useSocket();

  const gamePin = localStorage.getItem('animplay_gamePin') || '';
  const gameId = localStorage.getItem('animplay_gameId') || '';
  const hostData = JSON.parse(localStorage.getItem('animplay_host') || '{}');

  useEffect(() => {
    if (!gamePin || !gameId) {
      navigate('/dashboard');
      return;
    }

    if (connected) {
      emit('host-register', { gamePin, hostId: hostData.id });
    }
  }, [connected, emit, gamePin, gameId, hostData.id, navigate]);

  useEffect(() => {
    const unsubPlayer = on('player-joined', (data: { playerId: string; nickname: string; playerCount: number; teamId?: number; character?: string }) => {
      setPlayers(prev => {
        if (prev.some(player => player.playerId === data.playerId)) return prev;
        return [...prev, { playerId: data.playerId, nickname: data.nickname, teamId: data.teamId, character: data.character }];
      });
    });

    const unsubPlayerLeft = on('player-left', (data: { playerId: string; nickname: string; playerCount: number }) => {
      setPlayers(prev => prev.filter(player => player.playerId !== data.playerId));
    });

    const unsubStarted = on('game-started', () => {
      setStarted(true);
      navigate('/host/game');
    });

  const unsubPlayerList = on('update-player-list', (updatedPlayers: { playerId: string; nickname: string; teamId?: number; character?: string }[]) => {
    setPlayers(updatedPlayers.map((player) => ({ playerId: player.playerId, nickname: player.nickname, teamId: player.teamId, character: player.character })));
  });

    const unsubTeamCreated = on('team-created', (data: { teamId: number; name: string; color: string }) => {
      setTeams(prev => [...prev, { id: data.teamId, name: data.name, color: data.color }]);
    });

    const unsubTeamUpdated = on('team-updated', (data: { teams: Team[] }) => {
      setTeams(data.teams);
    });

    return () => {
      unsubPlayer();
      unsubPlayerLeft();
      unsubPlayerList();
      unsubStarted();
      unsubTeamCreated();
      unsubTeamUpdated();
    };
  }, [on, navigate]);

  const handleCreateTeam = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    emit('create-team', { gamePin, name: teamName.trim(), color: teamColor });
    setTeamName('');
    setShowTeamForm(false);
  }, [emit, gamePin, teamName, teamColor]);

  const handleStart = useCallback(() => {
    if (players.length === 0) {
      alert('Wait for at least 1 player to join!');
      return;
    }
    emit('host-start-game', { gameId: Number(gameId) });
  }, [emit, gameId, players.length]);

  const teamPlayers = (teamId: number) => players.filter(p => p.teamId === teamId);
  const unassignedPlayers = players.filter(p => !p.teamId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-animplay-purple to-animplay-purple-dark flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="font-display text-5xl text-white mb-2">Game PIN</h1>
        <div className="bg-white rounded-3xl py-8 px-16 shadow-2xl animate-pulse-glow">
          <div className="font-display text-8xl text-animplay-purple tracking-[0.3em]">
            {gamePin}
          </div>
        </div>
        <p className="text-white/70 text-lg mt-4">
          Go to the website and enter this PIN
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-4 mb-8">
        <div className="bg-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white/80 font-bold">
              Players ({players.length})
            </div>
            <button
              onClick={() => setShowTeamForm(!showTeamForm)}
              className="bg-animplay-brand text-white font-bold py-1 px-4 rounded-lg text-sm hover:bg-animplay-brand-dark transition-colors"
            >
              + New Team
            </button>
          </div>

          {showTeamForm && (
            <form onSubmit={handleCreateTeam} className="bg-white/10 rounded-xl p-4 mb-4">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name"
                className="w-full py-2 px-3 rounded-lg mb-2 text-white placeholder-white/50 bg-white/10 border border-white/20 focus:border-white/40 focus:outline-none"
              />
              <div className="flex gap-2 mb-2">
                {['#E21B3C', '#26890C', '#4B8BFF', '#FFA500', '#9C27B0', '#00BCD4'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTeamColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${teamColor === color ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button type="submit" className="bg-animplay-green text-white font-bold py-2 px-4 rounded-lg text-sm">
                Create Team
              </button>
            </form>
          )}

          {teams.length > 0 && (
            <div className="space-y-3 mb-4">
              {teams.map(team => (
                <div key={team.id} className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                    <span className="text-white font-bold">{team.name}</span>
                    <span className="text-white/60 text-sm">({teamPlayers(team.id).length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teamPlayers(team.id).map(player => (
                      <span key={player.playerId} className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                        {player.character ? `${player.character} ` : ''}{player.nickname}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {unassignedPlayers.length > 0 && (
            <div>
              <div className="text-white/60 text-sm mb-2">Unassigned</div>
              <div className="flex flex-wrap gap-2">
                {unassignedPlayers.map(player => (
                  <span key={player.playerId} className="bg-white/10 text-white/80 text-xs px-2 py-1 rounded-full">
                    {player.character ? `${player.character} ` : ''}{player.nickname}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={players.length === 0}
        className="bg-animplay-green text-white font-display text-2xl py-5 px-12 rounded-2xl
                   hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   hover:scale-105 transform"
      >
        Start Game
      </button>
    </div>
  );
}
