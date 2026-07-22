import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Assignment {
  id: number;
  title: string;
  quiz_title: string;
  group_name: string;
  due_date: string | null;
  is_completed: boolean;
  created_at: string;
}

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tab, setTab] = useState<'todo' | 'completed' | 'expired'>('todo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, [tab]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await api.learning.assignments(tab);
      setAssignments(data.assignments);
    } catch {
      console.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.learning.complete(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to complete assignment');
    }
  };

  const isExpired = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-4xl text-animplay-brand mb-6">Assignments</h1>

      <div className="flex gap-2 mb-6">
        {(['todo', 'completed', 'expired'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition-colors ${
              tab === t ? 'bg-animplay-brand text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow text-center">
          <div className="text-6xl mb-4">
            {tab === 'todo' ? '📋' : tab === 'completed' ? '✅' : '⏰'}
          </div>
          <h2 className="font-display text-2xl text-gray-700 mb-2">
            {tab === 'todo' ? 'No pending assignments' : tab === 'completed' ? 'No completed assignments' : 'No expired assignments'}
          </h2>
          <p className="text-gray-500">
            {tab === 'todo' ? 'Assignments from your groups will appear here' : 'Nothing to see here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(assignment => (
            <div
              key={assignment.id}
              className={`bg-white rounded-2xl p-5 shadow flex items-center gap-4 ${
                isExpired(assignment.due_date) && tab === 'expired' ? 'border-l-4 border-animplay-red' : ''
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                assignment.is_completed ? 'bg-animplay-green' : isExpired(assignment.due_date) ? 'bg-animplay-red' : 'bg-animplay-brand'
              }`}>
                {assignment.is_completed ? '✓' : assignment.title.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{assignment.title}</h3>
                <div className="text-sm text-gray-500 flex gap-3">
                  <span>{assignment.quiz_title}</span>
                  <span className="text-gray-300">|</span>
                  <span>{assignment.group_name}</span>
                </div>
              </div>

              <div className="text-right">
                {assignment.due_date && (
                  <div className={`text-xs font-bold mb-1 ${
                    isExpired(assignment.due_date) && !assignment.is_completed
                      ? 'text-animplay-red'
                      : 'text-gray-400'
                  }`}>
                    {assignment.is_completed ? `Done ${formatDate(assignment.due_date)}` : `Due ${formatDate(assignment.due_date)}`}
                  </div>
                )}
                {tab === 'todo' && !isExpired(assignment.due_date) && (
                  <button
                    onClick={() => handleComplete(assignment.id)}
                    className="bg-animplay-green text-white font-bold py-1.5 px-4 rounded-lg
                               hover:bg-green-700 transition-colors text-xs"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
