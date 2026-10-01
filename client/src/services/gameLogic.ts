export type PlayStyle = 'classic' | 'accuracy' | 'relaxed';
export interface GameSettings { playStyle: PlayStyle; timeMultiplier: number; showLeaderboard: boolean }
export const DEFAULT_SETTINGS: GameSettings = { playStyle: 'classic', timeMultiplier: 1, showLeaderboard: true };
export const PLAY_STYLES = [
  { id: 'classic', title: 'Classic', description: 'A lively race. Correct answers earn a speed bonus.' },
  { id: 'accuracy', title: 'Accuracy', description: 'Equal points for correct answers, however quickly you answer.' },
  { id: 'relaxed', title: 'Relaxed', description: 'No countdown. Take time to think; the host leads each round.' },
] as const;
export type GameRecord = Record<string, any>;

export function settingsFor(value?: Partial<GameSettings>): GameSettings {
  return { playStyle: PLAY_STYLES.some(style => style.id === value?.playStyle) ? value!.playStyle! : 'classic', timeMultiplier: [1, 1.5, 2].includes(value?.timeMultiplier ?? 1) ? value?.timeMultiplier ?? 1 : 1, showLeaderboard: value?.showLeaderboard !== false };
}

export function validateQuiz(quiz: GameRecord) {
  if (!quiz.questions?.length) throw new Error('Add at least one question before hosting.');
  if (quiz.questions.length > 100) throw new Error('Use up to 100 questions in one game.');
  quiz.questions.forEach((q: GameRecord, i: number) => {
    const label = `Question ${i + 1}`;
    if (!q.question_text?.trim()) throw new Error(`${label} needs question text.`);
    if (!['multiple_choice', 'true_false', 'open_ended'].includes(q.questionType)) throw new Error(`${label} has an unsupported format.`);
    if (!Number.isFinite(q.timer_seconds) || q.timer_seconds < 5 || q.timer_seconds > 240) throw new Error(`${label} needs a timer between 5 and 240 seconds.`);
    if (!Number.isFinite(q.points) || q.points < 0 || q.points > 2000) throw new Error(`${label} needs points between 0 and 2000.`);
    if (q.questionType !== 'open_ended' && (!Array.isArray(q.answers) || q.answers.length < 2 || q.answers.length > 4 || q.answers.some((a: GameRecord) => !a.text?.trim()) || !Number.isInteger(q.correct_index) || !q.answers[q.correct_index])) throw new Error(`${label} needs answer choices and a correct answer.`);
    if (q.answers?.some((a: GameRecord) => /^(Edit this with|Add a believable distractor|Add another distractor|Add one final distractor)/.test(a.text))) throw new Error(`${label} still has starter answers. Edit them before hosting.`);
  });
}

export function publicQuiz(quiz: GameRecord) {
  return { id: quiz.id, title: quiz.title, questions: quiz.questions.map((q: GameRecord) => {
    const { correct_index, correctIndex, explanation, ...visible } = q;
    return visible;
  }) };
}

export function scoreAnswer(question: GameRecord, player: GameRecord, index: number, settings: GameSettings, durationMs: number) {
  const answered = player.answeredQuestion === index;
  const open = question.questionType === 'open_ended';
  const correct = answered && (open ? player.judgedQuestion === index && (player.judgedCorrect ?? player.awardedPoints > 0) : player.answerIndex === question.correct_index);
  const streak = correct ? (player.streak || 0) + 1 : 0;
  const speed = settings.playStyle === 'classic' ? Math.max(0.5, 1 - Math.max(0, player.responseTimeMs || 0) / Math.max(1, durationMs * 2)) : 1;
  const points = correct ? open ? Math.min(question.points, Math.max(0, player.awardedPoints)) : Math.round(question.points * speed) : 0;
  return { answered, correct, points, streak };
}

export function rankPlayers(players: GameRecord[], teams: GameRecord[] = []) {
  return [...players].sort((a, b) => (b.score || 0) - (a.score || 0) || a.nickname.localeCompare(b.nickname)).map((p, i, sorted) => ({
    rank: sorted.findIndex(other => (other.score || 0) === (p.score || 0)) + 1,
    playerId: p.playerId, nickname: p.nickname, character: p.character || '✨', score: p.score || 0, correct: p.correct || 0, streak: p.streak || 0,
    teamId: p.teamId || null, teamName: teams.find(t => t.id === p.teamId)?.name || null,
  }));
}

export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`;
}
