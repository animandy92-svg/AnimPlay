export interface Host {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface Quiz {
  id: number;
  host_id: number;
  title: string;
  description: string;
  cover_image: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  question_count?: number;
}

export interface Question {
  id: number;
  quiz_id: number;
  question_text: string;
  image_url: string | null;
  timer_seconds: number;
  points: number;
  sort_order: number;
  correct_index: number;
}

export interface AnswerOption {
  id: number;
  question_id: number;
  sort_index: number;
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
  game_pin: string;
  quiz_id: number;
  host_id: number;
  status: 'lobby' | 'active' | 'finished';
  current_question: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface GameResult {
  id: number;
  game_id: number;
  nickname: string;
  score: number;
  correct: number;
  total: number;
  streak: number;
  rank: number;
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
  quiz: QuizDetail;
  startedAt: Date;
  questionStartTime?: number;
}

export interface Player {
  id: string;
  nickname: string;
  socketId: string;
  score: number;
  streak: number;
  correctCount: number;
  answers: PlayerAnswer[];
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
}

export const ANSWER_COLORS = ['red', 'blue', 'yellow', 'green'] as const;
export const ANSWER_SHAPES = ['triangle', 'diamond', 'circle', 'square'] as const;

export interface SocketEvents {
  // Client -> Server
  'join-game': (data: { gamePin: string; nickname: string }) => void;
  'answer-submitted': (data: { gameId: number; questionId: number; answerIndex: number; responseTimeMs: number }) => void;
  'host-start-game': (data: { gameId: number }) => void;
  'host-next-question': (data: { gameId: number }) => void;
  'host-end-game': (data: { gameId: number }) => void;
  'host-register': (data: { gamePin: string; hostId: number }) => void;

  // Server -> Client
  'player-joined': (data: { playerId: string; nickname: string; playerCount: number }) => void;
  'player-left': (data: { playerId: string; nickname: string; playerCount: number }) => void;
  'game-started': (data: { totalQuestions: number }) => void;
  'question-started': (data: { questionId: number; questionText: string; answers: { text: string; color: string }[]; timer: number; startsAt: number; questionIndex: number; totalQuestions: number }) => void;
  'answer-confirmed': (data: { accepted: boolean }) => void;
  'question-ended': (data: { correctIndex: number; stats: { answerIndex: number; count: number }[]; leaderboard: LeaderboardEntry[] }) => void;
  'game-ended': (data: { finalRankings: LeaderboardEntry[] }) => void;
  'error': (data: { message: string }) => void;
}
