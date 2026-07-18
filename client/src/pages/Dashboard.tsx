import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Quiz {
  id: number;
  title: string;
  description: string;
  question_count: number;
  status: string;
  is_favorite: number;
  deleted_at: string | null;
  created_at: string;
}

interface Folder {
  id: number;
  name: string;
}

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizTab, setQuizTab] = useState('recent');
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('animplay_token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadFolders();
  }, [navigate]);

  useEffect(() => {
    loadQuizzes();
  }, [quizTab, selectedFolder]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const data = await api.quizzes.list(
        selectedFolder ? undefined : quizTab,
        selectedFolder ?? undefined
      );
      setQuizzes(data.quizzes);
    } catch {
      console.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const data = await api.folders.list();
      setFolders(data.folders);
    } catch {
      console.error('Failed to load folders');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Move this quiz to trash?')) return;
    try {
      await api.quizzes.delete(id);
      setQuizzes(quizzes.filter(q => q.id !== id));
    } catch {
      alert('Failed to delete quiz');
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm('Permanently delete this quiz? This cannot be undone.')) return;
    try {
      await api.quizzes.permanentDelete(id);
      setQuizzes(quizzes.filter(q => q.id !== id));
    } catch {
      alert('Failed to delete quiz');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.quizzes.restore(id);
      setQuizzes(quizzes.filter(q => q.id !== id));
    } catch {
      alert('Failed to restore quiz');
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

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const data = await api.folders.create(newFolderName);
      setFolders([...folders, data.folder]);
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create folder');
    }
  };

  const handleDeleteFolder = async (id: number) => {
    if (!confirm('Delete this folder? Quizzes will not be deleted.')) return;
    try {
      await api.folders.delete(id);
      setFolders(folders.filter(f => f.id !== id));
      if (selectedFolder === id) setSelectedFolder(null);
    } catch {
      alert('Failed to delete folder');
    }
  };

  const handleToggleFavorite = async (quiz: Quiz) => {
    try {
      await api.quizzes.update(quiz.id, {});
      const newFav = quiz.is_favorite ? 0 : 1;
      await api.quizzes.update(quiz.id, {} as any);
      setQuizzes(quizzes.map(q => q.id === quiz.id ? { ...q, is_favorite: newFav } : q));
    } catch {
      console.error('Failed to toggle favorite');
    }
  };

  const QUIZ_TABS = [
    { key: 'recent', label: 'All' },
    { key: 'drafts', label: 'Drafts' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'trash', label: 'Trash' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h1 className="font-display text-4xl text-animplay-brand">My Quizzes</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/quiz/new"
            className="bg-animplay-brand text-white font-display text-lg py-3 px-6 rounded-xl
                       hover:bg-animplay-brand-dark transition-colors"
          >
            + Create Quiz
          </Link>
          <Link
            to="/quiz/new?sample=true"
            className="bg-white border border-animplay-brand text-animplay-brand font-display text-lg py-3 px-6 rounded-xl
                       hover:bg-animplay-brand/10 transition-colors"
          >
            Load Sample Quiz
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {QUIZ_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setQuizTab(t.key); setSelectedFolder(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              !selectedFolder && quizTab === t.key
                ? 'bg-animplay-brand text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="w-px bg-gray-300 mx-1" />

        {folders.map(folder => (
          <div key={folder.id} className="flex items-center gap-1">
            <button
              onClick={() => { setSelectedFolder(folder.id); setQuizTab('recent'); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                selectedFolder === folder.id
                  ? 'bg-animplay-accent text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              📁 {folder.name}
            </button>
            <button
              onClick={() => handleDeleteFolder(folder.id)}
              className="text-gray-400 hover:text-animplay-red text-xs"
            >
              ×
            </button>
          </div>
        ))}

        {showNewFolder ? (
          <form onSubmit={handleCreateFolder} className="flex gap-1 items-center">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              autoFocus
              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm w-32 focus:border-animplay-brand focus:outline-none"
            />
            <button type="submit" className="text-animplay-brand font-bold text-sm px-2">✓</button>
            <button type="button" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="text-gray-400 text-sm px-1">✕</button>
          </form>
        ) : (
          <button
            onClick={() => setShowNewFolder(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            + Folder
          </button>
        )}
      </div>

      {selectedFolder && (
        <button
          onClick={() => setSelectedFolder(null)}
          className="text-animplay-brand hover:text-animplay-brand-dark text-sm font-bold mb-4"
        >
          ← Back to all quizzes
        </button>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="font-display text-2xl text-gray-700 mb-2">
            {quizTab === 'trash' ? 'Trash is empty' : 'No quizzes yet'}
          </h2>
          <p className="text-gray-500 mb-6">
            {quizTab === 'trash' ? 'Deleted quizzes will appear here' : 'Create your first quiz to get started!'}
          </p>
          {quizTab !== 'trash' && (
            <Link
              to="/quiz/new"
              className="bg-animplay-brand text-white font-display text-lg py-3 px-6 rounded-xl
                         hover:bg-animplay-brand-dark transition-colors inline-block"
            >
              Create Quiz
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-xl text-gray-800">{quiz.title}</h3>
                {quiz.status === 'draft' && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">Draft</span>
                )}
              </div>
              <p className="text-gray-500 text-sm mb-4">{quiz.description || 'No description'}</p>
              <div className="text-sm text-gray-400 mb-4">
                {quiz.question_count} question{quiz.question_count !== 1 ? 's' : ''}
              </div>

              {quizTab === 'trash' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore(quiz.id)}
                    className="flex-1 bg-animplay-green text-white font-bold py-2 px-4 rounded-xl
                               hover:bg-green-700 transition-colors text-sm"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(quiz.id)}
                    className="bg-animplay-red text-white font-bold py-2 px-4 rounded-xl
                               hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete Forever
                  </button>
                </div>
              ) : (
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
