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

const originalSource = { name: 'AnimPlay original quiz', url: '/quiz-sources.html', license: 'CC BY-SA 4.0' };
type TopicQuestion = [string, string, string, string, string];
const focusedTopics: { id: number; title: string; category: string; questions: TopicQuestion[] }[] = [
  { id: 910100, title: 'Flag identification', category: 'flags', questions: [
    ['Which country has a red circle on a white flag?','Japan','Canada','Bangladesh','Turkey'], ['Which country has a blue, white, and red vertical tricolour?','France','Netherlands','Russia','Croatia'],
    ['Which country has a green field with a yellow diamond?','Brazil','Argentina','Mexico','Portugal'], ['Which country has a maple leaf on its flag?','Canada','Lebanon','Denmark','Austria'],
    ['Which country has green, white, and red vertical stripes?','Italy','Ireland','France','Hungary'], ['Which country has a white cross on a red square?','Switzerland','England','Georgia','Tonga'],
    ['Which country has a navy blue wheel on its flag?','India','Niger','Bangladesh','Pakistan'], ['Which country has a Union Jack in its flag?','United Kingdom','Australia','New Zealand','Fiji'],
    ['Which country has a Y-shaped green band on its flag?','South Africa','Namibia','Kenya','Zimbabwe'], ['Which country has a Union Jack and white stars on its flag?','Australia','Brazil','India','South Africa'],
    ['Which country has a cedar tree on its flag?','Lebanon','Cyprus','Greece','Jordan'], ['Which country has a white cross on a blue field?','Finland','Norway','Iceland','Israel'],
    ['Which country has a red dragon on its flag?','Wales','Scotland','Ireland','Malta'], ['Which country has a black star on a red, yellow, and green flag?','Ghana','Cameroon','Senegal','Guinea'],
    ['Which country has a red circle between blue stripes?','Laos','Cambodia','Thailand','Malaysia'],
  ] },
  { id: 910101, title: 'Countries & Capitals', category: 'countries-capitals', questions: [
    ['What is the capital of Japan?','Tokyo','Kyoto','Osaka','Sapporo'], ['What is the capital of France?','Paris','Lyon','Nice','Marseille'],
    ['What is the capital of Brazil?','Brasília','Rio de Janeiro','São Paulo','Salvador'], ['What is the capital of Canada?','Ottawa','Toronto','Vancouver','Montreal'],
    ['What is the capital of Australia?','Canberra','Sydney','Melbourne','Perth'], ['What is the capital of Egypt?','Cairo','Alexandria','Giza','Luxor'],
    ['What is the capital of Kenya?','Nairobi','Mombasa','Kisumu','Nakuru'], ['What is the capital of Italy?','Rome','Milan','Venice','Florence'],
    ['What is the capital of South Korea?','Seoul','Busan','Incheon','Daegu'], ['What is the capital of Argentina?','Buenos Aires','Córdoba','Rosario','Mendoza'],
    ['What is the capital of Thailand?','Bangkok','Phuket','Chiang Mai','Pattaya'], ['What is the capital of Norway?','Oslo','Bergen','Trondheim','Stavanger'],
    ['What is the capital of Peru?','Lima','Cusco','Arequipa','Trujillo'], ['What is the capital of New Zealand?','Wellington','Auckland','Christchurch','Hamilton'],
    ['What is the capital of Morocco?','Rabat','Casablanca','Marrakesh','Tangier'],
  ] },
  { id: 910102, title: 'Animal kingdom', category: 'animals', questions: [
    ['What is the largest animal on Earth?','Blue whale','African elephant','Giraffe','Whale shark'], ['Which mammal lays eggs?','Platypus','Koala','Dolphin','Bat'],
    ['What is a group of lions called?','A pride','A pack','A herd','A colony'], ['Which animal is known for changing colour to blend in?','Chameleon','Meerkat','Otter','Panda'],
    ['How many legs does a spider have?','Eight','Six','Ten','Twelve'], ['Which bird is famous for mimicking human speech?','Parrot','Penguin','Flamingo','Ostrich'],
    ['What is the fastest land animal?','Cheetah','Lion','Horse','Greyhound'], ['Which animal carries its baby in a pouch?','Kangaroo','Panda','Fox','Lemur'],
    ['What do caterpillars become?','Butterflies or moths','Beetles','Dragonflies','Spiders'], ['Which ocean animal has three hearts?','Octopus','Dolphin','Sea turtle','Seahorse'],
    ['What is a baby frog called?','Tadpole','Hatchling','Cub','Nymph'], ['Which animal is the tallest in the world?','Giraffe','Ostrich','Camel','Elephant'],
    ['What do bees collect from flowers to make honey?','Nectar','Pollen only','Sap','Seeds'], ['Which animal is known for building dams?','Beaver','Mink','Badger','Muskrat'],
    ['What is the largest living species of penguin?','Emperor penguin','King penguin','Gentoo penguin','Adélie penguin'],
  ] },
];

const focusedQuizzes = focusedTopics.map(topic => ({
  id: topic.id, title: topic.title, description: `A focused 15-question quiz all about ${topic.title.toLowerCase()}.`,
  category: topic.category, format: topic.category === 'flags' ? 'image' : 'text', creator_name: 'AnimPlay', play_count: 0, status: 'published', source: originalSource,
  questions: topic.questions.map(([text, answer, ...incorrect], index) => {
    const media = topic.category === 'flags' ? countries[index % countries.length] : null;
    return question(topic.id * 100 + index, text, answer, incorrect, originalSource, media && index < countries.length ? {
      src: `/quiz-media/${media[0]}.png`, alt: `Flag of ${media[1]}`, kind: 'image', credit: 'Flag images: FlagCDN / Flagpedia', sourceUrl: 'https://flagpedia.net/',
    } : undefined);
  }),
}));
export const QUIZ_LIBRARY_WITH_TOPICS = [...QUIZ_LIBRARY, ...focusedQuizzes];
