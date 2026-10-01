import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { GameRecord } from '../services/gameLogic';

export function GameShell({ children, error, online = true, retry, host = false }: { children: ReactNode; error?: string; online?: boolean; retry?: () => void; host?: boolean }) {
  return <main className="home-shell game-shell"><nav className="game-nav"><Link to="/" className="font-display text-2xl">AnimPlay<span className="text-cyan-300">.</span></Link><Link to={host ? '/dashboard' : '/join'}>{host ? 'My library' : 'Join a game'}</Link></nav>
    {!online && <div className="game-notice" role="status">You’re offline. Your seat is saved. Reconnect to continue.</div>}
    {error && <div className="game-notice" role="alert">{error}{retry && online && <button onClick={retry} className="game-link">Reconnect</button>}</div>}
    <div className="game-content">{children}</div></main>;
}
export function Standings({ entries, teams = false }: { entries: GameRecord[]; teams?: boolean }) {
  let rows = entries;
  if (teams) {
    const grouped = new Map<string, GameRecord>();
    entries.filter(e => e.teamId).forEach(e => { const key = String(e.teamId), prior = grouped.get(key); grouped.set(key, { playerId: key, nickname: e.teamName, score: (prior?.score || 0) + e.score, members: (prior?.members || 0) + 1 }); });
    rows = [...grouped.values()].sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
  }
  return <ol className="standings">{rows.map(entry => <li key={entry.playerId || entry.rank}><span className="standing-rank">{entry.rank}</span><span className="flex-1"><strong>{entry.character} {entry.nickname}</strong>{entry.teamName && <small>{entry.teamName}</small>}{entry.members && <small>{entry.members} players · total points</small>}</span><strong>{entry.score.toLocaleString()}<small>points</small></strong></li>)}</ol>;
}
export function ReviewAnswers({ history }: { history: GameRecord[] }) {
  if (!history.length) return <p>No completed questions yet.</p>;
  return <div className="review-list">{history.map(answer => <details key={answer.questionIndex}><summary><span aria-hidden="true">{answer.correct ? '✓' : '↻'}</span> {answer.questionIndex + 1}. {answer.questionText}<small>{answer.correct ? 'Correct' : answer.answered ? 'Review this answer' : 'Not answered'}</small></summary><p>Your answer: <strong>{answer.answer || 'No answer'}</strong></p><p>Answer: <strong>{answer.correctAnswer}</strong></p>{answer.explanation && <p>{answer.explanation}</p>}<p>{answer.points} points</p></details>)}</div>;
}
