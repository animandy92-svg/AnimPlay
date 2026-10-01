import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { csvCell, type GameRecord } from '../services/gameLogic';
import { ReviewAnswers } from '../components/GameUI';

export default function ReportDetail() {
  const { gameId } = useParams();
  const [data, setData] = useState<GameRecord | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(''); try { setData(await api.reports.detail(Number(gameId))); } catch (e: any) { setError(e.message || 'Could not load this report.'); } finally { setLoading(false); } }, [gameId]);
  useEffect(() => { void load(); }, [load]);
  function download() {
    if (!data) return;
    const rows: unknown[][] = [['Player', 'Question', 'Answer', 'Correct answer', 'Correct', 'Points', 'Response seconds']];
    data.results.forEach((player: GameRecord) => player.history.forEach((a: GameRecord) => rows.push([player.nickname, a.questionText, a.answer, a.correctAnswer, a.correct ? 'Yes' : 'No', a.points, a.responseTimeMs === null ? '' : (a.responseTimeMs / 1000).toFixed(2)])));
    if (rows.length === 1) { rows[0] = ['Player', 'Score', 'Correct', 'Total']; data.results.forEach((p: GameRecord) => rows.push([p.nickname, p.score, p.correct, p.total])); }
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `animplay-report-${gameId}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const questions = data?.questions || [], results = data?.results || [];
  const attempts = questions.reduce((n: number, q: GameRecord) => n + q.playerCount, 0);
  const correct = questions.reduce((n: number, q: GameRecord) => n + q.correctCount, 0);
  const difficult = questions.filter((q: GameRecord) => q.playerCount > 0 && q.correctCount / q.playerCount < 0.6);
  return <div className="section-page"><Link to="/reports" className="game-link">← All reports</Link>{loading ? <p role="status">Loading learning report…</p> : error ? <div role="alert"><p>{error}</p><button className="game-secondary" onClick={() => void load()}>Try again</button></div> : data && <>
    <div className="page-heading"><div><p className="eyebrow">FROM SCORES TO NEXT STEPS</p><h1>{data.game.quiz_title}</h1><p>{new Date(data.game.ended_at).toLocaleString()} · {data.game.settings?.playStyle || 'Classic'} play</p></div><button className="game-primary" onClick={download}>Download CSV</button></div>
    <div className="report-summary"><div><strong>{results.length}</strong><span>players</span></div><div><strong>{questions.length || results[0]?.total || 0}</strong><span>completed questions</span></div><div><strong>{attempts ? `${Math.round(correct / attempts * 100)}%` : '—'}</strong><span>overall accuracy</span></div></div>
    <section className="game-card"><h2>What to revisit</h2>{questions.length === 0 ? <p>This older game has player totals. Question-level insights will appear for newly hosted games.</p> : difficult.length ? <><p>These questions had fewer than 60% correct answers. Use them to guide the next discussion.</p><ul>{difficult.map((q: GameRecord) => <li key={q.questionIndex}>{q.questionIndex + 1}. {q.questionText}</li>)}</ul></> : <p>No questions fell below 60% accuracy. Try a new topic or ask players to explain their answers.</p>}</section>
    {questions.length > 0 && <section className="game-card"><h2>Question by question</h2>{questions.map((q: GameRecord) => <article className="question-report" key={q.questionIndex}><h3>{q.questionIndex + 1}. {q.questionText}</h3><p><strong>{q.correctCount} / {q.playerCount} correct</strong> · {q.playerCount - q.answeredCount} unanswered · {(q.averageResponseMs / 1000).toFixed(1)}s average response</p><progress aria-label={`Accuracy for question ${q.questionIndex + 1}`} max={Math.max(1, q.playerCount)} value={q.correctCount} /><p>Answer: <strong>{q.correctAnswer}</strong></p>{q.explanation && <p>{q.explanation}</p>}{q.distribution?.map((a: GameRecord) => <p key={a.answerIndex}>{a.text}: <strong>{a.count}</strong></p>)}</article>)}</section>}
    <section className="game-card"><h2>Each player’s progress</h2>{results.map((p: GameRecord) => <details className="question-report" key={p.id}><summary><strong>{p.nickname}</strong> · {p.correct}/{p.total} correct · {p.score.toLocaleString()} points</summary><ReviewAnswers history={p.history || []} /></details>)}</section>
  </>}</div>;
}
