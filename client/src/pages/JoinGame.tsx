import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

interface Team {
  id: number;
  name: string;
  color: string;
}

export default function JoinGame() {
  const [gamePin, setGamePin] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [character, setCharacter] = useState<string | null>(null);
  const navigate = useNavigate();
  const { emit, on } = useSocket();

  const CHARACTERS = ['🦊', '🐱', '🐶', '🦄', '🐸', '🦁', '🐼', '🐨', '🦉', '🐙', '🦋', '🐢'];

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (gamePin.length !== 6) {
      setError('Game PIN must be 6 digits');
      return;
    }
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    setJoining(true);

    const storedSessionId = localStorage.getItem('animplay_player_sessionId');
    const storedGamePin = localStorage.getItem('animplay_player_gamePin');
    const isReconnectAttempt = Boolean(storedSessionId && storedGamePin === gamePin);

    const unsubError = on('error', (data: { message: string }) => {
      if (isReconnectAttempt) {
        localStorage.removeItem('animplay_player_sessionId');
        localStorage.removeItem('animplay_player_gamePin');
        emit('join-game', { gamePin, nickname: nickname.trim() });
        return;
      }

      setError(data.message);
      setJoining(false);
      unsubError();
    });

    const unsubJoinError = on('join-error', (data: { message: string }) => {
      setError(data.message);
      setJoining(false);
      unsubJoinError();
    });

    const unsubConfirm = on('answer-confirmed', (data: { accepted: boolean; playerId?: string; sessionId?: string }) => {
      if (data.accepted) {
        localStorage.setItem('animplay_nickname', nickname);
        localStorage.setItem('animplay_player_gamePin', gamePin);
        if (data.sessionId) {
          localStorage.setItem('animplay_player_sessionId', data.sessionId);
        }
        navigate('/game/lobby');
      }
      unsubError();
      unsubJoinError();
      unsubConfirm();
    });

    const unsubTeamUpdated = on('team-updated', (data: { teams: Team[] }) => {
      setTeams(data.teams);
    });

    if (isReconnectAttempt && storedSessionId) {
      emit('reconnect-player', { sessionId: storedSessionId, nickname: nickname.trim(), gamePin });
    } else {
      emit('join-game', { gamePin, nickname: nickname.trim(), teamId: selectedTeam ?? undefined, character: character ?? undefined });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-animplay-purple to-animplay-purple-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="font-display text-5xl text-white text-center mb-8">
          Join Game
        </h1>

        <form onSubmit={handleJoin} className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <label className="block text-gray-600 font-bold mb-2 text-lg">
              Game PIN
            </label>
            <input
              type="text"
              maxLength={6}
              value={gamePin}
              onChange={(e) => setGamePin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-4xl font-display py-4 border-2 border-gray-200 rounded-xl
                         focus:border-animplay-purple focus:outline-none tracking-[0.5em] transition-colors"
              placeholder="000000"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-600 font-bold mb-2 text-lg">
              Nickname
            </label>
            <input
              type="text"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full text-center text-xl py-4 border-2 border-gray-200 rounded-xl
                         focus:border-animplay-purple focus:outline-none transition-colors"
              placeholder="Your cool nickname"
            />
          </div>

          {teams.length > 0 && (
            <div className="mb-6">
              <label className="block text-gray-600 font-bold mb-2 text-lg">
                Select Team (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    selectedTeam === null ? 'bg-animplay-brand text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  No team
                </button>
                {teams.map(team => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeam(team.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                      selectedTeam === team.id ? 'bg-animplay-brand text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-gray-600 font-bold mb-2 text-lg">
              Choose Character
            </label>
            <div className="flex flex-wrap gap-2 justify-center">
              {CHARACTERS.map(char => (
                <button
                  key={char}
                  type="button"
                  onClick={() => setCharacter(char)}
                  className={`text-3xl w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                    character === char ? 'border-animplay-purple bg-animplay-purple/10 scale-110' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 text-animplay-red font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={joining}
            className="w-full bg-animplay-purple text-white font-display text-2xl py-4 rounded-xl
                       hover:bg-animplay-purple-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? 'Joining...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
