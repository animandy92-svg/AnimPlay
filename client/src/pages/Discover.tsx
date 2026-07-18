import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface DiscoverQuiz {
  id: number;
  title: string;
  description: string;
  category: string;
  play_count: number;
  question_count: number;
  creator_name: string;
}

export default function Discover() {
  const [quizzes, setQuizzes] = useState<DiscoverQuiz[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('popular');
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<number | null>(null);

  useEffect(() => {
    api.discover.categories().then(data => setCategories(data.categories));
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [category, sort]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const data = await api.discover.quizzes({ search, category, sort });
      setQuizzes(data.quizzes);
    } catch {
      console.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuizzes();
  };

  const handleClone = async (quizId: number) => {
    setCloningId(quizId);
    try {
      await api.quizzes.clone(quizId);
      alert('Quiz copied to your collection!');
    } catch (err: any) {
      alert(err.message || 'Failed to clone quiz');
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-4xl text-animplay-brand mb-6">Discover Quizzes</h1>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quizzes..."
          className="flex-1 py-3 px-5 border-2 border-gray-200 rounded-xl focus:border-animplay-brand focus:outline-none text-lg"
        />
        <button
          type="submit"
          className="bg-animplay-brand text-white font-bold py-3 px-6 rounded-xl hover:bg-animplay-brand-dark transition-colors"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
            category === 'all' ? 'bg-animplay-brand text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-colors ${
              category === cat ? 'bg-animplay-brand text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setSort('popular')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            sort === 'popular' ? 'bg-animplay-slate text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          Popular
        </button>
        <button
          onClick={() => setSort('newest')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            sort === 'newest' ? 'bg-animplay-slate text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          Newest
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-4">🔍</div>
          <p>No quizzes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-xl text-gray-800">{quiz.title}</h3>
                <span className="bg-animplay-brand/10 text-animplay-brand text-xs font-bold px-2 py-1 rounded-full capitalize">
                  {quiz.category}
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-3">{quiz.description || 'No description'}</p>
              <div className="text-xs text-gray-400 mb-4 flex gap-4">
                <span>{quiz.question_count} questions</span>
                <span>{quiz.play_count} plays</span>
                <span>by {quiz.creator_name}</span>
              </div>
              <button
                onClick={() => handleClone(quiz.id)}
                disabled={cloningId === quiz.id}
                className="w-full bg-animplay-brand text-white font-bold py-2 px-4 rounded-xl
                           hover:bg-animplay-brand-dark transition-colors disabled:opacity-50 text-sm"
              >
                {cloningId === quiz.id ? 'Copying...' : 'Clone to My Quizzes'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
