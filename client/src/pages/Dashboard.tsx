import { useEffect, useState, useCallback } from 'react';
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
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const navigate = useNavigate();

  const loadQuizzes = useCallback(async () => {
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
  }, [quizTab, selectedFolder]);

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
  }, [loadQuizzes]);

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
      setQuizzes(prev => prev.filter(q => q.id !== id));
    } catch {
      alert('Failed to delete quiz');
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm('Permanently delete this quiz? This cannot be undone.')) return;
    try {
      await api.quizzes.permanentDelete(id);
      setQuizzes(prev => prev.filter(q => q.id !== id));
    } catch {
      alert('Failed to delete quiz');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.quizzes.restore(id);
      setQuizzes(prev => prev.filter(q => q.id !== id));
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
      const newFav = quiz.is_favorite ? 0 : 1;
      await api.quizzes.update(quiz.id, { is_favorite: newFav });
      setQuizzes(quizzes.map(q => q.id === quiz.id ? { ...q, is_favorite: newFav } : q));
    } catch {
      console.error('Failed to toggle favorite');
    }
  };

  const handleAiGenerate = async (topic: string, audience: string, count: number) => {
    setAiLoading(true);
    try {
      const data = await api.quizzes.aiGenerate(topic, audience, count);
      setQuizzes(prev => [data.quiz, ...prev]);
      setShowAiModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to generate quiz');
    } finally {
      setAiLoading(false);
    }
  };

  const QUIZ_TABS = [
    { key: 'recent', label: 'All' },
    { key: 'drafts', label: 'Drafts' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'trash', label: 'Trash' },
  ];

  const [activeTab, setActiveTab] = useState('recent');

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
          <h1 className="font-display text-4xl text-white drop-shadow-lg">My Quizzes</h1>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/quiz/new"
              className="bg-[#00e5ff] text-[#0f172a] font-display text-lg py-3 px-6 rounded-xl
                         hover:scale-105 transition-transform shadow-[0_0_25px_rgba(0,229,255,0.5)] hover:shadow-[0_0_45px_rgba(0,229,255,0.8)]"
            >
              + Create Quiz
            </Link>
            <Link
              to="/quiz/new?sample=true"
              className="bg-white/15 border border-white/30 text-white font-display text-lg py-3 px-6 rounded-xl
                         hover:bg-white/25 transition-colors"
            >
              Load Sample Quiz
            </Link>
            <button
              onClick={() => setShowAiModal(true)}
              className="bg-gradient-to-r from-animplay-purple to-animplay-purple-dark text-white font-display text-lg py-3 px-6 rounded-xl
                         hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <span>✨</span>
              <span>AI Auto-Generate</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 relative">
          {QUIZ_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => {
                setQuizTab(t.key);
                setSelectedFolder(null);
                setActiveTab(t.key);
              }}
              className={`relative px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors z-10 ${
                !selectedFolder && quizTab === t.key
                  ? 'text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}

          <div
            className="absolute top-0 h-full bg-white/25 backdrop-blur rounded-xl transition-all duration-300 ease-out z-0"
            style={{
              left: QUIZ_TABS.findIndex(t => t.key === (selectedFolder ? 'recent' : activeTab)) * 72,
              width: 72,
            }}
          />

          <div className="w-px bg-white/20 mx-1" />

          {folders.map(folder => (
            <div key={folder.id} className="flex items-center gap-1">
              <button
                onClick={() => { setSelectedFolder(folder.id); setQuizTab('recent'); setActiveTab('recent'); }}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  selectedFolder === folder.id
                    ? 'bg-white/25 text-white backdrop-blur'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                📁 {folder.name}
              </button>
              <button
                onClick={() => handleDeleteFolder(folder.id)}
                className="text-white/50 hover:text-red-300 text-xs"
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
                className="px-3 py-2 border-2 border-white/30 bg-white/10 rounded-xl text-sm w-32 focus:border-white/60 focus:outline-none text-white placeholder-white/50"
              />
              <button type="submit" className="text-white font-bold text-sm px-2">✓</button>
              <button type="button" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="text-white/50 text-sm px-1">✕</button>
            </form>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white/70 hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              + Folder
            </button>
          )}
        </div>

        {selectedFolder && (
          <button
            onClick={() => setSelectedFolder(null)}
            className="text-[#00e5ff] hover:text-white text-sm font-bold mb-4"
          >
            ← Back to all quizzes
          </button>
        )}

        {loading ? (
          <div className="text-center py-12 text-white/70">Loading...</div>
        ) : quizzes.length === 0 ? (
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-[2rem] p-12 shadow-2xl text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="font-display text-2xl text-white mb-2">
              {quizTab === 'trash' ? 'Trash is empty' : 'No quizzes yet'}
            </h2>
            <p className="text-white/70 mb-6">
              {quizTab === 'trash' ? 'Deleted quizzes will appear here' : 'Create your first quiz to get started!'}
            </p>
            {quizTab !== 'trash' && (
              <Link
                to="/quiz/new"
                className="bg-[#00e5ff] text-[#0f172a] font-display text-lg py-3 px-6 rounded-xl
                           hover:scale-105 transition-transform inline-block"
              >
                Create Quiz
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {quizzes.map((quiz, index) => (
              <div
                key={quiz.id}
                className="group backdrop-blur-md bg-white/15 border border-white/20 rounded-2xl p-5 shadow-2xl hover:bg-white/25 transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg text-white leading-tight line-clamp-2 flex-1">{quiz.title}</h3>
                  {quiz.status === 'draft' && (
                    <span className="bg-yellow-400/20 text-yellow-200 text-xs font-bold px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">Draft</span>
                  )}
                </div>
                <p className="text-white/70 text-sm mb-3 line-clamp-2">{quiz.description || 'No description'}</p>
                <div className="text-xs text-white/50 mb-4">
                  {quiz.question_count} question{quiz.question_count !== 1 ? 's' : ''}
                </div>

                {quizTab === 'trash' ? (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => handleStartGame(quiz.id)}
                      disabled={quiz.question_count === 0}
                      className="w-10 h-10 flex items-center justify-center bg-[#00e5ff] text-[#0f172a] rounded-full
                                 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Play"
                    >
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <Link
                      to={`/quiz/${quiz.id}/edit`}
                      className="w-10 h-10 flex items-center justify-center bg-white/20 text-white rounded-full
                                 hover:bg-white/35 transition-colors backdrop-blur"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleToggleFavorite(quiz)}
                      className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                        quiz.is_favorite ? 'bg-yellow-400/25 text-yellow-200' : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                      title={quiz.is_favorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <svg className="w-4 h-4" fill={quiz.is_favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="w-10 h-10 flex items-center justify-center bg-red-500/80 text-white rounded-full
                                 hover:bg-red-600 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAiModal && (
        <AiModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleAiGenerate}
          loading={aiLoading}
        />
      )}
    </div>
  );
}

interface AiModalProps {
  onClose: () => void;
  onGenerate: (topic: string, audience: string, count: number) => Promise<void>;
  loading: boolean;
}

function AiModal({ onClose, onGenerate, loading }: AiModalProps) {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('Kids');
  const [count, setCount] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onGenerate(topic, audience, count);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-md bg-white/15 border border-white/25 rounded-[2rem] shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-2xl text-white">✨ AI Quiz Generator</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">×</button>
        </div>
        <p className="text-white/80 text-sm mb-6">Describe your quiz topic and let AI build it for you instantly.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-white/90 mb-1">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Solar System, World War II, Cooking Basics"
              className="w-full text-lg py-3 px-4 border-2 border-white/30 bg-white/10 rounded-xl focus:border-white/60 focus:outline-none text-white placeholder-white/50"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/90 mb-1">Target Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="block w-full py-3 px-4 border-2 border-white/30 bg-white/10 rounded-xl focus:border-white/60 focus:outline-none text-white"
            >
              <option value="Kids">Kids</option>
              <option value="Teens">Teens</option>
              <option value="Adults">Adults</option>
              <option value="Seniors">Seniors</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/90 mb-1">Number of Questions</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="block w-full py-3 px-4 border-2 border-white/30 bg-white/10 rounded-xl focus:border-white/60 focus:outline-none text-white"
            >
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="w-full bg-[#00e5ff] text-[#0f172a] font-display text-lg py-3 px-6 rounded-xl
                       hover:scale-105 transition-transform shadow-[0_0_25px_rgba(0,229,255,0.5)] hover:shadow-[0_0_45px_rgba(0,229,255,0.8)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate Quiz'}
          </button>
        </form>
      </div>
    </div>
  );
}
