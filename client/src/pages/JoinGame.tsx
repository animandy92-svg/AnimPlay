import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GameShell } from '../components/GameUI';
import { gameError, gameStorage, getSocket } from '../services/socket';

const characters = ['🦊', '🐱', '🐶', '🦄', '🐸', '🦁', '🐼', '🐨', '🦉', '🐙', '🦋', '🐢'];
export default function JoinGame() {
  const [params] = useSearchParams();
  const [pin, setPin] = useState((params.get('pin') || '').replace(/\D/g, '').slice(0, 6));
  const [nickname, setNickname] = useState('');
  const [character, setCharacter] = useState('🦊');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const savedPin = gameStorage.getItem('animplay_player_gamePin');
  const seat = gameStorage.getItem('animplay_player_sessionId');
  async function join(resume = false) {
    if (busy) return; setBusy(true); setError('');
    try {
      const socket = getSocket().connect();
      if (resume) await socket.request('reconnect-player', { gamePin: savedPin, sessionId: seat });
      else await socket.request('join-game', { gamePin: pin, nickname, character });
      navigate('/game/play', { replace: true });
    } catch (e) { setError(gameError(e)); } finally { setBusy(false); }
  }
  return <GameShell error={error}>
    <div className="game-heading"><p className="game-eyebrow">EVERYONE’S INVITED</p><h1>Take your seat.</h1><p>Enter the host’s PIN and choose a nickname. No player account needed.</p></div>
    <form className="game-card join-card" onSubmit={e => { e.preventDefault(); void join(); }}>
      <label htmlFor="game-pin">Game PIN</label><input id="game-pin" className="pin-input" autoFocus inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
      <label htmlFor="nickname">Nickname</label><input id="nickname" maxLength={20} required value={nickname} onChange={e => setNickname(e.target.value)} autoComplete="off" placeholder="What should we call you?" />
      <fieldset><legend>Choose your character</legend><div className="character-picker">{characters.map(c => <button key={c} type="button" aria-label={`Choose ${c}`} aria-pressed={character === c} onClick={() => setCharacter(c)}>{c}</button>)}</div></fieldset>
      <button className="game-primary" disabled={busy || pin.length !== 6 || !nickname.trim()}>{busy ? 'Connecting…' : 'Join game'}</button>
      {savedPin && seat && <button className="game-secondary" type="button" disabled={busy} onClick={() => void join(true)}>Resume game {savedPin}</button>}
    </form><p className="game-footer">Running the game? <Link to="/dashboard">Open your host library</Link></p>
  </GameShell>;
}
