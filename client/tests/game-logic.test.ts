import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, csvCell, publicQuiz, rankPlayers, scoreAnswer, settingsFor, validateQuiz } from '../src/services/gameLogic';

const question = { id: 1, question_text: 'Which planet?', questionType: 'multiple_choice', timer_seconds: 20, points: 1000, correct_index: 1, correctIndex: 1, explanation: 'Mars is red.', answers: [{ text: 'Venus' }, { text: 'Mars' }] };
describe('inclusive scoring and learning content', () => {
  it('rewards accuracy equally in both untimed and timed accuracy games', () => {
    for (const playStyle of ['accuracy', 'relaxed'] as const) {
      expect(scoreAnswer(question, { answeredQuestion: 0, answerIndex: 1, responseTimeMs: 19000 }, 0, { ...DEFAULT_SETTINGS, playStyle }, 20000).points).toBe(1000);
      expect(scoreAnswer(question, { answeredQuestion: 0, answerIndex: 1, responseTimeMs: 100 }, 0, { ...DEFAULT_SETTINGS, playStyle }, 20000).points).toBe(1000);
    }
  });
  it('awards classic speed points and preserves explicit zero-point questions', () => {
    const p = { answeredQuestion: 0, answerIndex: 1, responseTimeMs: 10000 };
    expect(scoreAnswer(question, p, 0, DEFAULT_SETTINGS, 20000).points).toBe(750);
    expect(scoreAnswer({ ...question, points: 0 }, p, 0, DEFAULT_SETTINGS, 20000)).toMatchObject({ correct: true, points: 0 });
  });
  it('does not reuse an answer from the previous round', () => {
    expect(scoreAnswer(question, { answeredQuestion: 0, answerIndex: 1, streak: 3 }, 1, DEFAULT_SETTINGS, 20000)).toMatchObject({ answered: false, correct: false, points: 0, streak: 0 });
  });
  it('uses host judgments only for the current typed-answer round', () => {
    const q = { ...question, questionType: 'open_ended' }, p = { answeredQuestion: 1, judgedQuestion: 1, awardedPoints: 500 };
    expect(scoreAnswer(q, p, 1, DEFAULT_SETTINGS, 20000)).toMatchObject({ correct: true, points: 500 });
    expect(scoreAnswer(q, { ...p, judgedQuestion: 0 }, 1, DEFAULT_SETTINGS, 20000).points).toBe(0);
  });
  it('removes both answer-key aliases and explanations from player quiz payloads', () => {
    const visible = publicQuiz({ id: 1, title: 'Space', questions: [question] });
    expect(visible.questions[0]).not.toHaveProperty('correct_index');
    expect(visible.questions[0]).not.toHaveProperty('correctIndex');
    expect(visible.questions[0]).not.toHaveProperty('explanation');
  });
  it('rejects unfinished outlines and invalid answer indexes before creating a room', () => {
    expect(() => validateQuiz({ questions: [question] })).not.toThrow();
    expect(() => validateQuiz({ questions: [{ ...question, correct_index: 9 }] })).toThrow('correct answer');
    expect(() => validateQuiz({ questions: [{ ...question, answers: [{ text: 'Edit this with the correct answer' }, { text: 'No' }] }] })).toThrow('starter answers');
  });
  it('gives tied scores equal rank and bounds host settings', () => {
    expect(rankPlayers([{ playerId: 'a', nickname: 'A', score: 20 }, { playerId: 'b', nickname: 'B', score: 20 }, { playerId: 'c', nickname: 'C', score: 10 }]).map(p => p.rank)).toEqual([1, 1, 3]);
    expect(settingsFor({ playStyle: 'bogus' as any, timeMultiplier: -2 })).toEqual(DEFAULT_SETTINGS);
  });
  it('escapes CSV quotes and spreadsheet formula prefixes', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('Two, three')).toBe('"Two, three"');
  });
});
