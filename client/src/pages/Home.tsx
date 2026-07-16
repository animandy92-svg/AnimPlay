import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-animplay-purple to-animplay-purple-dark flex flex-col items-center justify-center p-4">
      <div className="text-center animate-bounce-in">
        <h1 className="font-display text-7xl md:text-9xl text-white mb-4 tracking-tight">
          AnimPlay
        </h1>
        <p className="text-white/80 text-xl md:text-2xl mb-12 font-body">
          The ultimate quiz game experience
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md animate-slide-up">
        <Link
          to="/join"
          className="flex-1 bg-white text-animplay-purple font-display text-2xl py-5 px-8 rounded-2xl text-center
                     hover:scale-105 transition-transform shadow-lg hover:shadow-xl"
        >
          Join Game
        </Link>
        <Link
          to="/login"
          className="flex-1 bg-animplay-orange text-white font-display text-2xl py-5 px-8 rounded-2xl text-center
                     hover:scale-105 transition-transform shadow-lg hover:shadow-xl"
        >
          Host Game
        </Link>
      </div>

      <div className="mt-16 text-white/50 text-sm">
        Create quizzes, host live games, compete with friends!
      </div>
    </div>
  );
}
