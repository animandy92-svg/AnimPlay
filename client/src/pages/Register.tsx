import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.auth.register(username);
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
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#512da8] via-[#9c27b0] via-[30%] via-[#ff1744] via-[60%] to-[#3f51b5] bg-[length:400%_400%] animate-gradient-bg" />

      <div className="relative z-10 w-full max-w-md">
        <h1 className="font-display text-5xl text-white text-center mb-8 animate-spring-bounce">Register</h1>

        <form onSubmit={handleSubmit} className="backdrop-blur-md bg-white/15 border border-white/25 rounded-[2rem] p-8 shadow-2xl animate-slide-up">
          <div className="mb-4">
            <label className="block text-white/90 font-bold mb-2">Username</label>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full py-3 px-4 border-2 border-white/30 bg-white/10 rounded-xl focus:border-white/60 focus:outline-none text-white placeholder-white/60"
              maxLength={30}
              required
            />
          </div>

          {error && (
            <div className="mb-4 text-red-300 font-bold text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00e5ff] text-[#0f172a] font-display text-xl py-4 rounded-xl
                       hover:scale-105 transition-transform shadow-[0_0_25px_rgba(0,229,255,0.5)] hover:shadow-[0_0_45px_rgba(0,229,255,0.8)] disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="mt-6 text-center text-white/70">
            Already have an account?{' '}
            <Link to="/login" className="text-[#00e5ff] font-bold hover:underline">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
