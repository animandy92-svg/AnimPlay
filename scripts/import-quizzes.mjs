// Run explicitly to refresh the licensed, checked-in internet question collection.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const categories = [[9,'Everyday knowledge','general'],[22,'Around the world','geography'],[23,'Through the ages','history'],[17,'Science lab','science'],[27,'Wild world','animals'],[21,'Game on','sports'],[11,'Movie night','film'],[12,'Sound check','music'],[10,'Book club','books'],[18,'Digital world','technology']];
const output = new URL('../client/src/data/', import.meta.url);
await mkdir(output, { recursive: true });
let collected = [];
try { collected = JSON.parse(await readFile(new URL('internet-questions.json', output), 'utf8')); } catch {}
const seen = new Set(collected.flatMap(c => c.questions.map(q => q.question)));
for (const [id, title, category] of categories) {
  if (collected.some(c => c.id === id)) continue;
  const questions = [];
  for (let attempt = 0; questions.length < 45 && attempt < 10; attempt++) {
    const response = await fetch(`https://opentdb.com/api.php?amount=50&category=${id}&type=multiple&encode=url3986`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    for (const raw of data.results || []) {
      const q = { ...raw, question: decodeURIComponent(raw.question), correct_answer: decodeURIComponent(raw.correct_answer), incorrect_answers: raw.incorrect_answers.map(decodeURIComponent) };
      // Omit questions that quickly date or are inappropriate for a general audience.
      if (seen.has(q.question) || /\b(current|currently|as of|202[0-9]|sex|porn|rape|suicide|penis|vagina)\b/i.test(q.question)) continue;
      if (new Set([q.correct_answer, ...q.incorrect_answers]).size !== 4) continue;
      questions.push(q); seen.add(q.question);
      if (questions.length === 45) break;
    }
    await new Promise(resolve => setTimeout(resolve, 5500));
  }
  if (questions.length < 45) throw new Error(`Not enough questions for ${title}`);
  collected.push({ id, title, category, questions });
  await writeFile(new URL('internet-questions.json', output), JSON.stringify(collected, null, 2) + '\n');
  console.log(`Imported ${title}: ${questions.length} questions`);
}
