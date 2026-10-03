import { describe, expect, it } from 'vitest';
import { buildEasyQuiz, QUIZ_CATEGORIES, QUIZ_LIBRARY, upgradeAnimalMedia } from '../src/data/library';

describe('easy quizzes stay within their chosen topic', () => {
  it('contains all eight requested topics with valid ready-to-play answers', () => {
    expect(QUIZ_LIBRARY.map(q => q.category)).toEqual(Object.keys(QUIZ_CATEGORIES));
    for (const quiz of QUIZ_LIBRARY) {
      expect(quiz.questions).toHaveLength(15);
      expect(new Set(quiz.questions.map(q => q.category))).toEqual(new Set([quiz.category]));
      for (const question of quiz.questions) {
        expect(question.difficulty).toBe('easy');
        expect(new Set(question.answers.map(a => a.text)).size).toBe(4);
        expect(question.answers[question.correct_index].text).toBeTruthy();
        expect(question.explanation).toContain(question.answers[question.correct_index].text);
      }
    }
  });
  it('keeps Bible characters and capitals free of unrelated visual bonus rounds', () => {
    const bible = buildEasyQuiz('Bible characters', 15);
    expect(bible.questions.every(q => /^(Who|Which king|Which queen)/.test(q.question_text) && !q.media)).toBe(true);
    const capitals = buildEasyQuiz('countries and their capital', 15);
    expect(capitals.questions.every(q => q.question_text.startsWith('What is the capital of ') && !q.media)).toBe(true);
  });
  it('gives every animal and flag question its own relevant picture', () => {
    for (const topic of ['animals', 'flags']) {
      const quiz = buildEasyQuiz(topic, 15);
      expect(new Set(quiz.questions.map(q => q.media?.src)).size).toBe(15);
      expect(quiz.questions.every(q => q.media?.kind === 'image')).toBe(true);
      expect(quiz.questions.every(q => !q.media!.alt.toLowerCase().includes(q.answers[q.correct_index].text.toLowerCase()))).toBe(true);
    }
  });
  it('samples only the selected category without changing the original answer banks', () => {
    for (const quiz of QUIZ_LIBRARY) {
      const built = buildEasyQuiz(quiz.category, 5, () => 0);
      expect(built.questions).toHaveLength(5);
      expect(new Set(built.questions.map(q => q.id)).size).toBe(5);
      expect(built.questions.every(q => quiz.questions.some(original => original.id === q.id))).toBe(true);
      built.questions[0].answers[0].text = 'Edited choice';
      expect(quiz.questions.some(q => q.answers.some(a => a.text === 'Edited choice'))).toBe(false);
    }
  });
  it('uses real photographs with attribution and upgrades earlier drawings in saved quizzes', () => {
    const animals = buildEasyQuiz('animals', 15);
    expect(animals.questions.every(q => q.media?.src.endsWith('.jpg') && q.media.sourceUrl.startsWith('https://commons.wikimedia.org/') && q.media.credit.includes('CC BY'))).toBe(true);
    const old = { src: '/quiz-media/animal-1.svg', alt: 'An animal with a mane', kind: 'image' as const, credit: 'Animal illustrations: OpenMoji · CC BY-SA 4.0', sourceUrl: 'https://openmoji.org/' };
    expect(upgradeAnimalMedia(old)).toMatchObject({ src: '/quiz-media/animal-1.jpg', alt: old.alt });
    expect(upgradeAnimalMedia({ ...old, credit: 'My own image' }).src).toBe(old.src);
  });
  it('rejects mixed or unknown topics and invalid counts instead of filling with unrelated questions', () => {
    for (const topic of ['Bible and cars', 'astronomy', '']) expect(() => buildEasyQuiz(topic, 5)).toThrow('Choose a quiz topic');
    for (const count of [0, 16, 3.5, NaN]) expect(() => buildEasyQuiz('animals', count)).toThrow('between 1 and 15');
  });
});
