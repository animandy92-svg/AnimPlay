import animalPhotos from './animal-photos.json';

export interface QuestionMedia {
  src: string; alt: string; kind: 'image' | 'diagram'; credit: string; sourceUrl: string;
}
export interface LibraryQuestion {
  id: number; question_text: string; answers: { text: string; color: string }[];
  correct_index: number; timer_seconds: number; points: number; questionType: string;
  category: string; difficulty: 'easy'; explanation: string; media?: QuestionMedia;
  source: { name: string; url: string; license: string };
}
export const QUIZ_CATEGORIES: Record<string, string> = {
  'cars-symbols': 'Cars & Symbols', 'bible-characters': 'Bible Characters',
  'countries-capitals': 'Countries & Capitals', flags: 'Countries & Flags',
  'accounting-standards': 'Accounting Standards', riddles: 'Simple Riddles',
  animals: 'Animal Pictures', general: 'Everyday General Knowledge',
};
const originalSource = { name: 'AnimPlay original question', url: '/quiz-sources.html', license: 'CC BY-SA 4.0' };
const colors = ['red', 'blue', 'yellow', 'green'];
type Entry = [text: string, correct: string, wrong1: string, wrong2: string, wrong3: string];
function question(id: number, category: string, [text, correct, ...incorrect]: Entry, media?: QuestionMedia, reference = originalSource): LibraryQuestion {
  const correct_index = id % 4, choices = [...incorrect];
  choices.splice(correct_index, 0, correct);
  return { id, category, difficulty: 'easy', question_text: text,
    answers: choices.map((text, i) => ({ text, color: colors[i] })), correct_index,
    timer_seconds: 30, points: 1000, questionType: 'multiple_choice',
    explanation: `The answer is ${correct}.`, source: reference, ...(media ? { media } : {}) };
}
const cars: Entry[] = [
  ['Which car brand uses these four linked rings?', 'Audi', 'BMW', 'Ford', 'Toyota'],
  ['Which car brand uses this three-pointed star?', 'Mercedes-Benz', 'Nissan', 'Honda', 'Kia'],
  ['Which car brand uses this blue-and-white circular badge?', 'BMW', 'Audi', 'Ford', 'Renault'],
  ['Which car brand has a V above a W in its badge?', 'Volkswagen', 'Volvo', 'Toyota', 'Honda'],
  ['Which car brand has its name inside a blue oval?', 'Ford', 'Ferrari', 'BMW', 'Audi'],
  ['Which car brand is famous for a prancing horse badge?', 'Ferrari', 'Ford', 'Toyota', 'Kia'],
  ['Which car brand is famous for a bull badge?', 'Lamborghini', 'Volkswagen', 'Audi', 'Honda'],
  ['Which car brand uses three red diamonds as its badge?', 'Mitsubishi', 'BMW', 'Ford', 'Volvo'],
  ['What do you turn to steer a car?', 'Steering wheel', 'Seat belt', 'Gear lever', 'Rear-view mirror'],
  ['Which pedal helps a car slow down or stop?', 'Brake pedal', 'Accelerator pedal', 'Clutch pedal', 'Footrest'],
  ['What should you fasten before a car journey?', 'Seat belt', 'Windscreen wipers', 'Headlights', 'Car horn'],
  ['Which part of a car helps you see the road at night?', 'Headlights', 'Tyres', 'Door handles', 'Seats'],
  ['What clears rain from a car windscreen?', 'Wipers', 'Indicators', 'Headlights', 'Seat belts'],
  ['What do car indicators tell other drivers?', 'You plan to turn', 'Your favourite song', 'Your name', 'The tyre size'],
  ['What do you connect to recharge an electric car?', 'Charging cable', 'Garden hose', 'Seat belt', 'Tow rope'],
];
const carReferences = [
  'https://www.audi.com/en/press-releases/how-the-four-rings-became-the-audi-trademark-auto-union-ag-founded-90-years-ago-14750',
  'https://group.mercedes-benz.com/company/tradition/mercedes-benz/birth.html',
  'https://www.bmwgroup.com/en/company/history.html',
];
const carPictures: QuestionMedia[] = ['Four linked rings', 'A three-pointed star inside a circle', 'A circular badge with blue-and-white quarters'].map((alt, index) => ({
  src: `/quiz-media/car-symbol-${index + 1}.svg`, alt, kind: 'image',
  credit: 'Simplified symbol illustration by AnimPlay', sourceUrl: '/quiz-sources.html',
}));
const bible: Entry[] = [
  ['Who built an ark before the great flood?', 'Noah', 'Moses', 'David', 'Peter'],
  ['Who defeated the giant Goliath?', 'David', 'Noah', 'Jonah', 'Paul'],
  ['Who led the Israelites out of Egypt?', 'Moses', 'Solomon', 'Peter', 'Joseph'],
  ['Who was thrown into a den of lions?', 'Daniel', 'David', 'Adam', 'John'],
  ['Who was swallowed by a great fish?', 'Jonah', 'Noah', 'Moses', 'Paul'],
  ['Who was the mother of Jesus?', 'Mary', 'Ruth', 'Esther', 'Sarah'],
  ['Who was the first man in the creation story?', 'Adam', 'Abraham', 'David', 'Jacob'],
  ['Who was the first woman in the creation story?', 'Eve', 'Mary', 'Ruth', 'Esther'],
  ['Which king was known for his wisdom?', 'Solomon', 'Saul', 'Herod', 'Pharaoh'],
  ['Who received a special colourful coat from his father Jacob?', 'Joseph', 'Daniel', 'Peter', 'Noah'],
  ['Who baptised Jesus in the River Jordan?', 'John the Baptist', 'Paul', 'Moses', 'Solomon'],
  ['Who betrayed Jesus for thirty pieces of silver?', 'Judas Iscariot', 'Peter', 'John', 'Thomas'],
  ['Who denied knowing Jesus three times?', 'Peter', 'Noah', 'David', 'Moses'],
  ['Who was known for great strength and long hair?', 'Samson', 'Jonah', 'Joseph', 'Solomon'],
  ['Which queen bravely spoke up to protect her people?', 'Esther', 'Eve', 'Mary', 'Ruth'],
];
const biblePassages = ['Genesis 6', '1 Samuel 17', 'Exodus 12', 'Daniel 6', 'Jonah 1', 'Luke 1', 'Genesis 2', 'Genesis 2', '1 Kings 3', 'Genesis 37', 'Matthew 3', 'Matthew 26', 'Luke 22', 'Judges 16', 'Esther 7'];
const capitals: Entry[] = [
  ['What is the capital of France?', 'Paris', 'London', 'Rome', 'Madrid'],
  ['What is the capital of the United Kingdom?', 'London', 'Paris', 'Berlin', 'Rome'],
  ['What is the capital of Japan?', 'Tokyo', 'Beijing', 'Seoul', 'Bangkok'],
  ['What is the capital of Italy?', 'Rome', 'Paris', 'Athens', 'Madrid'],
  ['What is the capital of Germany?', 'Berlin', 'Vienna', 'Oslo', 'London'],
  ['What is the capital of Spain?', 'Madrid', 'Lisbon', 'Paris', 'Rome'],
  ['What is the capital of Egypt?', 'Cairo', 'Nairobi', 'Lagos', 'Accra'],
  ['What is the capital of Kenya?', 'Nairobi', 'Cairo', 'Accra', 'Abuja'],
  ['What is the capital of Ghana?', 'Accra', 'Lagos', 'Nairobi', 'Cairo'],
  ['What is the capital of Nigeria?', 'Abuja', 'Accra', 'Cairo', 'Nairobi'],
  ['What is the capital of the United States?', 'Washington, D.C.', 'London', 'Paris', 'Tokyo'],
  ['What is the capital of China?', 'Beijing', 'Tokyo', 'Seoul', 'Bangkok'],
  ['What is the capital of India?', 'New Delhi', 'Tokyo', 'Beijing', 'Bangkok'],
  ['What is the capital of Canada?', 'Ottawa', 'Paris', 'Rome', 'London'],
  ['What is the capital of Iceland?', 'Reykjavík', 'Oslo', 'London', 'Paris'],
];
const flagCountries = [
  ['jp', 'Japan', 'A red circle on a white field'], ['fr', 'France', 'Vertical blue, white, and red stripes'],
  ['br', 'Brazil', 'A yellow diamond and blue globe on green'], ['ca', 'Canada', 'A red maple leaf between two red bands'],
  ['it', 'Italy', 'Vertical green, white, and red stripes'], ['ch', 'Switzerland', 'A white cross on a red square'],
  ['in', 'India', 'Orange, white, and green bands with a blue wheel'], ['gb', 'United Kingdom', 'Red and white crosses on blue'],
  ['za', 'South Africa', 'A green Y-shaped band with red, blue, yellow, black, and white'],
  ['au', 'Australia', 'White stars and a small Union Jack on blue'], ['de', 'Germany', 'Horizontal black, red, and yellow bands'],
  ['us', 'United States', 'Red and white stripes with white stars on a blue rectangle'],
  ['cn', 'China', 'A large yellow star and four small yellow stars on red'],
  ['es', 'Spain', 'Red, yellow, and red horizontal bands with a coat of arms'], ['ng', 'Nigeria', 'Vertical green, white, and green bands'],
];
const accounting: Entry[] = [
  ['What are accounting standards?', 'Rules for preparing financial reports', 'Rules for driving cars', 'Rules for playing football', 'Rules for spelling words'],
  ['Why do businesses use accounting standards?', 'To make financial reports consistent and comparable', 'To choose company colours', 'To set shop opening times', 'To plan staff holidays'],
  ['What does IFRS stand for?', 'International Financial Reporting Standards', 'International Food Rating System', 'Internal Factory Repair Schedule', 'International Football Ranking Service'],
  ['What does IAS stand for in accounting?', 'International Accounting Standards', 'International Animal Society', 'Internal Advertising Service', 'International Airport Schedule'],
  ['What does GAAP stand for?', 'Generally Accepted Accounting Principles', 'Global Animal Adoption Programme', 'General Annual Advertising Plan', 'Global Automobile Approval Process'],
  ['IAS 2 is about inventories. Which item is an example of inventory?', 'Goods a shop keeps to sell', 'The shop owner’s holiday', 'The weather outside', 'The shop’s opening hours'],
  ['IAS 7 covers cash flow statements. What do they show?', 'Cash coming in and going out', 'Employee birthdays', 'Product colours', 'Customer shoe sizes'],
  ['IAS 16 covers property, plant and equipment. Which item fits?', 'A machine used by a factory', 'An advertising slogan', 'A customer review', 'A staff lunch menu'],
  ['IAS 38 covers intangible assets. Which asset has no physical form?', 'A patent', 'A delivery van', 'An office chair', 'A factory machine'],
  ['IAS 12 covers which topic?', 'Income taxes', 'Animal habitats', 'Road signs', 'Weather forecasts'],
  ['IAS 19 covers employee benefits. Which item fits?', 'Staff pensions', 'Car badges', 'Country flags', 'Restaurant recipes'],
  ['IFRS 15 covers revenue from customers. What is revenue?', 'Income earned from selling goods or services', 'The colour of a company logo', 'The number of office doors', 'The size of a car engine'],
  ['IFRS 16 covers leases. What is a lease?', 'An agreement to use an asset for a period in return for payment', 'A country’s national song', 'A type of animal', 'A list of capital cities'],
  ['IAS 36 covers impairment. What does impairment mean?', 'An asset has lost value below its recorded amount', 'An employee has changed their name', 'A shop has changed its logo', 'A company has opened a website'],
  ['IAS 40 covers investment property. Which example fits?', 'A building held to earn rent', 'Goods waiting to be sold', 'A machine used in production', 'An employee’s personal bicycle'],
];
const accountingReferences = [
  'https://www.ifrs.org/issued-standards/', 'https://www.ifrs.org/issued-standards/',
  'https://www.ifrs.org/issued-standards/', 'https://www.ifrs.org/issued-standards/', 'https://www.fasb.org/standards',
  ...['ias-2-inventories', 'ias-7-statement-of-cash-flows', 'ias-16-property-plant-and-equipment',
    'ias-38-intangible-assets', 'ias-12-income-taxes', 'ias-19-employee-benefits',
    'ifrs-15-revenue-from-contracts-with-customers', 'ifrs-16-leases', 'ias-36-impairment-of-assets',
    'ias-40-investment-property'].map(slug => `https://www.ifrs.org/issued-standards/list-of-standards/${slug}/`),
];
const riddles: Entry[] = [
  ['What has hands but cannot clap?', 'A clock', 'A chair', 'A book', 'A shoe'],
  ['What has many keys but cannot open a door?', 'A piano', 'A ladder', 'A cup', 'A ball'],
  ['What gets wetter as it dries you?', 'A towel', 'A candle', 'A mirror', 'A pencil'],
  ['What has a neck but no head?', 'A bottle', 'A shoe', 'A coin', 'A spoon'],
  ['What has one eye but cannot see?', 'A needle', 'A book', 'A glove', 'A plate'],
  ['What has teeth but cannot bite?', 'A comb', 'A cup', 'A sock', 'A balloon'],
  ['What has a thumb and four fingers but is not alive?', 'A glove', 'A hat', 'A scarf', 'A shoe'],
  ['What has pages and a spine but is not a person?', 'A book', 'A spoon', 'A ball', 'A cup'],
  ['What has to be broken before you can cook it in a pan?', 'An egg', 'A plate', 'A fork', 'A chair'],
  ['What has four legs but cannot walk?', 'A table', 'A dog', 'A cat', 'A horse'],
  ['What has words but never speaks?', 'A newspaper', 'A microphone', 'A parrot', 'A singer'],
  ['What becomes shorter as it burns?', 'A candle', 'A mirror', 'A stone', 'A spoon'],
  ['What has a face and two hands but no arms or legs?', 'A clock', 'A hat', 'A shoe', 'A cup'],
  ['What do you open above your head to keep rain off?', 'An umbrella', 'A book', 'A fridge', 'A suitcase'],
  ['What has a head and a tail but no body?', 'A coin', 'A chair', 'A towel', 'A candle'],
];
const animalPictures = [
  ['1F981', 'Lion', 'A golden animal with a large mane'], ['1F418', 'Elephant', 'A grey animal with a long trunk and large ears'],
  ['1F992', 'Giraffe', 'A spotted animal with a very long neck'], ['1F993', 'Zebra', 'A horse-shaped animal with black-and-white stripes'],
  ['1F408', 'Cat', 'A small furry pet with whiskers and pointed ears'], ['1F415', 'Dog', 'A furry pet with a long snout and a wagging tail'],
  ['1F407', 'Rabbit', 'A small furry animal with long ears'], ['1F43C', 'Panda', 'A black-and-white bear with dark patches around its eyes'],
  ['1F427', 'Penguin', 'A black-and-white bird standing upright with flipper-like wings'], ['1F438', 'Frog', 'A green animal with large eyes and wide mouth'],
  ['1F422', 'Turtle', 'An animal with four legs and a shell on its back'], ['1F412', 'Monkey', 'A brown animal with a curling tail'],
  ['1F40E', 'Horse', 'A large four-legged animal with hooves and a mane'], ['1F98B', 'Butterfly', 'An insect with two pairs of large colourful wings'],
  ['1F41F', 'Fish', 'An underwater animal with fins and a tail'],
];
function animalPhotoMedia(index: number, alt = animalPictures[index][2]): QuestionMedia {
  const photo = animalPhotos[index];
  return { src: photo.src, alt, kind: 'image',
    credit: `Photo: ${photo.author} · ${photo.license}`, sourceUrl: photo.sourceUrl };
}
// Saved drafts or copies made with the earlier pictures display the matching real photo too.
export function upgradeAnimalMedia(media: QuestionMedia): QuestionMedia {
  const match = media.src.match(/^\/quiz-media\/animal-(\d+)\.svg$/);
  const index = match ? Number(match[1]) - 1 : -1;
  return match && media.credit.includes('OpenMoji') && animalPhotos[index]
    ? animalPhotoMedia(index, media.alt) : media;
}
const general: Entry[] = [
  ['How many days are in a week?', 'Seven', 'Five', 'Eight', 'Ten'],
  ['How many months are in a year?', 'Twelve', 'Six', 'Ten', 'Twenty'],
  ['Which planet do we live on?', 'Earth', 'Mars', 'Jupiter', 'Venus'],
  ['What do we use to tell the time?', 'A clock', 'A spoon', 'A pillow', 'A shoe'],
  ['Which shape has three sides?', 'Triangle', 'Square', 'Circle', 'Rectangle'],
  ['How many minutes are in an hour?', 'Sixty', 'Thirty', 'Ten', 'One hundred'],
  ['What is frozen water called?', 'Ice', 'Steam', 'Sand', 'Smoke'],
  ['Which sense do we use with our ears?', 'Hearing', 'Taste', 'Smell', 'Sight'],
  ['What do you use to brush your teeth?', 'A toothbrush', 'A hairbrush', 'A paintbrush', 'A broom'],
  ['What is two plus two?', 'Four', 'Three', 'Five', 'Six'],
  ['Which season comes after winter?', 'Spring', 'Autumn', 'Summer', 'Winter again'],
  ['What do we call the star that gives Earth daylight?', 'The Sun', 'The Moon', 'Mars', 'Venus'],
  ['Which object helps you cut paper?', 'Scissors', 'A pillow', 'A cup', 'A towel'],
  ['What does a thermometer measure?', 'Temperature', 'Time', 'Distance', 'Weight'],
  ['Which meal is usually eaten first in the morning?', 'Breakfast', 'Dinner', 'Supper', 'Dessert'],
];
function quiz(id: number, category: string, description: string, entries: Entry[], mediaFor?: (index: number) => QuestionMedia | undefined, sourceFor?: (index: number) => typeof originalSource) {
  const questions = entries.map((entry, index) => question(id * 100 + index, category, entry, mediaFor?.(index), sourceFor?.(index)));
  return { id, title: QUIZ_CATEGORIES[category], description, category, difficulty: 'easy' as const,
    format: questions.some(q => q.media) ? 'image' : 'text', creator_name: 'AnimPlay',
    play_count: 0, status: 'published', source: originalSource, questions,
    coverImage: questions.find(q => q.media)?.media?.src || null };
}
export const QUIZ_LIBRARY = [
  quiz(910200, 'cars-symbols', 'Recognise familiar car badges and everyday car parts. Easy questions, all about cars.', cars, index => carPictures[index], index => index < 3 ? { ...originalSource, url: carReferences[index] } : originalSource),
  quiz(910201, 'bible-characters', 'Meet well-known people from Bible stories. Every question asks about a Bible character.', bible, undefined, index => ({ ...originalSource, url: `https://www.biblegateway.com/passage/?search=${encodeURIComponent(biblePassages[index])}&version=KJV` })),
  quiz(910202, 'countries-capitals', 'Match familiar countries to their capital cities. Short questions and clear choices.', capitals),
  quiz(910203, 'flags', 'Look at 15 national flags and choose the country. Every question includes a flag picture.', flagCountries.map(([, name], index) => ['Which country does this flag belong to?', name, ...[1, 4, 7].map(offset => flagCountries[(index + offset) % flagCountries.length][1])] as Entry), index => ({ src: `/quiz-media/${flagCountries[index][0]}.png`, alt: flagCountries[index][2], kind: 'image', credit: 'Flag images: FlagCDN / Flagpedia', sourceUrl: 'https://flagpedia.net/' })),
  quiz(910204, 'accounting-standards', 'Learn what common accounting standards mean and what they cover. Simple definitions, with no calculations.', accounting, undefined, index => ({ ...originalSource, url: accountingReferences[index] })),
  quiz(910205, 'riddles', 'Solve short, familiar riddles about everyday objects. One clear answer for each.', riddles),
  quiz(910206, 'animals', 'Name 15 familiar animals from real photographs. Every question is animal identification.', animalPictures.map(([, name], index) => ['What animal is shown in this picture?', name, ...[2, 5, 8].map(offset => animalPictures[(index + offset) % animalPictures.length][1])] as Entry), index => animalPhotoMedia(index)),
  quiz(910207, 'general', 'Everyday facts about time, shapes, nature and common objects. A gentle quiz for everyone.', general),
];
export const QUIZ_LIBRARY_WITH_TOPICS = QUIZ_LIBRARY;

