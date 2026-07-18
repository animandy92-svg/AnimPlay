import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function Lobby() {
  const [players, setPlayers] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const navigate = useNavigate();
  const { on } = useSocket();

  const nickname = localStorage.getItem('animplay_nickname') || 'Player';

  const handleGameStarted = useCallback(
    (data: { totalQuestions: number }) => {
      setTotalQuestions(data.totalQuestions);
      setStarted(true);
      setTimeout(() => navigate('/game/play'), 2000);
    },
    [navigate]
  );

  useEffect(() => {
    const unsubPlayer = on('player-joined', (data: { playerId: string; nickname: string; playerCount: number }) => {
      setPlayers(prev => {
        if (prev.includes(data.nickname)) return prev;
        return [...prev, data.nickname];
      });
    });

    const unsubPlayerLeft = on('player-left', (data: { playerId: string; nickname: string; playerCount: number }) => {
      setPlayers(prev => prev.filter(n => n !== data.nickname));
    });

    const unsubStarted = on('game-started', handleGameStarted);

    return () => {
      unsubPlayer();
      unsubPlayerLeft();
      unsubStarted();
    };
  }, [on, navigate]);

  if (started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-animplay-blue to-animplay-purple flex items-center justify-center">
        <div className="text-center animate-bounce-in">
          <h1 className="font-display text-6xl text-white mb-4">Game Starting!</h1>
          <p className="text-white/80 text-2xl">{totalQuestions} questions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-animplay-purple to-animplay-purple-dark flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="font-display text-5xl text-white mb-4">Lobby</h1>
        <p className="text-white/80 text-xl">
          Welcome, <span className="font-bold text-white">{nickname}</span>!
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md text-center">
        <div className="mb-6">
          <div className="text-gray-500 font-bold mb-2">Waiting for host to start...</div>
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-animplay-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-animplay-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-animplay-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="text-gray-500 font-bold mb-3">Players in lobby</div>
          <div className="flex flex-wrap justify-center gap-2">
            {players.length === 0 ? (
              <div className="text-gray-400">Waiting for players...</div>
            ) : (
              players.map((p, i) => (
                <div
                  key={p}
                  className="bg-animplay-purple/10 text-animplay-purple px-4 py-2 rounded-full font-bold animate-bounce-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {p}
                </div>
              ))
            )}
          </div>
          {players.length > 0 && (
            <div className="mt-4 text-gray-400">{players.length} player{players.length !== 1 ? 's' : ''}</div>
          )}
        </div>
      </div>
    </div>
  );
}
