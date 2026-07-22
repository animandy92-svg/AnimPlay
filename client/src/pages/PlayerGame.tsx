import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import type { QuestionType, PowerUp as IPowerUp, ChatMessage as IChatMessage } from '@shared/types';

interface QuestionData {
  questionId: number;
  questionText: string;
  answers: { text: string; color: string }[];
  answerCount: number;
  timer: number;
  startsAt: number;
  questionIndex: number;
  totalQuestions: number;
  questionType: QuestionType;
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
  const [powerUps, setPowerUps] = useState<IPowerUp[]>([]);
  const [chatMessages, setChatMessages] = useState<IChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [reactions, setReactions] = useState<{ playerId: string; reaction: string }[]>([]);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const leaderboardRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { emit, on } = useSocket();

  const ANSWER_SHAPES: AnswerShape[] = [
    { shape: '▲', color: 'red', colorClass: 'bg-animplay-red' },
    { shape: '◆', color: 'blue', colorClass: 'bg-animplay-blue' },
    { shape: '●', color: 'yellow', colorClass: 'bg-animplay-yellow' },
    { shape: '■', color: 'green', colorClass: 'bg-animplay-green' },
  ];

  const EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🔥'];

  useEffect(() => {
    const unsubQuestion = on('player-question-start', (data: QuestionData) => {
      setQuestion(data);
      setSelectedAnswer(null);
      setCorrectIndex(0);
      setStats([]);
      setIsCorrect(null);
      setPhase('countdown');

      if (countdownRef.current) clearTimeout(countdownRef.current);

      const countdownTime = Math.max(0, data.startsAt - Date.now());
      countdownRef.current = window.setTimeout(() => {
        setPhase('question');
        setTimeLeft(data.timer);

        timerRef.current = window.setInterval(() => {
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
      if (countdownRef.current) clearTimeout(countdownRef.current);
      if (leaderboardRef.current) clearTimeout(leaderboardRef.current);
      setCorrectIndex(data.correctIndex);
      setStats(data.stats);
      setLeaderboard(data.leaderboard);
      setPhase('results');

      if (selectedAnswer !== null) {
        setIsCorrect(selectedAnswer === data.correctIndex);
      }

      const myEntry = data.leaderboard.find(e => e.nickname === localStorage.getItem('animplay_nickname'));
      if (myEntry) setMyScore(myEntry.score);

      leaderboardRef.current = window.setTimeout(() => setPhase('leaderboard'), 3000);
    });

    const unsubGameEnd = on('game-ended', (data: { finalRankings: LeaderboardEntry[] }) => {
      setLeaderboard(data.finalRankings);
      localStorage.setItem('animplay_finalRankings', JSON.stringify(data.finalRankings));
      navigate('/game/results');
    });

    const unsubHostDisconnected = on('host-disconnected', () => {
      localStorage.removeItem('animplay_player_sessionId');
      localStorage.removeItem('animplay_player_gamePin');
      localStorage.removeItem('animplay_nickname');
      alert('The host disconnected. Returning to join screen.');
      navigate('/join');
    });

    const unsubPowerupPurchased = on('powerup-purchased', (data: { playerId: string; powerUpId: number; remainingPoints: number }) => {
      setMyScore(data.remainingPoints);
    });

    const unsubChatReceived = on('chat-received', (data: { playerId: string; nickname: string; message: string; type: string }) => {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        gameId: 0,
        playerId: data.playerId,
        nickname: data.nickname,
        message: data.message,
        type: data.type as 'chat' | 'reaction',
        createdAt: new Date().toISOString(),
      }]);
    });

    const unsubReactionReceived = on('reaction-received', (data: { playerId: string; reaction: string }) => {
      setReactions(prev => [...prev, { playerId: data.playerId, reaction: data.reaction }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.playerId !== data.playerId));
      }, 2000);
    });

    return () => {
      unsubQuestion();
      unsubResults();
      unsubGameEnd();
      unsubHostDisconnected();
      unsubPowerupPurchased();
      unsubChatReceived();
      unsubReactionReceived();
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearTimeout(countdownRef.current);
      if (leaderboardRef.current) clearTimeout(leaderboardRef.current);
    };
  }, [on, navigate, selectedAnswer]);

  const handleAnswer = useCallback(
    (answerIndex: number) => {
      if (selectedAnswer !== null || !question) return;

      setSelectedAnswer(answerIndex);
      const responseTimeMs = question.timer * 1000 - timeLeft * 1000;

      emit('answer-submitted', {
        gameId: Number(localStorage.getItem('animplay_gameId') || 0),
        questionId: question.questionId,
        answerIndex,
        responseTimeMs,
      });
    },
    [emit, question, selectedAnswer, timeLeft]
  );

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const gamePin = localStorage.getItem('animplay_player_gamePin') || '';
    emit('chat-message', { gamePin, message: chatInput.trim() });
    setChatInput('');
  };

  const handleReaction = (reaction: string) => {
    const gamePin = localStorage.getItem('animplay_player_gamePin') || '';
    emit('send-reaction', { gamePin, reaction });
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
              {question.questionType === 'open_ended' ? 'Type your answer below!' : question.questionText}
            </h2>
            {question.questionType === 'open_ended' && (
              <input
                type="text"
                className="mt-4 w-full text-center text-xl py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-animplay-purple focus:outline-none"
                placeholder="Your answer..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAnswer(0);
                }}
              />
            )}
          </div>
        </div>

        {question.questionType !== 'open_ended' && (
          <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
            {question.answers.map((answer, i) => {
              const isSelected = selectedAnswer === i;
              const showCorrect = selectedAnswer !== null && i === correctIndex;
              const showWrong = selectedAnswer === i && selectedAnswer !== correctIndex;
              const colorClass = answer.color === 'red' ? 'bg-animplay-red' :
                                 answer.color === 'blue' ? 'bg-animplay-blue' :
                                 answer.color === 'yellow' ? 'bg-animplay-yellow' :
                                 answer.color === 'green' ? 'bg-animplay-green' : 'bg-gray-400';

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={selectedAnswer !== null}
                  className={`
                    ${colorClass} text-white font-display text-xl md:text-2xl py-8 px-4 rounded-2xl
                    transition-all duration-200 shadow-lg
                    ${isSelected ? 'ring-4 ring-white scale-95' : 'hover:scale-105'}
                    ${showCorrect ? 'ring-4 ring-green-400 animate-pulse' : ''}
                    ${showWrong ? 'opacity-50 scale-95' : ''}
                    ${selectedAnswer !== null && !isSelected && !showCorrect ? 'opacity-50' : ''}
                  `}
                >
                  <div className="text-4xl mb-2">
                    {i === 0 ? '▲' : i === 1 ? '◆' : i === 2 ? '●' : '■'}
                  </div>
                  {answer.text}
                </button>
              );
            })}
          </div>
        )}

        <div className="text-center mt-4 text-white/80">
          Score: {myScore.toLocaleString()}
        </div>

        <div className="fixed bottom-4 right-4 flex flex-col gap-2">
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="bg-white/20 hover:bg-white/30 text-white text-2xl w-10 h-10 rounded-full transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>

        {reactions.length > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {reactions.map((r, i) => (
              <span key={i} className="text-3xl animate-bounce-in">{r.reaction}</span>
            ))}
          </div>
        )}
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
            {isCorrect ? 'Correct!' : isCorrect === false ? 'Wrong!' : "Time's up!"}
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

          <div className="mt-4 text-sm text-gray-500">
            Chat:
            <div className="max-h-32 overflow-y-auto mt-2 space-y-1">
              {chatMessages.slice(-5).map(msg => (
                <div key={msg.id} className="text-left text-xs">
                  <span className="font-bold">{msg.nickname}:</span> {msg.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
