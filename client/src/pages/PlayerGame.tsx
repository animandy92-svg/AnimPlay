import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

interface QuestionData {
  questionId: number;
  answerCount: number;
  timer: number;
  startsAt: number;
  questionIndex: number;
  totalQuestions: number;
}

interface AnswerShape {
  shape: string;
  color: string;
  colorClass: string;
}

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  correct: number;
  streak: number;
}

export default function PlayerGame() {
  const [phase, setPhase] = useState<'countdown' | 'question' | 'results' | 'leaderboard'>('countdown');
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [stats, setStats] = useState<{ answerIndex: number; count: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const timerRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { emit, on } = useSocket();

  const ANSWER_SHAPES: AnswerShape[] = [
    { shape: '▲', color: 'red', colorClass: 'bg-animplay-red' },
    { shape: '◆', color: 'blue', colorClass: 'bg-animplay-blue' },
    { shape: '●', color: 'yellow', colorClass: 'bg-animplay-yellow' },
    { shape: '■', color: 'green', colorClass: 'bg-animplay-green' },
  ];

  useEffect(() => {
    const unsubQuestion = on('player-question-start', (data: QuestionData) => {
      setQuestion(data);
      setSelectedAnswer(null);
      setCorrectIndex(0);
      setStats([]);
      setIsCorrect(null);
      setPhase('countdown');

      const countdownTime = Math.max(0, data.startsAt - Date.now());
      setTimeout(() => {
        setPhase('question');
        setTimeLeft(data.timer);

        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 0.1) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return prev - 0.1;
          });
        }, 100);
      }, countdownTime);
    });

    const unsubResults = on('question-ended', (data: { correctIndex: number; stats: { answerIndex: number; count: number }[]; leaderboard: LeaderboardEntry[] }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setCorrectIndex(data.correctIndex);
      setStats(data.stats);
      setLeaderboard(data.leaderboard);
      setPhase('results');

      if (selectedAnswer !== null) {
        setIsCorrect(selectedAnswer === data.correctIndex);
      }

      const myEntry = data.leaderboard.find(e => e.nickname === localStorage.getItem('animplay_nickname'));
      if (myEntry) setMyScore(myEntry.score);

      setTimeout(() => setPhase('leaderboard'), 3000);
    });

    const unsubGameEnd = on('game-ended', (data: { finalRankings: LeaderboardEntry[] }) => {
      setLeaderboard(data.finalRankings);
      navigate('/game/results');
    });

    return () => {
      unsubQuestion();
      unsubResults();
      unsubGameEnd();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [on, navigate, selectedAnswer]);

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null || !question) return;

    setSelectedAnswer(answerIndex);
    const responseTimeMs = question.timer * 1000 - timeLeft * 1000;

    emit('answer-submitted', {
      gameId: Number(localStorage.getItem('animplay_gameId') || 0),
      questionId: question.questionId,
      answerIndex,
      responseTimeMs,
    });
  };

  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-animplay-purple flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-9xl text-white animate-bounce-in">
            {question ? question.questionIndex + 1 : '?'}
          </div>
          <div className="text-white/80 text-2xl mt-4">
            Question {question ? question.questionIndex + 1 : ''} of {question?.totalQuestions || ''}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'question' && question) {
    const timerPercent = (timeLeft / question.timer) * 100;
    const timerColor = timeLeft > question.timer * 0.5 ? 'text-green-400' :
                       timeLeft > question.timer * 0.25 ? 'text-yellow-400' : 'text-red-400';

    const visibleShapes = ANSWER_SHAPES.slice(0, question.answerCount);

    return (
      <div className="min-h-screen bg-animplay-purple p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="text-white/80 font-bold">
            {question.questionIndex + 1} / {question.totalQuestions}
          </div>
          <div className={`font-display text-3xl ${timerColor}`}>
            {Math.ceil(timeLeft)}s
          </div>
        </div>

        <div className="w-full bg-white/20 rounded-full h-2 mb-6">
          <div
            className="bg-white rounded-full h-2 transition-all duration-100"
            style={{ width: `${timerPercent}%` }}
          />
        </div>

        <div className="flex-1 flex items-center justify-center mb-6">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-2xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Look at the main screen!
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
          {visibleShapes.map((answerShape, i) => {
            const isSelected = selectedAnswer === i;
            const showCorrect = selectedAnswer !== null && i === correctIndex;
            const showWrong = selectedAnswer === i && selectedAnswer !== correctIndex;

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={selectedAnswer !== null}
                className={`
                  ${answerShape.colorClass} text-white font-display text-4xl py-10 px-4 rounded-2xl
                  transition-all duration-200 shadow-lg
                  ${isSelected ? 'ring-4 ring-white scale-95' : 'hover:scale-105'}
                  ${showCorrect ? 'ring-4 ring-green-400 animate-pulse' : ''}
                  ${showWrong ? 'opacity-50 scale-95' : ''}
                  ${selectedAnswer !== null && !isSelected && !showCorrect ? 'opacity-50' : ''}
                `}
              >
                {answerShape.shape}
              </button>
            );
          })}
        </div>

        <div className="text-center mt-4 text-white/80">
          Score: {myScore.toLocaleString()}
        </div>
      </div>
    );
  }

  if (phase === 'results' || phase === 'leaderboard') {
    return (
      <div className="min-h-screen bg-animplay-purple flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md text-center animate-bounce-in">
          <div className="text-6xl mb-4">
            {isCorrect === true ? '✅' : isCorrect === false ? '❌' : '⏳'}
          </div>
          <h2 className="font-display text-3xl mb-2" style={{
            color: isCorrect ? '#26890C' : isCorrect === false ? '#E21B3C' : '#666'
          }}>
            {isCorrect ? 'Correct!' : isCorrect === false ? 'Wrong!' : 'Time\'s up!'}
          </h2>

          {stats.length > 0 && (
            <div className="mt-6 space-y-2">
              {stats.map(s => (
                <div key={s.answerIndex} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${ANSWER_SHAPES[s.answerIndex]?.colorClass || ''}`} />
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-gray-300 rounded-full flex items-center px-3 text-sm font-bold"
                      style={{ width: `${Math.max(10, (s.count / Math.max(...stats.map(x => x.count), 1)) * 100)}%` }}
                    >
                      {s.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
