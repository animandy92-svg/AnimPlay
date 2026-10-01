import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GameShell, ReviewAnswers, Standings } from '../components/GameUI';
import QuestionMedia from '../components/QuestionMedia';
import { useGameSession } from '../hooks/useGameSession';
import { settingsFor } from '../services/gameLogic';
import { gameStorage } from '../services/socket';

export default function PlayerGame() {
  const { game, player, players, error, busy, online, now, removed, run, retry } = useGameSession('player');
  const [text, setText] = useState('');
  const [reviewMissed, setReviewMissed] = useState(false);
  const navigate = useNavigate();
  const index = game?.currentQuestion;
  useEffect(() => { setText(''); return () => { window.speechSynthesis?.cancel(); }; }, [index]);
  const question = game?.quiz.questions[index];
  const answered = !!player && player.answeredQuestion === index;
  const countdown = game ? Math.max(0, Math.ceil((game.questionStartsAt - now) / 1000)) : 0;
  const remaining = !game || game.questionEndsAt === null ? null : Math.max(0, Math.ceil((game.questionEndsAt - now) / 1000));
  const canAnswer = game?.phase === 'question' && !answered && !busy && online && !removed && countdown === 0 && remaining !== 0;
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (!canAnswer || question?.questionType === 'open_ended' || /INPUT|TEXTAREA|SELECT|BUTTON/.test((e.target as HTMLElement)?.tagName) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const answerIndex = Number(e.key) - 1;
      if (/^[1-4]$/.test(e.key) && question?.answers[answerIndex]) { e.preventDefault(); void run('answer-submitted', { questionId: question.id, answerIndex }); }
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [canAnswer, question, run]);
  const shell = { error, online, retry };
  if (removed) return <GameShell {...shell}><section className="game-card"><h1>Your seat is no longer available</h1><Link className="game-primary" to="/join">Join another game</Link></section></GameShell>;
  if (!game || !player) return <GameShell {...shell}><div className="game-heading"><h1>Restoring your seat…</h1><p>Your answers and progress are saved with the game.</p></div></GameShell>;
  const settings = settingsFor(game.settings), finished = game.status === 'finished';
  const history = player.history || [], lastAnswer = history.find((h: any) => h.questionIndex === index);
  const hostAway = game.status !== 'finished' && game.hostSeenAt && now - game.hostSeenAt > 35000;
  const standings = finished ? game.finalRankings || [] : game.leaderboard || [];
  const readQuestion = () => { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(`${question.question_text}. ${question.answers.map((a: any, i: number) => `Option ${i + 1}: ${a.text}`).join('. ')}`); window.speechSynthesis.speak(utterance); };
  return <GameShell {...shell}>
    <div className="round-header"><span>{player.character} {player.nickname}</span><span>PIN {game.gamePin}</span><span>{player.score.toLocaleString()} points</span></div>
    {hostAway && <div className="game-notice" role="status">Waiting for your host to reconnect. Keep this page open; your answers are saved.</div>}
    {game.status === 'lobby' ? <>
      <div className="game-heading"><p className="game-eyebrow">YOU’RE IN</p><h1>{game.quizTitle}</h1><p>Waiting for your host. Your questions will appear here automatically.</p></div>
      <section className="game-card"><h2>{settings.playStyle === 'relaxed' ? 'Take your time' : settings.playStyle === 'accuracy' ? 'Every correct answer counts equally' : 'Get ready for a friendly challenge'}</h2><p>{settings.playStyle === 'relaxed' ? 'There is no countdown. Your host will guide each round.' : settings.playStyle === 'accuracy' ? 'Speed does not change your score.' : 'Answer correctly and quickly to earn more points.'}</p>
      {game.teams?.length > 0 && <label className="setting-row">Choose your team<select aria-label="Choose your team" value={player.teamId || ''} disabled={busy} onChange={e => void run('join-team', { teamId: Number(e.target.value) || null })}><option value="">Play individually</option>{game.teams.map((team: any) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
      <h3>In the room · {players.length}</h3><div className="player-chips">{players.map(p => <span key={p.playerId}>{p.character} {p.nickname}</span>)}</div><button className="game-secondary" disabled={busy} onClick={async () => { if (await run('leave-game')) { gameStorage.removeItem('animplay_player_sessionId'); gameStorage.removeItem('animplay_player_gamePin'); navigate('/join'); } }}>Leave lobby</button></section>
    </> : finished ? <>
      <div className="game-heading"><p className="game-eyebrow">EVERY ROUND IS PROGRESS</p><h1>Well played, {player.nickname}.</h1><p>{player.correct} of {history.length} correct · {player.score.toLocaleString()} points</p></div>
      <section className="game-card"><h2>Your learning recap</h2><p>Revisit the answers and bring what you learned to your next game.</p><label className="setting-row">Show only answers to review<input type="checkbox" checked={reviewMissed} onChange={e => setReviewMissed(e.target.checked)} /></label>{reviewMissed && history.every((h: any) => h.correct) ? <p>All correct. Nicely done!</p> : <ReviewAnswers history={reviewMissed ? history.filter((h: any) => !h.correct) : history} />}</section>
      {settings.showLeaderboard && <section className="game-card"><h2>Final standings</h2><Standings entries={standings} />{game.teams?.length > 0 && <><h3>Team totals</h3><Standings entries={standings} teams /></>}</section>}<div className="game-actions"><Link className="game-primary" to="/join">Join another game</Link><Link className="game-secondary" to="/">Back home</Link></div>
    </> : <>
      <div className="round-header"><span>Question {index + 1} / {game.quiz.questions.length}</span><span role="status">{game.phase === 'results' ? 'Round complete' : game.phase === 'review' ? 'Host is reviewing answers' : countdown ? `Get ready · ${countdown}` : remaining === null ? 'No time limit' : `${remaining}s`}</span></div>
      <section className="game-card question-card"><h1>{question.question_text}</h1><QuestionMedia media={question.media} />{'speechSynthesis' in window && <button className="game-link" onClick={readQuestion}>Read question aloud</button>}
      {game.phase === 'question' && <>{question.questionType === 'open_ended' ? <form onSubmit={e => { e.preventDefault(); void run('answer-submitted', { questionId: question.id, answerIndex: -1, responseText: text }); }}><label htmlFor="typed-answer">Your answer</label><textarea id="typed-answer" maxLength={180} value={answered ? player.responseText : text} disabled={!canAnswer} onChange={e => setText(e.target.value)} placeholder="Share what you think…" /><button className="game-primary" disabled={!canAnswer || !text.trim()}>Send answer</button></form> : <div className="answer-grid">{question.answers.map((a: any, i: number) => <button key={i} className={`answer-tile answer-${i} ${answered && player.answerIndex === i ? 'answer-selected' : ''}`} disabled={!canAnswer} onClick={() => void run('answer-submitted', { questionId: question.id, answerIndex: i })}><span aria-hidden="true">{['▲', '◆', '●', '■'][i]}</span><strong>{a.text}</strong><small>{answered && player.answerIndex === i ? 'Your answer' : `Press ${i + 1}`}</small></button>)}</div>}
      <p className="answer-count" role="status">{busy ? 'Sending your answer…' : answered ? 'Answer saved. You can relax while everyone finishes.' : remaining === 0 ? 'Time is up. Waiting for the host to review.' : countdown ? 'Your answer buttons will open shortly.' : 'Choose the answer you think is right.'}</p></>}
      {game.phase === 'review' && <p role="status">{answered ? 'Your answer is saved. The host is reviewing this round.' : 'The round is closed. Your next question will appear shortly.'}</p>}
      {game.phase === 'results' && lastAnswer && <div className="answer-explanation"><h2>{lastAnswer.correct ? 'You got it!' : lastAnswer.answered ? 'A chance to learn' : 'Let’s look at the answer'}</h2><p>{lastAnswer.correctAnswer !== 'Host reviewed' ? <>Correct answer: <strong>{lastAnswer.correctAnswer}</strong></> : 'Your host has reviewed your response.'}</p>{lastAnswer.explanation && <p>{lastAnswer.explanation}</p>}<p>+{lastAnswer.points} points · {player.correct} correct so far</p><p>Waiting for your host to continue…</p></div>}
      </section>{game.phase === 'results' && settings.showLeaderboard && <section className="game-card"><h2>Standings</h2><Standings entries={standings} /></section>}
    </>}
  </GameShell>;
}
