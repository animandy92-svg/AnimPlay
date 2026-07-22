import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Group {
  id: number;
  name: string;
  description: string;
  invite_code: string;
  member_count: number;
  role?: string;
  created_at: string;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [tab, setTab] = useState<'joined' | 'owned'>('joined');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadGroups();
  }, [tab]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await api.groups.list(tab);
      setGroups(data.groups);
    } catch {
      console.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.groups.create(newName, newDesc);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      loadGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setCreating(true);
    try {
      await api.groups.join(joinCode);
      setJoinCode('');
      setShowJoin(false);
      loadGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to join group');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this group?')) return;
    try {
      await api.groups.delete(id);
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch {
      alert('Failed to delete group');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Invite code copied!');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-4xl text-animplay-brand">Groups</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); }}
            className="bg-animplay-slate text-white font-bold py-2 px-5 rounded-xl
                       hover:bg-gray-800 transition-colors text-sm"
          >
            Join Group
          </button>
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); }}
            className="bg-animplay-brand text-white font-bold py-2 px-5 rounded-xl
                       hover:bg-animplay-brand-dark transition-colors text-sm"
          >
            + Create Group
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 shadow mb-6">
          <h2 className="font-display text-xl text-gray-700 mb-4">New Group</h2>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Group name"
            className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl mb-3 focus:border-animplay-brand focus:outline-none"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl mb-4 focus:border-animplay-brand focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="bg-animplay-brand text-white font-bold py-2 px-6 rounded-xl
                         hover:bg-animplay-brand-dark transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-gray-500 hover:text-gray-700 font-bold py-2 px-4"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showJoin && (
        <form onSubmit={handleJoin} className="bg-white rounded-2xl p-6 shadow mb-6">
          <h2 className="font-display text-xl text-gray-700 mb-4">Join a Group</h2>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            maxLength={8}
            className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl mb-4 focus:border-animplay-brand focus:outline-none
                       text-center text-2xl font-mono tracking-widest uppercase"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !joinCode.trim()}
              className="bg-animplay-brand text-white font-bold py-2 px-6 rounded-xl
                         hover:bg-animplay-brand-dark transition-colors disabled:opacity-50"
            >
              {creating ? 'Joining...' : 'Join'}
            </button>
            <button
              type="button"
              onClick={() => setShowJoin(false)}
              className="text-gray-500 hover:text-gray-700 font-bold py-2 px-4"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('joined')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
            tab === 'joined' ? 'bg-animplay-brand text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          Joined
        </button>
        <button
          onClick={() => setTab('owned')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
            tab === 'owned' ? 'bg-animplay-brand text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          My Groups
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="font-display text-2xl text-gray-700 mb-2">No groups yet</h2>
          <p className="text-gray-500">
            {tab === 'joined' ? 'Join a group using an invite code' : 'Create a group to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <div key={group.id} className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="font-bold text-xl text-gray-800 mb-1">{group.name}</h3>
              <p className="text-gray-500 text-sm mb-3">{group.description || 'No description'}</p>
              <div className="text-xs text-gray-400 mb-4">
                {group.member_count} member{group.member_count !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-400">Invite:</span>
                <button
                  onClick={() => copyCode(group.invite_code)}
                  className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {group.invite_code}
                </button>
              </div>
              {(tab === 'owned' || group.role === 'owner') && (
                <button
                  onClick={() => handleDelete(group.id)}
                  className="text-animplay-red hover:text-red-700 text-sm font-bold"
                >
                  Delete Group
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
