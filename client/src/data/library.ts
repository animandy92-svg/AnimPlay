import imported from './internet-questions.json';

export interface QuestionMedia {
  src: string;
  alt: string;
  kind: 'image' | 'diagram';
  credit: string;
  sourceUrl: string;
}
export interface LibraryQuestion {
  id: number;
  question_text: string;
  answers: { text: string; color: string }[];
  correct_index: number;
  timer_seconds: number;
  points: number;
  questionType: string;
  media?: QuestionMedia;
  source: { name: string; url: string; license: string };
}
const colors = ['red', 'blue', 'yellow', 'green'];
const countries = [['jp','Japan'],['fr','France'],['br','Brazil'],['ca','Canada'],['it','Italy'],['ch','Switzerland'],['in','India'],['gb','United Kingdom'],['za','South Africa'],['au','Australia']];
const labels = [['Books','Games','Art'],['Asia','Europe','Africa'],['Monday','Tuesday','Wednesday'],['Copper','Iron','Zinc'],['Birds','Cats','Dogs'],['Red team','Blue team','Green team'],['Comedy','Drama','Animation'],['Piano','Guitar','Drums'],['Fiction','Poetry','History'],['Tablet','Laptop','Phone']];
const source = { name: 'Open Trivia Database', url: 'https://opentdb.com/', license: 'CC BY-SA 4.0' };
function question(id: number, text: string, correct: string, incorrect: string[], credit = source, media?: QuestionMedia): LibraryQuestion {
  const choices = [...incorrect];
  const correct_index = id % 4;
  choices.splice(correct_index, 0, correct);
  return { id, question_text: text, answers: choices.map((text, i) => ({ text, color: colors[i] })), correct_index, timer_seconds: 30, points: 1000, questionType: 'multiple_choice', source: credit, ...(media ? { media } : {}) };
}
export const QUIZ_LIBRARY = imported.flatMap((topic, topicIndex) => ['text','image','diagram'].map((format, round) => {
  const id = 910001 + topicIndex * 3 + round;
  const questions = topic.questions.slice(round * 15, round * 15 + 15).map((q, i) => question(id * 100 + i, q.question, q.correct_answer, q.incorrect_answers));
  if (format === 'image') {
    for (let bonus = 0; bonus < 2; bonus++) {
      const index = (topicIndex + bonus * 3) % countries.length;
      const [code, country] = countries[index];
      const options = [1,2,4].map(offset => countries[(index + offset) % countries.length][1]);
      questions.splice(bonus * 8, 0, question(id*100+20+bonus, 'Which country does this flag represent?', country, options,
        { name: 'Flagpedia', url: 'https://flagpedia.net/download/api', license: 'National flag / public domain' },
        { src: `/quiz-media/${code}.png`, alt: 'National flag for the country identification question', kind: 'image', credit: 'Flag images: FlagCDN / Flagpedia', sourceUrl: 'https://flagpedia.net/' }));
    }
  }
  if (format === 'diagram') {
    const media: QuestionMedia = { src: `/quiz-media/chart-${topicIndex+1}.svg`, alt: `Survey votes: ${labels[topicIndex].map((label,i) => `${label}: ${[4,9,6][i]+topicIndex}`).join(', ')}`, kind: 'diagram', credit: 'Original diagram by AnimPlay; fictional survey data', sourceUrl: '/quiz-sources.html' };
    const original = { name: 'AnimPlay original chart question', url: '/quiz-sources.html', license: 'CC BY-SA 4.0' };
    questions.unshift(question(id*100+20, 'According to the chart, which option received the most votes?', labels[topicIndex][1], [labels[topicIndex][0],labels[topicIndex][2],'All received the same number'], original, media));
    questions.splice(8,0,question(id*100+21, `How many more votes did ${labels[topicIndex][1]} receive than ${labels[topicIndex][0]}?`, '5', ['3','7','9'], original, media));
  }
  const suffix = ['The essentials','Picture round','Chart challenge'][round];
  return { id, title: `${topic.title}: ${suffix}`, description: `Explore ${topic.category === 'general' ? 'general knowledge' : topic.category} with 15 internet-sourced questions${round === 1 ? ' and two flag picture questions' : round === 2 ? ' and two chart-reading questions' : ''}.`, category: topic.category, format, creator_name: 'Open Trivia DB + AnimPlay', play_count: 0, status: 'published', source, questions, coverImage: questions.find(q => q.media)?.media?.src || null };
}));
