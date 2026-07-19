import { useEffect, useState } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { QuestionType } from '@shared/types';

interface AnswerOption {
  text: string;
  color: string;
}

interface QuestionForm {
  question_text: string;
  timer_seconds: number;
  points: number;
  correct_index: number;
  answers: AnswerOption[];
  questionType: QuestionType;
}

const COLORS = ['red', 'blue', 'yellow', 'green'];
const SHAPES = ['▲', '◆', '●', '■'];
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'open_ended', label: 'Open Ended' },
];

const SAMPLE_QUIZ: { title: string; description: string; questions: QuestionForm[] } = {
  title: 'General Knowledge Trivia',
  description: 'A quick test of random facts.',
  questions: [
    {
      question_text: 'What is the capital of Japan?',
      timer_seconds: 20,
      points: 1000,
      correct_index: 2,
      answers: [
        { text: 'Kyoto', color: 'red' },
        { text: 'Osaka', color: 'blue' },
        { text: 'Tokyo', color: 'yellow' },
        { text: 'Seoul', color: 'green' },
      ],
      questionType: 'multiple_choice',
    },
    {
      question_text: 'The Great Wall of China is visible from space with the naked eye.',
      timer_seconds: 10,
      points: 2000,
      correct_index: 1,
      answers: [
        { text: 'True', color: 'red' },
        { text: 'False', color: 'blue' },
      ],
      questionType: 'true_false',
    },
  ],
};

