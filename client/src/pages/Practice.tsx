import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { GameShell, ReviewAnswers } from '../components/GameUI';
import QuestionMedia from '../components/QuestionMedia';
import type { GameRecord } from '../services/gameLogic';

export default function Practice() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<GameRecord | null>(null), [error, setError] = useState('');
  const [index, setIndex] = useState(0), [history, setHistory] = useState<GameRecord[]>([]), [answer, setAnswer] = useState<number | null>(null);
  const [text, setText] = useState(''), [checked, setChecked] = useState(false);
  useEffect(() => { let alive = true; void api.quizzes.practice(Number(id)).then((data: GameRecord) => {
    if (!alive) return; setQuiz(data.quiz);
    try { const saved = JSON.parse(sessionStorage.getItem(`practice-${id}`) || 'null'); if (saved?.signature === JSON.stringify(data.quiz.questions)) { setIndex(saved.index); setHistory(saved.history); } } catch { /* A new practice session is safe if storage is unavailable. */ }
  }).catch((e: Error) => { if (alive) setError(e.message); }); return () => { alive = false; }; }, [id]);
  const question = quiz?.questions[index], finished = !!quiz && index >= quiz.questions.length;
  function next() {
    const open = question.questionType === 'open_ended';
    const correct = !open && answer === question.correct_index;
    const answers = [...history, { questionIndex: index, questionText: question.question_text, answered: true, correct, points: 0, answer: open ? text : question.answers[answer!].text, correctAnswer: open ? 'Reflection — discuss this with a host or teacher.' : question.answers[question.correct_index].text, explanation: question.explanation || '' }];
    setHistory(answers); setIndex(index + 1); setChecked(false); setAnswer(null); setText('');
    try { sessionStorage.setItem(`practice-${id}`, JSON.stringify({ signature: JSON.stringify(quiz!.questions), index: index + 1, history: answers })); } catch { /* Gameplay can continue without local persistence. */ }
  }
  function restart() { setIndex(0); setHistory([]); setChecked(false); setAnswer(null); setText(''); sessionStorage.removeItem(`practice-${id}`); }
  return <GameShell error={error}><div className="game-heading"><p className="game-eyebrow">YOUR PACE. YOUR PROGRESS.</p><h1>{quiz?.title || 'Opening practice…'}</h1><p>Practice on your own, with no clock and no shared scores.</p></div>
    {finished ? <section className="game-card"><h2>Practice complete</h2><p>{history.filter(a => a.correct).length} correct answers. Review your responses, then try again whenever you’re ready.</p><ReviewAnswers history={history} /><div className="game-actions"><button className="game-primary" onClick={restart}>Practice again</button><Link className="game-secondary" to="/dashboard">Back to library</Link></div></section> : question && <section className="game-card question-card"><p className="round-status">Question {index + 1} of {quiz!.questions.length}</p><h1>{question.question_text}</h1><QuestionMedia media={question.media} />
      {question.questionType === 'open_ended' ? <><label htmlFor="reflection">Your reflection</label><textarea id="reflection" maxLength={180} value={text} disabled={checked} onChange={e => setText(e.target.value)} /><p>Reflect on this prompt. A host can help you review your answer in a live game.</p></> : <div className="answer-grid">{question.answers.map((a: GameRecord, i: number) => <button className={`answer-tile answer-${i} ${answer === i ? 'answer-selected' : ''}`} aria-pressed={answer === i} disabled={checked} key={i} onClick={() => setAnswer(i)}>{a.text}{checked && i === question.correct_index && <small>Correct answer</small>}</button>)}</div>}
      {checked && <div className="answer-explanation" role="status"><h2>{question.questionType === 'open_ended' ? 'Reflection saved for this round' : answer === question.correct_index ? 'You got it!' : 'A chance to learn'}</h2>{question.questionType !== 'open_ended' && <p>Correct answer: <strong>{question.answers[question.correct_index].text}</strong></p>}{question.explanation && <p>{question.explanation}</p>}</div>}
      <div className="game-actions">{checked ? <button className="game-primary" onClick={next}>{index + 1 === quiz!.questions.length ? 'See my recap' : 'Next question'}</button> : <button className="game-primary" disabled={question.questionType === 'open_ended' ? !text.trim() : answer === null} onClick={() => setChecked(true)}>Check my answer</button>}</div></section>}
  </GameShell>;
}
