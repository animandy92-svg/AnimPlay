import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Quiz {
  id: number;
  title: string;
  description: string;
  question_count: number;
  created_at: string;
}

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [host, setHost] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('animplay_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const storedHost = localStorage.getItem('animplay_host');
    if (storedHost) setHost(JSON.parse(storedHost));

    loadQuizzes();
  }, [navigate]);

  const loadQuizzes = async () => {
    try {
      const data = await api.quizzes.list();
      setQuizzes(data.quizzes);
    } catch (err) {
      console.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this quiz?')) return;
    try {
      await api.quizzes.delete(id);
      setQuizzes(quizzes.filter(q => q.id !== id));
    } catch (err) {
      alert('Failed to delete quiz');
    }
  };

  const handleStartGame = async (quizId: number) => {
    try {
      const data = await api.games.start(quizId);
      localStorage.setItem('animplay_gamePin', data.gamePin);
      localStorage.setItem('animplay_gameId', data.gameId.toString());
      navigate('/host/lobby');
    } catch (err: any) {
      alert(err.message || 'Failed to start game');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('animplay_token');
    localStorage.removeItem('animplay_host');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-animplay-purple text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link to="/" className="font-display text-3xl">AnimPlay</Link>
          <div className="flex items-center gap-4">
            <span className="text-white/80">{host?.username}</span>
            <button onClick={handleLogout} className="text-white/60 hover:text-white">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display text-4xl text-animplay-purple">My Quizzes</h1>
          <Link
            to="/quiz/new"
            className="bg-animplay-purple text-white font-display text-lg py-3 px-6 rounded-xl
                       hover:bg-animplay-purple-dark transition-colors"
          >
            + Create Quiz
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : quizzes.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 shadow text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="font-display text-2xl text-gray-700 mb-2">No quizzes yet</h2>
            <p className="text-gray-500 mb-6">Create your first quiz to get started!</p>
            <Link
              to="/quiz/new"
              className="bg-animplay-purple text-white font-display text-lg py-3 px-6 rounded-xl
                         hover:bg-animplay-purple-dark transition-colors inline-block"
            >
              Create Quiz
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition-shadow">
                <h3 className="font-bold text-xl text-gray-800 mb-2">{quiz.title}</h3>
                <p className="text-gray-500 text-sm mb-4">{quiz.description || 'No description'}</p>
                <div className="text-sm text-gray-400 mb-4">
                  {quiz.question_count} question{quiz.question_count !== 1 ? 's' : ''}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartGame(quiz.id)}
                    disabled={quiz.question_count === 0}
                    className="flex-1 bg-animplay-green text-white font-bold py-2 px-4 rounded-xl
                               hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Play
                  </button>
                  <Link
                    to={`/quiz/${quiz.id}/edit`}
                    className="flex-1 bg-animplay-blue text-white font-bold py-2 px-4 rounded-xl
                               hover:bg-blue-700 transition-colors text-center text-sm"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    className="bg-animplay-red text-white font-bold py-2 px-4 rounded-xl
                               hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
