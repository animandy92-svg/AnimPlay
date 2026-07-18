import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

interface Report {
  id: number;
  game_pin: string;
  quiz_title: string;
  started_at: string;
  ended_at: string;
  player_count: number;
  top_score: number;
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await api.reports.list();
      setReports(data.reports);
    } catch {
      console.error('Failed to load reports');
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-4xl text-animplay-brand mb-6">Game Reports</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="font-display text-2xl text-gray-700 mb-2">No reports yet</h2>
          <p className="text-gray-500">Finished games will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-500 uppercase">Quiz</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-500 uppercase">Date</th>
                <th className="text-center px-6 py-4 text-sm font-bold text-gray-500 uppercase">Players</th>
                <th className="text-center px-6 py-4 text-sm font-bold text-gray-500 uppercase">Top Score</th>
                <th className="text-center px-6 py-4 text-sm font-bold text-gray-500 uppercase">PIN</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map(report => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-800">{report.quiz_title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(report.ended_at)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-animplay-brand/10 text-animplay-brand font-bold px-3 py-1 rounded-full text-sm">
                      {report.player_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-animplay-accent">{report.top_score.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center font-mono text-sm text-gray-400">{report.game_pin}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/reports/${report.id}`}
                      className="text-animplay-brand hover:text-animplay-brand-dark font-bold text-sm"
                    >
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
