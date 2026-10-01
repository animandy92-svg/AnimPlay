import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { GameShell } from '../components/GameUI';
import { useGameSession } from '../hooks/useGameSession';
import { PLAY_STYLES, settingsFor } from '../services/gameLogic';

export default function HostLobby() {
  const session = useGameSession('host');
  const { game, players, error, online, busy, pin, run, retry } = session;
  const [teamName, setTeamName] = useState('');
  const [copied, setCopied] = useState('');
  if (game && game.status !== 'lobby') return <Navigate to="/host/game" replace />;
  const settings = settingsFor(game?.settings);
  const url = `${window.location.origin}/join?pin=${pin}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied('Join link copied'); } catch { setCopied('Copy the join link shown below.'); } };
  return <GameShell host error={error} online={online} retry={retry}>
    <div className="game-heading"><p className="game-eyebrow">YOUR ROOM IS READY</p><h1>{game?.quizTitle || 'Opening your lobby…'}</h1><p>Share the PIN. Pick the pace. Make room for everyone.</p></div>
    <div className="host-lobby-grid"><section className="game-card lobby-invite"><p className="game-eyebrow">GAME PIN</p><div className="big-pin">{pin || '—'}</div><p>Players join at <strong>{window.location.host}/join</strong></p><button className="game-secondary" onClick={() => void copy()} disabled={!game}>Copy join link</button><a className="join-url" href={url} target="_blank" rel="noreferrer">{url}</a><p role="status">{copied}</p>
      <div className="lobby-player-heading"><h2>Players</h2><span>{players.length} / 100</span></div>
      {!players.length && <p className="empty-copy">Waiting for your first player. You can open the join link on a phone or in another tab.</p>}
      <ul className="lobby-players">{players.map(p => <li key={p.playerId}><span>{p.character} <strong>{p.nickname}</strong><small>{game?.teams?.find((t: any) => t.id === p.teamId)?.name || 'Individual'}</small></span><button disabled={busy} className="game-link" aria-label={`Remove ${p.nickname}`} onClick={() => void run('kick-player', { playerId: p.playerId })}>Remove</button></li>)}</ul>
      <button className="game-primary" disabled={!game || !players.length || busy || !online} onClick={() => void run('host-start-game')}>{busy ? 'Please wait…' : `Start game${players.length ? ` · ${players.length} players` : ''}`}</button>
    </section><section className="game-card"><h2>Make it your game</h2><fieldset disabled={busy || !game || !online}><legend>Choose the pace</legend><div className="play-styles">{PLAY_STYLES.map(style => <button key={style.id} aria-pressed={settings.playStyle === style.id} onClick={() => void run('game-settings', { ...settings, playStyle: style.id })}><strong>{style.title}</strong><span>{style.description}</span></button>)}</div>
      {settings.playStyle !== 'relaxed' && <label className="setting-row">Thinking time<select value={settings.timeMultiplier} onChange={e => void run('game-settings', { ...settings, timeMultiplier: Number(e.target.value) })}><option value={1}>Standard</option><option value={1.5}>50% more time</option><option value={2}>Double time</option></select></label>}
      <label className="setting-row"><span>Show shared leaderboard<small>Turn off for a quieter, personal progress experience.</small></span><input type="checkbox" checked={settings.showLeaderboard} onChange={e => void run('game-settings', { ...settings, showLeaderboard: e.target.checked })} /></label>
      </fieldset><div className="team-builder"><h3>Play together</h3><p>Create optional teams. Players choose one from their lobby.</p><div className="team-chips">{game?.teams?.map((t: any) => <span key={t.id}>{t.name}</span>)}</div><form onSubmit={async e => { e.preventDefault(); if (await run('create-team', { name: teamName })) setTeamName(''); }}><input aria-label="Team name" value={teamName} maxLength={24} onChange={e => setTeamName(e.target.value)} placeholder="Team name" /><button className="game-secondary" disabled={busy || !game || !teamName.trim()}>Add team</button></form></div>
    </section></div>
  </GameShell>;
}
