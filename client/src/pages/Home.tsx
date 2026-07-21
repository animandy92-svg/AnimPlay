import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Particle {
  id: number;
  left: string;
  size: string;
  delay: string;
  duration: string;
  type: 'circle' | 'triangle' | 'square';
  opacity: string;
}

function Home() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const shapes: Particle['type'][] = ['circle', 'triangle', 'square'];
    const items: Particle[] = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${Math.floor(Math.random() * 60 + 30)}px`,
      delay: `${Math.random() * 10}s`,
      duration: `${Math.floor(Math.random() * 15 + 15)}s`,
      type: shapes[Math.floor(Math.random() * shapes.length)],
      opacity: `${(Math.random() * 0.25 + 0.1).toFixed(2)}`,
    }));
    setParticles(items);
  }, []);

  const shapeClass = (type: Particle['type']) => {
    switch (type) {
      case 'circle':
        return 'rounded-full';
      case 'triangle':
        return 'answer-shape-triangle';
      case 'square':
        return 'answer-shape-square';
      default:
        return 'rounded-full';
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#512da8] via-[#9c27b0] via-[30%] via-[#ff1744] via-[60%] to-[#3f51b5] bg-[length:400%_400%] animate-gradient-bg" />

      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {particles.map(p => (
          <div
            key={p.id}
            className={`absolute bottom-[-120px] bg-white ${shapeClass(p.type)}`}
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animation: `floatUp ${p.duration} linear ${p.delay} infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-[2rem] p-8 md:p-12 shadow-2xl max-w-2xl w-full text-center animate-slide-up">
          <div className="mb-8 animate-spring-bounce">
            <h1 className="font-display text-7xl md:text-9xl text-white tracking-tight drop-shadow-lg">
              AnimPlay
            </h1>
          </div>

          <p className="text-white/90 text-xl md:text-2xl mb-12 font-body animate-spring-bounce" style={{ animationDelay: '120ms' }}>
            The ultimate quiz game experience
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full animate-slide-up" style={{ animationDelay: '240ms' }}>
            <Link
              to="/join"
              className="flex-1 bg-[#00e5ff] text-[#0f172a] font-display text-2xl py-5 px-8 rounded-2xl text-center
                         hover:scale-105 transition-transform shadow-[0_0_25px_rgba(0,229,255,0.6)] hover:shadow-[0_0_45px_rgba(0,229,255,0.9)] animate-pulse-cyan"
            >
              Join Game
            </Link>
            <Link
              to="/login"
              className="flex-1 bg-white text-animplay-purple font-display text-2xl py-5 px-8 rounded-2xl text-center
                         hover:scale-105 transition-transform shadow-lg hover:shadow-2xl"
            >
              Host Game
            </Link>
          </div>
        </div>

        <div className="mt-16 text-white/60 text-sm animate-slide-up" style={{ animationDelay: '360ms' }}>
          Create quizzes, host live games, compete with friends!
        </div>
      </div>
    </div>
  );
}

export default Home;