export default function CreateQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [currentQ, setCurrentQ] = useState<QuestionForm>({
    question_text: '',
    timer_seconds: 20,
    points: 1000,
    correct_index: 0,
    answers: [
      { text: '', color: 'red' },
      { text: '', color: 'blue' },
      { text: '', color: 'yellow' },
      { text: '', color: 'green' },
    ],
    questionType: 'multiple_choice',
  });
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(true);
  const [searchParams] = useSearchParams();

  const loadQuiz = async () => {
    try {
      const data = await api.quizzes.get(Number(id));
      setTitle(data.quiz.title);
      setDescription(data.quiz.description);
      setQuestions(data.quiz.questions.map((q: any) => ({
        question_text: q.question_text,
        timer_seconds: q.timer_seconds,
        points: q.points,
        correct_index: q.correct_index,
        answers: q.answers.map((a: any) => ({ text: a.text, color: a.color })),
        questionType: q.questionType || 'multiple_choice',
      })));
    } catch (err) {
      alert('Failed to load quiz');
      navigate('/dashboard');
    }
  };

  const loadSampleQuiz = () => {
    setTitle(SAMPLE_QUIZ.title);
    setDescription(SAMPLE_QUIZ.description);
    setQuestions(SAMPLE_QUIZ.questions);
    setShowAddForm(false);
  };

  useEffect(() => {
    if (isEditing) {
      loadQuiz();
      return;
    }

    if (searchParams.get('sample') === 'true') {
      loadSampleQuiz();
    }
  }, [id, isEditing, loadQuiz, searchParams]);

  const handleAddQuestion = () => {
    if (!currentQ.question_text.trim()) {
      alert('Please enter a question');
      return;
    }
    const validAnswers = currentQ.answers.filter(a => a.text.trim());
    if (validAnswers.length < 2) {
      alert('Please enter at least 2 answers');
      return;
    }

    setQuestions([...questions, { ...currentQ }]);
    setCurrentQ({
      question_text: '',
      timer_seconds: 20,
      points: 1000,
      correct_index: 0,
      answers: [
        { text: '', color: 'red' },
        { text: '', color: 'blue' },
        { text: '', color: 'yellow' },
        { text: '', color: 'green' },
      ],
      questionType: 'multiple_choice',
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionTypeChange = (type: QuestionType) => {
    if (type === 'true_false') {
      setCurrentQ({
        ...currentQ,
        questionType: type,
        answers: [
          { text: 'True', color: 'red' },
          { text: 'False', color: 'blue' },
        ],
        correct_index: 0,
      });
    } else if (type === 'open_ended') {
      setCurrentQ({
        ...currentQ,
        questionType: type,
        answers: [{ text: '', color: 'red' }],
        correct_index: 0,
      });
    } else {
      setCurrentQ({
        ...currentQ,
        questionType: type,
        answers: [
          { text: '', color: 'red' },
          { text: '', color: 'blue' },
          { text: '', color: 'yellow' },
          { text: '', color: 'green' },
        ],
        correct_index: 0,
      });
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a quiz title');
      return;
    }
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    setSaving(true);
    try {
      let quizId = id ? Number(id) : null;

      if (!isEditing) {
        const quizData = await api.quizzes.create(title, description);
        quizId = quizData.quiz.id;
      } else {
        await api.quizzes.update(quizId!, { title, description });
        const existing = await api.quizzes.get(quizId!);
        for (const q of existing.quiz.questions) {
          await api.quizzes.deleteQuestion(quizId!, q.id);
        }
      }

      for (const q of questions) {
        await api.quizzes.addQuestion(quizId!, {
          question_text: q.question_text,
          timer_seconds: q.timer_seconds,
          points: q.points,
          correct_index: q.correct_index,
          questionType: q.questionType,
          answers: q.answers.filter(a => a.text.trim()),
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const updateAnswer = (index: number, text: string) => {
    const newAnswers = [...currentQ.answers];
    newAnswers[index] = { ...newAnswers[index], text };
    setCurrentQ({ ...currentQ, answers: newAnswers });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-animplay-purple text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/dashboard" className="font-display text-3xl">AnimPlay</Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-animplay-green text-white font-bold py-2 px-6 rounded-xl
                       hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl p-6 shadow mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="space-y-1">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quiz Title"
                className="w-full text-2xl font-bold border-b-2 border-gray-200 py-2 mb-3 focus:border-animplay-purple focus:outline-none"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full text-gray-500 border-b border-gray-200 py-2 focus:border-animplay-purple focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={loadSampleQuiz}
              className="rounded-xl bg-animplay-purple text-white px-5 py-3 font-semibold shadow hover:bg-animplay-purple-dark transition-colors"
            >
              Load Sample Quiz
            </button>
          </div>
        </div>

        {questions.length > 0 && (
          <div className="mb-6">
            <h2 className="font-display text-xl text-gray-700 mb-3">Questions ({questions.length})</h2>
            {questions.map((q, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow mb-3 flex items-center gap-4">
                <div className="bg-animplay-purple text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">{q.question_text}</div>
                  <div className="text-sm text-gray-400">
                    {q.timer_seconds}s · {q.points} pts · {q.answers.filter(a => a.text).length} answers · {q.questionType}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveQuestion(i)}
                  className="text-animplay-red hover:text-red-700 font-bold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddForm && (
          <div className="bg-white rounded-2xl p-6 shadow">
            <h2 className="font-display text-xl text-gray-700 mb-4">
              Add Question #{questions.length + 1}
            </h2>

            <div className="mb-4">
              <input
                type="text"
                value={currentQ.question_text}
                onChange={(e) => setCurrentQ({ ...currentQ, question_text: e.target.value })}
                placeholder="Your question (max 120 characters)"
                maxLength={120}
                className="w-full text-lg py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-animplay-purple focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-500 font-bold">Question Type</label>
              <select
                value={currentQ.questionType}
                onChange={(e) => handleQuestionTypeChange(e.target.value as QuestionType)}
                className="block w-full py-2 px-3 border-2 border-gray-200 rounded-lg mt-1"
              >
                {QUESTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {currentQ.questionType !== 'open_ended' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {currentQ.answers.map((answer, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-2xl">{SHAPES[i]}</span>
                    <input
                      type="text"
                      value={answer.text}
                      onChange={(e) => updateAnswer(i, e.target.value)}
                      placeholder={`Answer ${i + 1}`}
                      className="flex-1 py-2 px-3 border-2 border-gray-200 rounded-lg focus:border-animplay-purple focus:outline-none"
                    />
                    <input
                      type="radio"
                      name="correct"
                      checked={currentQ.correct_index === i}
                      onChange={() => setCurrentQ({ ...currentQ, correct_index: i })}
                      className="w-5 h-5"
                    />
                  </div>
                ))}
              </div>
            )}

            {currentQ.questionType === 'open_ended' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-blue-700 text-sm">
                  Open-ended questions have no predefined answers. The host will manually judge player responses during the game.
                </p>
              </div>
            )}

            <div className="flex gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-500 font-bold">Timer</label>
                <select
                  value={currentQ.timer_seconds}
                  onChange={(e) => setCurrentQ({ ...currentQ, timer_seconds: Number(e.target.value) })}
                  className="block w-full py-2 px-3 border-2 border-gray-200 rounded-lg"
                >
                  <option value="5">5s</option>
                  <option value="10">10s</option>
                  <option value="20">20s</option>
                  <option value="30">30s</option>
                  <option value="60">60s</option>
                  <option value="120">120s</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 font-bold">Points</label>
                <select
                  value={currentQ.points}
                  onChange={(e) => setCurrentQ({ ...currentQ, points: Number(e.target.value) })}
                  className="block w-full py-2 px-3 border-2 border-gray-200 rounded-lg"
                >
                  <option value="0">No points</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAddQuestion}
              className="bg-animplay-purple text-white font-display text-lg py-3 px-6 rounded-xl
                         hover:bg-animplay-purple-dark transition-colors"
            >
              Add Question
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
