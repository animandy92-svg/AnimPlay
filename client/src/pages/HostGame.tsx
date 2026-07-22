import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import type { QuestionType, ChatMessage as IChatMessage, LeaderboardEntry } from '@shared/types';

interface QuestionData {
  questionId: number;
  questionText: string;
  answers: { text: string; color: string }[];
  timer: number;
  startsAt: number;
  questionIndex: number;
  totalQuestions: number;
  questionType: QuestionType;
}

interface PendingAnswer {
  playerId: string;
  nickname: string;
  answerIndex: number;
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
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [chatMessages, setChatMessages] = useState<IChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const leaderboardTimeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { emit, on } = useSocket();

  const gameId = localStorage.getItem('animplay_gameId') || '';

  useEffect(() => {
    const unsubQuestion = on('host-question-start', (data: QuestionData) => {
      setQuestion(data);
      setPhase('question');
      setTotalAnswered(0);
      setTimeLeft(data.timer);
      setPendingAnswers([]);
    });

    const unsubTimerTick = on('timer-tick', (data: { timeLeft: number }) => {
      setTimeLeft(data.timeLeft);
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
      if (leaderboardTimeoutRef.current) clearTimeout(leaderboardTimeoutRef.current);
      setCorrectIndex(data.correctIndex);
      setStats(data.stats);
      setLeaderboard(data.leaderboard);
      setTotalAnswered(data.stats.reduce((sum, s) => sum + s.count, 0));
      setPhase('results');

      leaderboardTimeoutRef.current = window.setTimeout(() => setPhase('leaderboard'), 4000);
    });

    const unsubGameEnd = on('game-ended', (data: { finalRankings: LeaderboardEntry[] }) => {
      setLeaderboard(data.finalRankings);
      setPhase('finished');
    });

    const unsubAnswerConfirmed = on('answer-confirmed', (data: { accepted: boolean; playerId?: string }) => {
      if (data.accepted && data.playerId) {
        setPendingAnswers(prev => prev.filter(a => a.playerId !== data.playerId));
      }
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

    return () => {
      unsubQuestion();
      unsubTimerTick();
      unsubAnswerReceived();
      unsubPlayerJoined();
      unsubPlayerLeft();
      unsubResults();
      unsubGameEnd();
      unsubAnswerConfirmed();
      unsubChatReceived();
      if (leaderboardTimeoutRef.current) clearTimeout(leaderboardTimeoutRef.current);
    };
  }, [on]);

  const handleJudge = (playerId: string, points: number) => {
    emit('host-judge', { gamePin: localStorage.getItem('animplay_gamePin') || '', questionId: question?.questionId || 0, playerId, points });
    setPendingAnswers(prev => prev.filter(a => a.playerId !== playerId));
  };

  const handleNextQuestion = useCallback(() => {
    emit('host-next-question', { gameId: Number(gameId) });
  }, [emit, gameId]);

  const handleEndGame = useCallback(() => {
    if (confirm('End the game now?')) {
      emit('host-end-game', { gameId: Number(gameId) });
    }
  }, [emit, gameId]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const gamePin = localStorage.getItem('animplay_gamePin') || '';
    emit('chat-message', { gamePin, message: chatInput.trim() });
    setChatInput('');
  };

  const colorMap: Record<string, string> = {
    red: 'bg-animplay-red',
    blue: 'bg-animplay-blue',
    yellow: 'bg-animplay-yellow',
    green: 'bg-animplay-green',
  };

  if (phase === 'question') {
    if (!question) {
      return (
        <div className="min-h-screen bg-animplay-purple flex items-center justify-center">
          <div className="text-white text-2xl font-bold">Loading question data...</div>
        </div>
      );
    }

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
            {question.questionType === 'open_ended' && (
              <p className="mt-4 text-animplay-brand font-bold">Open-ended - Judge answers manually</p>
            )}
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
          {pendingAnswers.length > 0 && (
            <div className="mb-4">
              <div className="text-white/60 text-sm mb-2">Pending judgments:</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {pendingAnswers.map(answer => (
                  <div key={answer.playerId} className="bg-white/10 rounded-lg p-2 flex items-center gap-2">
                    <span className="text-white text-sm">{answer.nickname}</span>
                    <button onClick={() => handleJudge(answer.playerId, 500)} className="bg-animplay-green text-white text-xs px-2 py-1 rounded">+500</button>
                    <button onClick={() => handleJudge(answer.playerId, 0)} className="bg-animplay-red text-white text-xs px-2 py-1 rounded">+0</button>
                  </div>
                ))}
              </div>
            </div>
          )}
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

  if (phase === 'results' || phase === 'leaderboard') {
    if (!question) {
      return (
        <div className="min-h-screen bg-animplay-purple flex items-center justify-center">
          <div className="text-white text-2xl font-bold">Loading results...</div>
        </div>
      );
    }

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
                <div className="flex-1">
                  {entry.character ? <span className="mr-1">{entry.character}</span> : ''}{entry.nickname}
                  {entry.teamName && <span className="text-xs text-gray-400 ml-2">({entry.teamName})</span>}
                </div>
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
                <div className="flex-1 text-lg">
                  {entry.character ? <span className="mr-1">{entry.character}</span> : ''}{entry.nickname}
                  {entry.teamName && <span className="text-xs text-gray-400 ml-2">({entry.teamName})</span>}
                </div>
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
