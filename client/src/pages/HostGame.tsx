import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { GameShell, Standings } from '../components/GameUI';
import QuestionMedia from '../components/QuestionMedia';
import { useGameSession } from '../hooks/useGameSession';
import { settingsFor } from '../services/gameLogic';

export default function HostGame() {
  const { game, players, error, busy, online, now, run, retry } = useGameSession('host');
  const [confirmEnd, setConfirmEnd] = useState(false);
  if (game?.status === 'lobby') return <Navigate to="/host/lobby" replace />;
  if (!game) return <GameShell host error={error} online={online} retry={retry}><div className="game-heading"><h1>Restoring your game…</h1><p>Your room and scores are saved.</p></div></GameShell>;
  const question = game.quiz.questions[game.currentQuestion], finished = game.status === 'finished', results = game.phase === 'results';
  const settings = settingsFor(game.settings), report = game.questionReports?.find((q: any) => q.questionIndex === game.currentQuestion);
  const answered = players.filter(p => p.answeredQuestion === game.currentQuestion);
  const pending = question?.questionType === 'open_ended' ? answered.filter(p => p.judgedQuestion !== game.currentQuestion) : [];
  const remaining = game.questionEndsAt === null ? null : Math.max(0, Math.ceil((game.questionEndsAt - now) / 1000));
  const countdown = Math.max(0, Math.ceil((game.questionStartsAt - now) / 1000));
  return <GameShell host error={error} online={online} retry={retry}>
    <div className="round-header"><span>PIN {game.gamePin}</span><span>{finished ? 'Session complete' : `Question ${game.currentQuestion + 1} of ${game.quiz.questions.length}`}</span><span>{settings.playStyle}</span></div>
    {finished ? <><div className="game-heading"><p className="game-eyebrow">LOOK HOW FAR YOU’VE COME</p><h1>Well played, everyone.</h1><p>{game.questionReports?.length || 0} rounds completed · {players.length} players</p></div>{settings.showLeaderboard && <section className="game-card"><h2>Final standings</h2><Standings entries={game.finalRankings || []} />{game.teams?.length > 0 && <><h3>Team totals</h3><Standings entries={game.finalRankings || []} teams /></>}</section>}<div className="game-actions"><Link className="game-primary" to={`/reports/${game.id}`}>Explore learning report</Link><Link className="game-secondary" to="/dashboard">Host another quiz</Link></div></> : <>
      <section className="game-card question-card"><div className="round-status" role="status">{results ? 'Let’s review' : game.phase === 'review' ? 'Reviewing typed answers' : countdown ? `Get ready · ${countdown}` : remaining === null ? 'Take your time' : `${remaining}s remaining`}</div><h1>{question?.question_text}</h1><QuestionMedia media={question?.media} />
      {question?.answers?.length > 0 && <div className="answer-grid">{question.answers.map((a: any, i: number) => <div key={i} className={`answer-tile answer-${i} ${results && i === game.correctIndex ? 'answer-correct' : ''}`}><span>{['▲', '◆', '●', '■'][i]}</span><strong>{a.text}</strong>{results && <small>{report?.distribution?.[i]?.count || 0} answers {i === game.correctIndex ? '· Correct' : ''}</small>}</div>)}</div>}
      {results && <div className="answer-explanation"><strong>{question.questionType === 'open_ended' ? 'All submitted answers have been reviewed.' : `Correct answer: ${report?.correctAnswer || ''}`}</strong>{game.explanation && <p>{game.explanation}</p>}<p>{report?.correctCount || 0} of {report?.playerCount || 0} answered correctly.</p></div>}
      {!results && <p className="answer-count" role="status">{answered.length} of {players.length} answers received</p>}</section>
      {pending.length > 0 && <section className="game-card"><h2>Review answers · {pending.length} remaining</h2><p>Give points for a correct response. Scores are saved when the round closes.</p><div className="judge-list">{pending.map(p => <article key={p.playerId}><strong>{p.nickname}</strong><p>{p.responseText}</p><div className="game-actions"><button className="game-primary" disabled={busy} onClick={() => void run('host-judge', { playerId: p.playerId, questionIndex: game.currentQuestion, points: question.points, correct: true })}>Correct · {question.points} pts</button><button className="game-secondary" disabled={busy} onClick={() => void run('host-judge', { playerId: p.playerId, questionIndex: game.currentQuestion, points: 0, correct: false })}>Needs review · 0 pts</button></div></article>)}</div></section>}
      {results && settings.showLeaderboard && <section className="game-card"><h2>Standings</h2><Standings entries={game.leaderboard || []} />{game.teams?.length > 0 && <><h3>Team totals</h3><Standings entries={game.leaderboard || []} teams /></>}</section>}
      <div className="game-actions">{results ? <button className="game-primary" disabled={busy || !online} onClick={() => void run('host-next-question', { questionIndex: game.currentQuestion })}>{game.currentQuestion + 1 === game.quiz.questions.length ? 'Finish game' : 'Next question'}</button> : game.phase === 'question' && <button className="game-primary" disabled={busy || !online || countdown > 0} onClick={() => void run('host-end-question')}>Close round & review</button>}<button className="game-secondary" disabled={busy} onClick={() => setConfirmEnd(true)}>End game</button></div>
      {confirmEnd && <section className="game-card" role="alertdialog" aria-label="End this game"><h2>Finish this game early?</h2><p>Completed rounds and scores will be saved. Review any pending typed answers first.</p><div className="game-actions"><button className="game-primary" disabled={busy} onClick={async () => { if (await run('host-end-game')) setConfirmEnd(false); }}>Finish & save results</button><button className="game-secondary" onClick={() => setConfirmEnd(false)}>Keep playing</button></div></section>}
    </>}
  </GameShell>;
}
