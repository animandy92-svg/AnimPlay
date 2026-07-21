import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  correct: number;
  streak: number;
  character?: string;
}

export default function Results() {
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const navigate = useNavigate();
  const { on } = useSocket();

  useEffect(() => {
    const storedRankings = localStorage.getItem('animplay_finalRankings');
    if (storedRankings) {
      try {
        setRankings(JSON.parse(storedRankings));
      } catch {
        console.error('Failed to parse final rankings');
      }
    }

    const unsubGameEnd = on('game-ended', (data: { finalRankings: LeaderboardEntry[] }) => {
      setRankings(data.finalRankings);
      localStorage.setItem('animplay_finalRankings', JSON.stringify(data.finalRankings));
    });

    return () => unsubGameEnd();
  }, [on]);

  if (rankings.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-animplay-purple to-animplay-purple-dark flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="font-display text-4xl mb-4">Loading results...</h1>
        </div>
      </div>
    );
  }

  const podium = rankings.slice(0, 3);
  const second = podium[1];
  const first = podium[0];
  const third = podium[2];

  return (
    <div className="min-h-screen bg-gradient-to-br from-animplay-purple to-animplay-purple-dark flex flex-col items-center justify-center p-4">
      <h1 className="font-display text-5xl text-white text-center mb-8">
        Final Results
      </h1>

      <div className="flex items-end justify-center gap-4 mb-8">
        {second && (
          <div className="text-center animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="bg-white/10 rounded-2xl p-4 mb-2 w-32">
              <div className="text-4xl mb-1">🥈</div>
              <div className="text-white font-bold text-lg">{second.character ? `${second.character} ` : ''}{second.nickname}</div>
              <div className="text-white/70">{second.score.toLocaleString()}</div>
            </div>
            <div className="bg-white/20 h-24 rounded-t-xl flex items-center justify-center">
              <span className="font-display text-4xl text-white">2</span>
            </div>
          </div>
        )}

        {first && (
          <div className="text-center animate-slide-up" style={{ animationDelay: '0ms' }}>
            <div className="bg-white/10 rounded-2xl p-4 mb-2 w-36">
              <div className="text-5xl mb-1">🥇</div>
              <div className="text-white font-bold text-xl">{first.character ? `${first.character} ` : ''}{first.nickname}</div>
              <div className="text-white/70">{first.score.toLocaleString()}</div>
            </div>
            <div className="bg-animplay-yellow h-32 rounded-t-xl flex items-center justify-center animate-pulse-glow">
              <span className="font-display text-5xl text-white">1</span>
            </div>
          </div>
        )}

        {third && (
          <div className="text-center animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="bg-white/10 rounded-2xl p-4 mb-2 w-32">
              <div className="text-4xl mb-1">🥉</div>
              <div className="text-white font-bold text-lg">{third.character ? `${third.character} ` : ''}{third.nickname}</div>
              <div className="text-white/70">{third.score.toLocaleString()}</div>
            </div>
            <div className="bg-white/20 h-16 rounded-t-xl flex items-center justify-center">
              <span className="font-display text-3xl text-white">3</span>
            </div>
          </div>
        )}
      </div>

      {rankings.length > 3 && (
        <div className="bg-white/10 rounded-2xl p-6 w-full max-w-md mb-8">
          <h3 className="text-white font-bold mb-3">Other Players</h3>
          {rankings.slice(3).map(entry => (
            <div key={entry.rank} className="flex justify-between text-white py-2 border-b border-white/10">
              <span>#{entry.rank} {entry.character ? `${entry.character} ` : ''}{entry.nickname}</span>
              <span className="font-bold">{entry.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        className="bg-white text-animplay-purple font-display text-xl py-4 px-8 rounded-2xl
                   hover:scale-105 transition-transform"
      >
        Play Again
      </button>
    </div>
  );
}
