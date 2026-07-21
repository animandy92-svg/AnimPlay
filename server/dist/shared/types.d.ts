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
    character?: string;
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
    character?: string;
}
export declare const ANSWER_COLORS: readonly ["red", "blue", "yellow", "green"];
export declare const ANSWER_SHAPES: readonly ["triangle", "diamond", "circle", "square"];
export declare const QUESTION_TYPES: readonly ["multiple_choice", "true_false", "open_ended"];
export type QuestionType = typeof QUESTION_TYPES[number];
export declare const POWER_UPS: readonly [{
    readonly id: 1;
    readonly name: "double_points";
    readonly description: "Double points for next correct answer";
    readonly icon: "2x";
    readonly cost: 500;
}, {
    readonly id: 2;
    readonly name: "remove_one";
    readonly description: "Remove one wrong answer";
    readonly icon: "-1";
    readonly cost: 300;
}, {
    readonly id: 3;
    readonly name: "time_freeze";
    readonly description: "Pause timer for 3 seconds";
    readonly icon: "⏸";
    readonly cost: 400;
}];
export declare const REACTIONS: readonly ["👍", "❤️", "😂", "😮", "👏", "🔥"];
export interface SocketEvents {
    'join-game': (data: {
        gamePin: string;
        nickname: string;
        teamId?: number;
        character?: string;
    }) => void;
    'answer-submitted': (data: {
        gameId: number;
        questionId: number;
        answerIndex: number;
        responseTimeMs: number;
    }) => void;
    'host-start-game': (data: {
        gameId: number;
    }) => void;
    'host-next-question': (data: {
        gameId: number;
    }) => void;
    'host-end-game': (data: {
        gameId: number;
    }) => void;
    'host-register': (data: {
        gamePin: string;
        hostId: number;
    }) => void;
    'reconnect-player': (data: {
        sessionId: string;
        nickname: string;
        gamePin?: string;
        character?: string;
    }) => void;
    'kick-player': (data: {
        gamePin: string;
        playerId: string;
    }) => void;
    'create-team': (data: {
        gamePin: string;
        name: string;
        color: string;
    }) => void;
    'join-team': (data: {
        gamePin: string;
        teamId: number;
    }) => void;
    'use-powerup': (data: {
        gamePin: string;
        powerUpId: number;
    }) => void;
    'buy-powerup': (data: {
        gamePin: string;
        powerUpId: number;
    }) => void;
    'chat-message': (data: {
        gamePin: string;
        message: string;
    }) => void;
    'send-reaction': (data: {
        gamePin: string;
        reaction: string;
    }) => void;
    'host-judge': (data: {
        gamePin: string;
        questionId: number;
        playerId: string;
        points: number;
    }) => void;
    'player-joined': (data: {
        playerId: string;
        nickname: string;
        playerCount: number;
        teamId?: number;
        character?: string;
    }) => void;
    'player-left': (data: {
        playerId: string;
        nickname: string;
        playerCount: number;
    }) => void;
    'player-reconnected': (data: {
        playerId: string;
        playerCount: number;
    }) => void;
    'player-list': (data: {
        players: string[];
    }) => void;
    'update-player-list': (data: {
        playerId: string;
        nickname: string;
        teamId?: number;
        character?: string;
    }[]) => void;
    'kicked-from-game': (data: {
        message: string;
    }) => void;
    'host-disconnected': () => void;
    'game-started': (data: {
        totalQuestions: number;
    }) => void;
    'host-question-start': (data: {
        questionId: number;
        questionText: string;
        answers: {
            text: string;
            color: string;
        }[];
        timer: number;
        startsAt: number;
        questionIndex: number;
        totalQuestions: number;
        questionType: QuestionType;
    }) => void;
    'player-question-start': (data: {
        questionId: number;
        questionText: string;
        answers: {
            text: string;
            color: string;
        }[];
        answerCount: number;
        timer: number;
        startsAt: number;
        questionIndex: number;
        totalQuestions: number;
        questionType: QuestionType;
    }) => void;
    'answer-received': (data: {
        answeredCount: number;
        totalCount: number;
    }) => void;
    'answer-confirmed': (data: {
        accepted: boolean;
        playerId?: string;
        sessionId?: string;
    }) => void;
    'timer-tick': (data: {
        timeLeft: number;
    }) => void;
    'time-up': () => void;
    'question-ended': (data: {
        correctIndex: number;
        stats: {
            answerIndex: number;
            count: number;
        }[];
        leaderboard: LeaderboardEntry[];
        correctAnswer?: string;
    }) => void;
    'game-ended': (data: {
        finalRankings: LeaderboardEntry[];
    }) => void;
    'join-error': (data: {
        message: string;
    }) => void;
    'error': (data: {
        message: string;
    }) => void;
    'team-created': (data: {
        teamId: number;
        name: string;
        color: string;
    }) => void;
    'team-updated': (data: {
        teams: Team[];
    }) => void;
    'powerup-used': (data: {
        playerId: string;
        powerUpId: number;
        effect: string;
    }) => void;
    'powerup-purchased': (data: {
        playerId: string;
        powerUpId: number;
        remainingPoints: number;
    }) => void;
    'chat-received': (data: {
        playerId: string;
        nickname: string;
        message: string;
        type: 'chat' | 'reaction';
    }) => void;
    'reaction-received': (data: {
        playerId: string;
        reaction: string;
    }) => void;
}
//# sourceMappingURL=types.d.ts.map