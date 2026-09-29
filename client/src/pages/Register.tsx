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
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4 pb-8 pt-28 sm:pt-32">
      <div className="absolute inset-0 home-shell" />

      <nav className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="AnimPlay home">
          <span className="grid h-11 w-11 rotate-[-6deg] place-items-center rounded-2xl bg-white font-display text-2xl text-violet-700 shadow-xl">A</span>
          <span className="font-display text-2xl tracking-tight text-white">AnimPlay</span>
        </Link>
        <Link
          to="/login"
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-white/20"
        >
          Sign in <span className="hidden font-semibold text-white/60 sm:inline">(optional)</span>
        </Link>
      </nav>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center animate-spring-bounce">
          <h1 className="font-display text-5xl text-white">Create a game</h1>
          <p className="mt-3 font-bold text-white/75">Choose a host name to start. No email or password needed.</p>
        </div>

        <form onSubmit={handleSubmit} className="backdrop-blur-md bg-white/15 border border-white/25 rounded-[2rem] p-8 shadow-2xl animate-slide-up">
          <div className="mb-4">
            <label htmlFor="host-username" className="block text-white/90 font-bold mb-2">Host username</label>
            <input
              id="host-username"
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your host name"
              className="w-full py-3 px-4 border-2 border-white/30 bg-white/10 rounded-xl focus:border-white/60 focus:outline-none text-white placeholder-white/60"
              maxLength={30}
              autoFocus
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
            {loading ? 'Getting things ready...' : 'Continue as host'}
          </button>

          <p className="mt-5 text-center text-sm font-semibold leading-relaxed text-white/60">
            You can sign in later if you want to use a permanent account.
          </p>
        </form>
      </div>
    </div>
  );
}
