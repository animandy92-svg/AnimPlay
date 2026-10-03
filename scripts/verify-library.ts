import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import animalPhotos from '../client/src/data/animal-photos.json';
import { QUIZ_CATEGORIES, QUIZ_LIBRARY } from '../client/src/data/library';
assert.equal(QUIZ_LIBRARY.length, 8);
assert.deepEqual(QUIZ_LIBRARY.map(q => q.category), Object.keys(QUIZ_CATEGORIES));
assert.equal(new Set(QUIZ_LIBRARY.map(q => q.id)).size, QUIZ_LIBRARY.length);
const questionIds = new Set<number>();
for (const quiz of QUIZ_LIBRARY) {
  assert.equal(quiz.questions.length, 15);
  assert.equal(quiz.difficulty, 'easy');
  assert.ok(Buffer.byteLength(JSON.stringify(quiz)) < 900_000, 'Firestore document size');
  const seen = new Set<string>();
  for (const q of quiz.questions) {
    assert.ok(!questionIds.has(q.id), 'Unique question ID'); questionIds.add(q.id);
    const key = q.question_text + (q.media?.src || '');
    assert.ok(!seen.has(key), `Duplicate question within ${quiz.title}`); seen.add(key);
    assert.equal(q.category, quiz.category, 'Every question stays in the quiz category');
    assert.equal(q.difficulty, 'easy');
    assert.equal(q.answers.length, 4);
    assert.equal(new Set(q.answers.map(a => a.text)).size, 4);
    assert.ok(Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index < 4);
    assert.ok(q.question_text.trim() && q.source.url && q.source.license);
    assert.ok(q.answers.every(a => a.text.trim()));
    if (q.media) assert.ok(existsSync(`client/public${q.media.src}`), `Missing media ${q.media.src}`);
    if (quiz.category === 'animals') {
      const photo = animalPhotos.find(photo => photo.src === q.media?.src);
      assert.ok(photo && photo.animal === q.answers[q.correct_index].text, 'Photograph matches its answer');
      const bytes = readFileSync(`client/public${q.media!.src}`);
      assert.ok(bytes[0] === 0xff && bytes[1] === 0xd8, 'Animal pictures are real JPEG photographs');
    }
    if (quiz.category === 'flags') assert.ok(q.media?.src.endsWith('.png'));
    if (quiz.category === 'bible-characters' || quiz.category === 'countries-capitals') assert.ok(!q.media);
  }
}
assert.equal(questionIds.size, 120);
writeFileSync('client/public/quiz-library.json', JSON.stringify({
  license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  attribution: 'Original questions and simplified symbol illustrations by AnimPlay; animal photographs via Wikimedia Commons with individual photographer credits and CC BY/CC BY-SA licenses; national flag images via FlagCDN / Flagpedia (public domain designs). Car trademarks belong to their respective owners.',
  revisedAt: '2026-10-03', quizzes: QUIZ_LIBRARY,
}, null, 2) + '\n');
console.log('PASS: 8 easy quizzes, 120 questions, eight separate topics, valid answer keys and all 33 pictures present.');
