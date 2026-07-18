import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

interface HostPlayer {
  playerId: string;
  nickname: string;
}

export default function HostLobby() {
  const [players, setPlayers] = useState<HostPlayer[]>([]);
  const [started, setStarted] = useState(false);
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
    const unsubPlayer = on('player-joined', (data: { playerId: string; nickname: string; playerCount: number }) => {
      setPlayers(prev => {
        if (prev.some(player => player.playerId === data.playerId)) return prev;
        return [...prev, { playerId: data.playerId, nickname: data.nickname }];
      });
    });

    const unsubPlayerLeft = on('player-left', (data: { playerId: string; nickname: string; playerCount: number }) => {
      setPlayers(prev => prev.filter(player => player.playerId !== data.playerId));
    });

    const unsubStarted = on('game-started', () => {
      setStarted(true);
      navigate('/host/game');
    });

    const unsubPlayerList = on('update-player-list', (updatedPlayers: { playerId: string; nickname: string }[]) => {
      setPlayers(updatedPlayers.map((player) => ({ playerId: player.playerId, nickname: player.nickname })));
    });

    return () => {
      unsubPlayer();
      unsubPlayerLeft();
      unsubPlayerList();
      unsubStarted();
    };
  }, [on, navigate]);

  const handleStart = useCallback(() => {
    if (players.length === 0) {
      alert('Wait for at least 1 player to join!');
      return;
    }
    emit('host-start-game', { gameId: Number(gameId) });
  }, [emit, gameId, players.length]);

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

      <div className="bg-white/10 rounded-2xl p-6 w-full max-w-md mb-8">
        <div className="text-white/80 font-bold mb-3">
          Players ({players.length})
        </div>
        <div className="flex flex-col gap-2">
          {players.length === 0 ? (
            <div className="text-white/50">Waiting for players to join...</div>
          ) : (
            players.map((player, i) => (
              <div
                key={player.playerId}
                className="flex items-center justify-between gap-3 bg-white/10 text-white px-4 py-2 rounded-full font-bold animate-bounce-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span>{player.nickname}</span>
                <button
                  type="button"
                  onClick={() => emit('kick-player', { gamePin, playerId: player.playerId })}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full px-3 py-1 text-sm"
                >
                  Kick
                </button>
              </div>
            ))
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
