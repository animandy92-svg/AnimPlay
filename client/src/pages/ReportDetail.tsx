import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface GameInfo {
  id: number;
  game_pin: string;
  quiz_title: string;
  started_at: string;
  ended_at: string;
  status: string;
}

interface Result {
  id: number;
  nickname: string;
  score: number;
  correct: number;
  total: number;
  streak: number;
  rank: number;
}

export default function ReportDetail() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameInfo | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gameId) loadReport(Number(gameId));
  }, [gameId]);

  const loadReport = async (id: number) => {
    try {
      const data = await api.reports.detail(id);
      setGame(data.game);
      setResults(data.results);
    } catch {
      alert('Report not found');
      navigate('/reports');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const medalColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400';
    if (rank === 2) return 'bg-gray-400';
    if (rank === 3) return 'bg-orange-400';
    return 'bg-gray-200';
  };

  const medalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!game) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/reports')}
        className="text-animplay-brand hover:text-animplay-brand-dark font-bold mb-6 text-sm"
      >
        ← Back to Reports
      </button>

      <div className="bg-white rounded-2xl p-6 shadow mb-6">
        <h1 className="font-display text-3xl text-gray-800 mb-2">{game.quiz_title}</h1>
        <div className="flex gap-6 text-sm text-gray-500">
          <span>PIN: <strong className="font-mono">{game.game_pin}</strong></span>
          <span>{results.length} players</span>
          <span>{formatDate(game.ended_at)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-center px-4 py-4 text-sm font-bold text-gray-500 uppercase w-16">Rank</th>
              <th className="text-left px-4 py-4 text-sm font-bold text-gray-500 uppercase">Player</th>
              <th className="text-center px-4 py-4 text-sm font-bold text-gray-500 uppercase">Score</th>
              <th className="text-center px-4 py-4 text-sm font-bold text-gray-500 uppercase">Correct</th>
              <th className="text-center px-4 py-4 text-sm font-bold text-gray-500 uppercase">Streak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map(result => (
              <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 text-center">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${medalColor(result.rank)}`}>
                    {result.rank}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{result.nickname}</span>
                    <span>{medalEmoji(result.rank)}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center font-bold text-animplay-accent">
                  {result.score.toLocaleString()}
                </td>
                <td className="px-4 py-4 text-center text-gray-600">
                  {result.correct}/{result.total}
                </td>
                <td className="px-4 py-4 text-center">
                  {result.streak > 0 && (
                    <span className="bg-animplay-orange/10 text-animplay-orange font-bold px-2 py-0.5 rounded-full text-xs">
                      🔥 {result.streak}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
