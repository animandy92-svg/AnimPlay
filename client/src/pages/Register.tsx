import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.auth.register(username, email, password);
      localStorage.setItem('animplay_token', data.token);
      localStorage.setItem('animplay_host', JSON.stringify(data.host));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-animplay-purple to-animplay-purple-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="font-display text-5xl text-white text-center mb-8">Register</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="mb-4">
            <label className="block text-gray-600 font-bold mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-animplay-purple focus:outline-none"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-600 font-bold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-animplay-purple focus:outline-none"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-600 font-bold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-animplay-purple focus:outline-none"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="mb-4 text-animplay-red font-bold text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-animplay-purple text-white font-display text-xl py-4 rounded-xl
                       hover:bg-animplay-purple-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="mt-6 text-center text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-animplay-purple font-bold hover:underline">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