// Select one category, then sample only its question bank. Never fall back to a mixed quiz.
export function buildEasyQuiz(topic: string, count: number, random = Math.random) {
  const term = topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const aliases: Record<string, string[]> = {
    'cars-symbols': ['cars', 'car', 'cars and symbols', 'car symbols', 'car logos', 'car badges', 'automobiles'],
    'bible-characters': ['bible', 'bible characters', 'biblical characters', 'bible stories'],
    'countries-capitals': ['capitals', 'countries and capitals', 'countries and their capitals', 'capital cities', 'countries and their capital'],
    flags: ['flags', 'country flags', 'countries and flags', 'countries and their flags'],
    'accounting-standards': ['accounting', 'accounting standards', 'ifrs', 'ias'],
    riddles: ['riddles', 'riddle', 'simple riddles'],
    animals: ['animals', 'animal pictures', 'pictures of animals', 'animal identification'],
    general: ['general', 'general knowledge', 'everyday general knowledge', 'simple general knowledge'],
  };
  const category = Object.keys(QUIZ_CATEGORIES).find(key => key.replace(/-/g, ' ') === term || QUIZ_CATEGORIES[key].toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === term || aliases[key].includes(term));
  if (!category) throw new Error('Choose a quiz topic from the list so every question stays on that topic.');
  if (!Number.isInteger(count) || count < 1 || count > 15) throw new Error('Choose between 1 and 15 questions.');
  const selected = QUIZ_LIBRARY.find(quiz => quiz.category === category)!;
  const questions = selected.questions.map(q => ({ ...q, answers: q.answers.map(a => ({ ...a })) }));
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return { ...selected, questions: questions.slice(0, count) };
}
