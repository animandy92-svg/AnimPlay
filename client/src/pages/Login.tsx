import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../services/api';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.auth.login(login, password);
      localStorage.setItem('animplay_token', data.token);
      localStorage.setItem('animplay_host', JSON.stringify(data.host));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setLoading(true);
    try {
      const data = await api.auth.google(credentialResponse.credential);
      localStorage.setItem('animplay_token', data.token);
      localStorage.setItem('animplay_host', JSON.stringify(data.host));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#512da8] via-[#9c27b0] via-[30%] via-[#ff1744] via-[60%] to-[#3f51b5] bg-[length:400%_400%] animate-gradient-bg" />

      <div className="relative z-10 w-full max-w-md">
        <h1 className="font-display text-5xl text-white text-center mb-8 animate-spring-bounce">Login</h1>

        <form onSubmit={handleSubmit} className="backdrop-blur-md bg-white/15 border border-white/25 rounded-[2rem] p-8 shadow-2xl animate-slide-up">
          <div className="mb-4">
            <label className="block text-white/90 font-bold mb-2">Username or Email</label>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full py-3 px-4 border-2 border-white/30 bg-white/10 rounded-xl focus:border-white/60 focus:outline-none text-white placeholder-white/60"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-white/90 font-bold mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3 px-4 pr-12 border-2 border-white/30 bg-white/10 rounded-xl focus:border-white/60 focus:outline-none text-white placeholder-white/60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.007 9.963 7.178a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.244 4.5 12 4.5c4.756 0 8.773 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.756 0-8.773-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
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
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-white/80">Or continue with</span>
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    setError('Google sign-in failed');
                    setLoading(false);
                  }}
                  theme="outline"
                  shape="pill"
                  text="signin_with"
                />
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-white/70">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#00e5ff] font-bold hover:underline">
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
