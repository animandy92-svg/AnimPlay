export interface Host {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface Quiz {
  id: number;
  hostId: number;
  title: string;
  description: string;
  coverImage: string | null;
  isPublic: boolean;
  created_at: string;
  updated_at: string;
  question_count?: number;
}

export interface Question {
  id: number;
  quizId: number;
  questionText: string;
  imageUrl: string | null;
  timerSeconds: number;
  points: number;
  pointsMultiplier: number;
  sortOrder: number;
  correctIndex: number;
  questionType: 'multiple_choice' | 'true_false' | 'open_ended';
}

export interface AnswerOption {
  id: number;
  questionId: number;
  sortIndex: number;
  text: string;
  color: 'red' | 'blue' | 'yellow' | 'green';
}

export interface QuestionWithOptions extends Question {
  answers: AnswerOption[];
}

export interface QuizDetail extends Quiz {
  questions: QuestionWithOptions[];
}

export interface Game {
  id: number;
  gamePin: string;
  quizId: number;
  hostId: number;
  status: 'lobby' | 'active' | 'finished';
  currentQuestion: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface GameResult {
  id: number;
  gameId: number;
  nickname: string;
  score: number;
  correct: number;
  total: number;
  streak: number;
  rank: number;
}

export interface Team {
  id: number;
  gameId: number;
  name: string;
  color: string;
  score: number;
}

export interface TeamMember {
  id: number;
  teamId: number;
  gameId: number;
  playerId: string;
  nickname: string;
}

export interface PowerUp {
  id: number;
  name: string;
  description: string;
  icon: string;
  cost: number;
}

export interface PlayerPowerUp {
  id: number;
  gameId: number;
  playerId: string;
  powerUpId: number;
  used: boolean;
}

export interface ChatMessage {
  id: number;
  gameId: number;
  playerId: string;
  nickname: string;
  message: string;
  type: 'chat' | 'reaction';
  createdAt: string;
}

export interface GameRoom {
  gameId: number;
  gamePin: string;
  quizId: number;
  hostId: number;
  hostSocketId: string;
  status: 'lobby' | 'active' | 'finished';
  currentQuestionIndex: number;
  players: Map<string, Player>;
  teams: Team[];
  teamMembers: TeamMember[];
  powerUps: PlayerPowerUp[];
  chatMessages: ChatMessage[];
  quiz: QuizDetail;
  startedAt: Date;
  questionStartTime?: number;
  questionTimerInterval?: ReturnType<typeof setInterval>;
}

export interface Player {
  id: string;
  sessionId: string;
  nickname: string;
  socketId: string;
  score: number;
  streak: number;
  correctCount: number;
  hasAnswered: boolean;
  answers: PlayerAnswer[];
  teamId?: number;
  powerUps: PlayerPowerUp[];
}

export interface PlayerAnswer {
  questionId: number;
  answerIndex: number;
  responseTimeMs: number;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  correct: number;
  streak: number;
  teamId?: number;
  teamName?: string;
}

export const ANSWER_COLORS = ['red', 'blue', 'yellow', 'green'] as const;
export const ANSWER_SHAPES = ['triangle', 'diamond', 'circle', 'square'] as const;

export const QUESTION_TYPES = ['multiple_choice', 'true_false', 'open_ended'] as const;
export type QuestionType = typeof QUESTION_TYPES[number];

export const POWER_UPS = [
  { id: 1, name: 'double_points', description: 'Double points for next correct answer', icon: '2x', cost: 500 },
  { id: 2, name: 'remove_one', description: 'Remove one wrong answer', icon: '-1', cost: 300 },
  { id: 3, name: 'time_freeze', description: 'Pause timer for 3 seconds', icon: '⏸', cost: 400 },
] as const;

export const REACTIONS = ['👍', '❤️', '😂', '😮', '👏', '🔥'] as const;

export interface SocketEvents {
  // Client -> Server
  'join-game': (data: { gamePin: string; nickname: string; teamId?: number }) => void;
  'answer-submitted': (data: { gameId: number; questionId: number; answerIndex: number; responseTimeMs: number }) => void;
  'host-start-game': (data: { gameId: number }) => void;
  'host-next-question': (data: { gameId: number }) => void;
  'host-end-game': (data: { gameId: number }) => void;
  'host-register': (data: { gamePin: string; hostId: number }) => void;
  'reconnect-player': (data: { sessionId: string; nickname: string; gamePin?: string }) => void;
  'kick-player': (data: { gamePin: string; playerId: string }) => void;
  'create-team': (data: { gamePin: string; name: string; color: string }) => void;
  'join-team': (data: { gamePin: string; teamId: number }) => void;
  'use-powerup': (data: { gamePin: string; powerUpId: number }) => void;
  'buy-powerup': (data: { gamePin: string; powerUpId: number }) => void;
  'chat-message': (data: { gamePin: string; message: string }) => void;
  'send-reaction': (data: { gamePin: string; reaction: string }) => void;
  'host-judge': (data: { gamePin: string; questionId: number; playerId: string; points: number }) => void;

  // Server -> Client
  'player-joined': (data: { playerId: string; nickname: string; playerCount: number; teamId?: number }) => void;
  'player-left': (data: { playerId: string; nickname: string; playerCount: number }) => void;
  'player-reconnected': (data: { playerId: string; playerCount: number }) => void;
  'player-list': (data: { players: string[] }) => void;
  'update-player-list': (data: { playerId: string; nickname: string; teamId?: number }[]) => void;
  'kicked-from-game': (data: { message: string }) => void;
  'host-disconnected': () => void;
  'game-started': (data: { totalQuestions: number }) => void;
  'host-question-start': (data: { questionId: number; questionText: string; answers: { text: string; color: string }[]; timer: number; startsAt: number; questionIndex: number; totalQuestions: number; questionType: QuestionType }) => void;
  'player-question-start': (data: { questionId: number; answerCount: number; timer: number; startsAt: number; questionIndex: number; totalQuestions: number; questionType: QuestionType }) => void;
  'answer-received': (data: { answeredCount: number; totalCount: number }) => void;
  'answer-confirmed': (data: { accepted: boolean; playerId?: string; sessionId?: string }) => void;
  'timer-tick': (data: { timeLeft: number }) => void;
  'time-up': () => void;
  'question-ended': (data: { correctIndex: number; stats: { answerIndex: number; count: number }[]; leaderboard: LeaderboardEntry[]; correctAnswer?: string }) => void;
  'game-ended': (data: { finalRankings: LeaderboardEntry[] }) => void;
  'join-error': (data: { message: string }) => void;
  'error': (data: { message: string }) => void;
  'team-created': (data: { teamId: number; name: string; color: string }) => void;
  'team-updated': (data: { teams: Team[] }) => void;
  'powerup-used': (data: { playerId: string; powerUpId: number; effect: string }) => void;
  'powerup-purchased': (data: { playerId: string; powerUpId: number; remainingPoints: number }) => void;
  'chat-received': (data: { playerId: string; nickname: string; message: string; type: 'chat' | 'reaction' }) => void;
  'reaction-received': (data: { playerId: string; reaction: string }) => void;
}
