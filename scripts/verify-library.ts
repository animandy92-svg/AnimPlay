import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { QUIZ_LIBRARY } from '../client/src/data/library';
assert.equal(QUIZ_LIBRARY.length, 30);
assert.equal(new Set(QUIZ_LIBRARY.map(q => q.id)).size, 30);
const imported = new Set<string>();
const questionIds = new Set<number>();
for (const format of ['text','image','diagram']) assert.equal(QUIZ_LIBRARY.filter(q => q.format === format).length, 10);
for (const quiz of QUIZ_LIBRARY) {
  assert.ok(quiz.questions.length >= 15 && quiz.questions.length <= 20, quiz.title);
  assert.equal(quiz.questions.filter(q => !!q.media).length, quiz.format === 'text' ? 0 : 2);
  assert.ok(Buffer.byteLength(JSON.stringify(quiz)) < 900_000, 'Firestore document size');
  const seen = new Set<string>();
  for (const q of quiz.questions) {
    assert.ok(!questionIds.has(q.id), 'Unique question ID'); questionIds.add(q.id);
    const key = q.question_text + (q.media?.src || '');
    assert.ok(!seen.has(key), `Duplicate question within ${quiz.title}`); seen.add(key);
    assert.equal(q.answers.length, 4);
    assert.equal(new Set(q.answers.map(a => a.text)).size, 4);
    assert.ok(Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index < 4);
    assert.ok(q.question_text.trim() && q.source.url && q.source.license);
    assert.ok(q.answers.every(a => a.text.trim()));
    if (q.source.name === 'Open Trivia Database') {
      assert.ok(!imported.has(q.question_text), 'No duplicate imported questions'); imported.add(q.question_text);
    }
    if (q.media) assert.ok(existsSync(`client/public${q.media.src}`), `Missing media ${q.media.src}`);
  }
}
assert.equal(imported.size, 450);
assert.equal(questionIds.size, 490);
writeFileSync('client/public/quiz-library.json', JSON.stringify({ license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', attribution: 'Open Trivia Database community / PIXELTAIL GAMES LLC; adaptations and visual questions by AnimPlay; flag images via FlagCDN / Flagpedia.', retrievedAt: '2026-09-29', quizzes: QUIZ_LIBRARY }, null, 2) + '\n');
console.log('PASS: 30 quizzes, 490 questions, 450 unique imported questions, 10 quizzes per format, all answer keys and media paths valid.');
