import { Link } from 'react-router-dom';

const miniAnswers = [
  { shape: '▲', label: 'Mars', className: 'from-rose-500 to-pink-600' },
  { shape: '◆', label: 'Venus', className: 'from-sky-500 to-blue-600' },
  { shape: '●', label: 'Jupiter', className: 'from-amber-400 to-orange-500' },
  { shape: '■', label: 'Mercury', className: 'from-emerald-400 to-teal-600' },
];

export default function Home() {
  return (
    <main className="home-shell relative min-h-screen overflow-hidden text-white">
      <div className="aurora aurora-one" aria-hidden="true" />
      <div className="aurora aurora-two" aria-hidden="true" />
      <div className="absolute left-[8%] top-36 h-5 w-5 rotate-12 rounded-md bg-cyan-300/80 shadow-[0_0_28px_#67e8f9] animate-gentle-float" aria-hidden="true" />
      <div className="absolute right-[7%] top-28 h-9 w-9 rounded-full border-4 border-fuchsia-300/70 animate-gentle-float" style={{ animationDelay: '1s' }} aria-hidden="true" />

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="AnimPlay home">
          <span className="grid h-11 w-11 rotate-[-6deg] place-items-center rounded-2xl bg-white font-display text-2xl text-violet-700 shadow-xl">A</span>
          <span className="font-display text-2xl tracking-tight">AnimPlay</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="rounded-xl px-4 py-2.5 text-sm font-extrabold text-white/80 transition hover:bg-white/10 hover:text-white">Log in</Link>
          <Link to="/register" className="rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-violet-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">Create free</Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-14 px-5 pb-20 pt-8 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pb-28 lg:pt-6">
        <div className="max-w-2xl animate-slide-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-extrabold text-cyan-100 backdrop-blur-xl">
            <span className="live-dot" /> Live quizzes. Big energy. Zero setup drama.
          </div>
          <h1 className="font-display text-6xl leading-[.94] tracking-[-0.04em] sm:text-7xl md:text-8xl">
            Turn any room into a <span className="hero-highlight">game show.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg font-semibold leading-relaxed text-indigo-100/80 md:text-xl">
            Build playful quizzes, invite everyone with one PIN, and watch answers, scores, and reactions appear live.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/join" className="group flex items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-7 py-4 font-display text-xl text-slate-950 shadow-[0_16px_50px_rgba(34,211,238,.3)] transition hover:-translate-y-1 hover:bg-cyan-200">
              Join a game <span className="transition group-hover:translate-x-1">→</span>
            </Link>
            <Link to="/register" className="flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-7 py-4 font-display text-xl backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/15">
              Make a quiz
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-bold text-indigo-100/70">
            <span className="flex items-center gap-2"><span className="text-emerald-300">✓</span> Free to start</span>
            <span className="flex items-center gap-2"><span className="text-emerald-300">✓</span> No app download</span>
            <span className="flex items-center gap-2"><span className="text-emerald-300">✓</span> Powered by Firebase</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
          <div className="absolute -inset-8 rounded-full bg-fuchsia-500/20 blur-3xl" aria-hidden="true" />
          <div className="quiz-preview relative rotate-[1.5deg] rounded-[2rem] border border-white/20 bg-slate-950/55 p-4 shadow-[0_40px_100px_rgba(5,6,30,.55)] backdrop-blur-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-extrabold text-white/70">QUESTION 3 OF 8</span>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-cyan-300 font-display text-lg text-slate-900 shadow-[0_0_25px_rgba(103,232,249,.5)]">14</span>
            </div>
            <div className="rounded-[1.6rem] bg-white p-6 text-center shadow-xl sm:p-8">
              <div className="mb-3 text-4xl">🪐</div>
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Which planet is known as the Red Planet?</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {miniAnswers.map((answer, index) => (
                <div key={answer.label} className={`answer-pop rounded-2xl bg-gradient-to-br ${answer.className} p-4 shadow-lg`} style={{ animationDelay: `${index * 120}ms` }}>
                  <span className="mr-2 text-white/80">{answer.shape}</span><span className="font-extrabold">{answer.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between text-sm font-bold text-white/60">
              <div className="flex -space-x-2">
                {['🦊', '🐼', '🦄', '🐸'].map(face => <span key={face} className="grid h-9 w-9 place-items-center rounded-full border-2 border-slate-800 bg-slate-700">{face}</span>)}
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-slate-800 bg-violet-600 text-xs">+24</span>
              </div>
              <span><span className="text-emerald-300">●</span> 28 playing now</span>
            </div>
          </div>
          <div className="absolute -bottom-7 -left-4 rotate-[-6deg] rounded-2xl border border-white/20 bg-white/95 px-5 py-3 text-slate-900 shadow-2xl sm:-left-10">
            <div className="text-xs font-extrabold text-slate-400">TOP STREAK</div>
            <div className="font-display text-lg">🔥 Maya · 6 correct</div>
          </div>
        </div>
      </section>

      <div className="relative z-10 border-t border-white/10 bg-black/10 px-5 py-5 text-center text-sm font-bold text-indigo-100/60 backdrop-blur-lg">
        Made for classrooms, teams, families, and anyone who learns better while smiling.
      </div>
    </main>
  );
}
