import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

interface QuestionData {
  questionId: number;
  questionText: string;
  answers: { text: string; color: string }[];
  timer: number;
  startsAt: number;
  questionIndex: number;
  totalQuestions: number;
}

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  correct: number;
  streak: number;
}

export default function HostGame() {
  const [phase, setPhase] = useState<'question' | 'results' | 'leaderboard' | 'finished'>('question');
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [stats, setStats] = useState<{ answerIndex: number; count: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const navigate = useNavigate();
  const { emit, on } = useSocket();

  const gameId = localStorage.getItem('animplay_gameId') || '';

  useEffect(() => {
    const unsubQuestion = on('host-question-start', (data: QuestionData) => {
      setQuestion(data);
      setPhase('question');
      setTotalAnswered(0);
      setTimeLeft(data.timer);

      const timerMs = data.timer * 1000;
      const elapsed = Date.now() - data.startsAt;
      const remaining = Math.max(0, timerMs - elapsed);
      setTimeLeft(remaining / 1000);

      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0.1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);

      return () => clearInterval(interval);
    });

    const unsubAnswerReceived = on('answer-received', (data: { answeredCount: number; totalCount: number }) => {
      setTotalAnswered(data.answeredCount);
      setPlayerCount(data.totalCount);
    });

    const unsubPlayerJoined = on('player-joined', (data: { playerId: string; nickname: string; playerCount: number }) => {
      setPlayerCount(data.playerCount);
    });

    const unsubPlayerLeft = on('player-left', (data: { playerId: string; nickname: string; playerCount: number }) => {
      setPlayerCount(data.playerCount);
    });

    const unsubResults = on('question-ended', (data: { correctIndex: number; stats: { answerIndex: number; count: number }[]; leaderboard: LeaderboardEntry[] }) => {
      setCorrectIndex(data.correctIndex);
      setStats(data.stats);
      setLeaderboard(data.leaderboard);
      setTotalAnswered(data.stats.reduce((sum, s) => sum + s.count, 0));
      setPhase('results');

      setTimeout(() => setPhase('leaderboard'), 4000);
    });

    const unsubGameEnd = on('game-ended', (data: { finalRankings: LeaderboardEntry[] }) => {
      setLeaderboard(data.finalRankings);
      setPhase('finished');
    });

    return () => {
      unsubQuestion();
      unsubAnswerReceived();
      unsubPlayerJoined();
      unsubPlayerLeft();
      unsubResults();
      unsubGameEnd();
    };
  }, [on]);

  const handleNextQuestion = () => {
    emit('host-next-question', { gameId: Number(gameId) });
  };

  const handleEndGame = () => {
    if (confirm('End the game now?')) {
      emit('host-end-game', { gameId: Number(gameId) });
    }
  };

  const colorMap: Record<string, string> = {
    red: 'bg-animplay-red',
    blue: 'bg-animplay-blue',
    yellow: 'bg-animplay-yellow',
    green: 'bg-animplay-green',
  };

  if (phase === 'question' && question) {
    const timerPercent = (timeLeft / question.timer) * 100;

    return (
      <div className="min-h-screen bg-animplay-purple flex flex-col">
        <div className="bg-animplay-purple-dark p-4 flex justify-between items-center">
          <div className="text-white/80 font-bold">
            Question {question.questionIndex + 1} of {question.totalQuestions}
          </div>
          <div className="font-display text-3xl text-white">
            {Math.ceil(timeLeft)}s
          </div>
        </div>

        <div className="w-full bg-white/20 h-3">
          <div
            className="bg-white h-3 transition-all duration-100"
            style={{ width: `${timerPercent}%` }}
          />
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl p-10 shadow-2xl w-full max-w-3xl text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-800">
              {question.questionText}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-8 max-w-4xl mx-auto w-full">
          {question.answers.map((answer, i) => (
            <div
              key={i}
              className={`${colorMap[answer.color]} text-white font-display text-2xl md:text-3xl py-8 px-6 rounded-2xl text-center shadow-lg`}
            >
              <div className="text-4xl mb-2">
                {i === 0 ? '▲' : i === 1 ? '◆' : i === 2 ? '●' : '■'}
              </div>
              {answer.text}
            </div>
          ))}
        </div>

        <div className="text-center pb-8">
          <div className="text-white/80 font-bold text-lg mb-3">
            {totalAnswered} / {playerCount} answered
          </div>
          <button
            onClick={handleEndGame}
            className="bg-white/20 text-white font-bold py-2 px-6 rounded-xl hover:bg-white/30 transition-colors text-sm"
          >
            End Game
          </button>
        </div>
      </div>
    );
  }

  if ((phase === 'results' || phase === 'leaderboard') && question) {
    return (
      <div className="min-h-screen bg-animplay-purple flex flex-col items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-10 shadow-2xl w-full max-w-3xl mb-8">
          <h2 className="font-display text-4xl text-center mb-6 text-gray-800">Results</h2>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {question.answers.map((answer, i) => {
              const count = stats.find(s => s.answerIndex === i)?.count || 0;
              const isCorrect = i === correctIndex;
              return (
                <div key={i} className="text-center">
                  <div className={`${colorMap[answer.color]} text-white font-bold text-3xl py-4 rounded-xl mb-2 ${isCorrect ? 'ring-4 ring-green-400' : ''}`}>
                    {count}
                  </div>
                  <div className="text-white/80 text-sm font-bold">{answer.text}</div>
                </div>
              );
            })}
          </div>

          <div className="text-center text-gray-500 font-bold">
            Correct answer: {question.answers[correctIndex]?.text}
          </div>
        </div>

        {phase === 'leaderboard' && leaderboard.length > 0 && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md mb-8">
            <h3 className="font-display text-2xl text-center mb-4 text-gray-800">Leaderboard</h3>
            {leaderboard.slice(0, 5).map(entry => (
              <div
                key={entry.rank}
                className={`flex items-center gap-3 py-3 border-b last:border-0 ${
                  entry.rank === 1 ? 'text-animplay-yellow font-bold' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold">
                  {entry.rank}
                </div>
                <div className="flex-1">{entry.nickname}</div>
                <div className="font-bold">{entry.score.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleNextQuestion}
          className="bg-white text-animplay-purple font-display text-2xl py-4 px-10 rounded-2xl
                     hover:scale-105 transition-transform shadow-lg"
        >
          {question.questionIndex + 1 >= question.totalQuestions ? 'See Final Results' : 'Next Question'}
        </button>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-animplay-purple to-animplay-purple-dark flex flex-col items-center justify-center p-4">
        <h1 className="font-display text-6xl text-white mb-8">Game Over!</h1>

        {leaderboard.length > 0 && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md mb-8">
            <h3 className="font-display text-2xl text-center mb-4 text-gray-800">Final Results</h3>
            {leaderboard.map(entry => (
              <div
                key={entry.rank}
                className={`flex items-center gap-3 py-3 border-b last:border-0 ${
                  entry.rank <= 3 ? 'font-bold' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                  entry.rank === 1 ? 'bg-animplay-yellow' :
                  entry.rank === 2 ? 'bg-gray-400' :
                  entry.rank === 3 ? 'bg-amber-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  {entry.rank}
                </div>
                <div className="flex-1 text-lg">{entry.nickname}</div>
                <div className="font-bold text-lg">{entry.score.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          className="bg-white text-animplay-purple font-display text-xl py-4 px-8 rounded-2xl
                     hover:scale-105 transition-transform"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return null;
}
