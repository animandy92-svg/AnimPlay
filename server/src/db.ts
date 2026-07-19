import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  Host,
  Quiz,
  Question,
  Answer,
  PowerUp,
  nextId,
} from './models';

export async function connectDb(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  await mongoose.connect(uri);
  console.log('Successfully connected to MongoDB!');
  await seedDiscoverContent();
  await seedPowerUps();
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

const COLORS = ['red', 'blue', 'yellow', 'green'];

async function seedDiscoverContent(): Promise<void> {
  const publicCount = await Quiz.countDocuments({ isPublic: true });
  if (publicCount > 0) return;

  let systemHost = await Host.findOne({ username: 'animplay' });
  if (!systemHost) {
    const hash = await bcrypt.hash('demo1234', 10);
    const id = await nextId('hosts');
    systemHost = await Host.create({
      id,
      username: 'animplay',
      email: 'demo@animplay.local',
      password: hash,
    });
  }

  const hostId = systemHost.id;

  const samples = [
    {
      title: 'World Capitals',
      description: 'Test your geography knowledge',
      category: 'general',
      questions: [
        { text: 'What is the capital of France?', correct: 0, answers: ['Paris', 'London', 'Berlin', 'Madrid'] },
        { text: 'What is the capital of Japan?', correct: 0, answers: ['Tokyo', 'Seoul', 'Beijing', 'Bangkok'] },
      ],
    },
    {
      title: 'Science Trivia',
      description: 'Fun facts about the natural world',
      category: 'science',
      questions: [
        { text: 'What planet is known as the Red Planet?', correct: 0, answers: ['Mars', 'Venus', 'Jupiter', 'Saturn'] },
        { text: 'What gas do plants absorb?', correct: 0, answers: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'] },
      ],
    },
    {
      title: 'Movie Night',
      description: 'Classic film questions',
      category: 'trivia',
      questions: [
        { text: 'Who directed Jurassic Park?', correct: 0, answers: ['Steven Spielberg', 'James Cameron', 'George Lucas', 'Peter Jackson'] },
      ],
    },
    {
      title: 'Spanish Basics',
      description: 'Learn common Spanish words',
      category: 'language',
      questions: [
        { text: 'How do you say Hello in Spanish?', correct: 0, answers: ['Hola', 'Adios', 'Gracias', 'Por favor'] },
        { text: 'How do you say Thank you in Spanish?', correct: 0, answers: ['Gracias', 'Hola', 'Si', 'No'] },
      ],
    },
    {
      title: 'Sports Legends',
      description: 'Athletes and records',
      category: 'sports',
      questions: [
        { text: 'How many players on a soccer team?', correct: 0, answers: ['11', '9', '7', '13'] },
      ],
    },
  ];

  for (const sample of samples) {
    const quizId = await nextId('quizzes');
    await Quiz.create({
      id: quizId,
      hostId,
      title: sample.title,
      description: sample.description,
      isPublic: true,
      category: sample.category,
      playCount: Math.floor(Math.random() * 5000) + 100,
      status: 'published',
      isFavorite: false,
      folderId: null,
      deletedAt: null,
    });

    for (let qi = 0; qi < sample.questions.length; qi++) {
      const q = sample.questions[qi];
      const questionId = await nextId('questions');
      await Question.create({
        id: questionId,
        quizId,
        questionText: q.text,
        imageUrl: null,
        timerSeconds: 20,
        points: 1000,
        pointsMultiplier: 1.0,
        sortOrder: qi,
        correctIndex: q.correct,
      });

      for (let ai = 0; ai < q.answers.length; ai++) {
        const answerId = await nextId('answers');
        await Answer.create({
          id: answerId,
          questionId,
          sortIndex: ai,
          text: q.answers[ai],
          color: COLORS[ai] || 'red',
        });
      }
    }
  }

  console.log('Seeded discover content');
}

async function seedPowerUps(): Promise<void> {
  const count = await PowerUp.countDocuments();
  if (count > 0) return;

  const powerUps = [
    { name: 'double_points', description: 'Double points for next correct answer', icon: '2x', cost: 500 },
    { name: 'remove_one', description: 'Remove one wrong answer', icon: '-1', cost: 300 },
    { name: 'time_freeze', description: 'Pause timer for 3 seconds', icon: '⏸', cost: 400 },
  ];

  for (const pu of powerUps) {
    const id = await nextId('power_ups');
    await PowerUp.create({ id, ...pu });
  }

  console.log('Seeded power-ups');
}
