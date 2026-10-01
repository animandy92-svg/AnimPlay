import { useCallback, useEffect, useState } from 'react';
import { gameError, gameStorage, getSocket } from '../services/socket';
import type { GameRecord } from '../services/gameLogic';

export function useGameSession(role: 'host' | 'player') {
  const [game, setGame] = useState<GameRecord | null>(null);
  const [players, setPlayers] = useState<GameRecord[]>([]);
  const [player, setPlayer] = useState<GameRecord | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(Date.now());
  const [removed, setRemoved] = useState(false);
  const pin = gameStorage.getItem(role === 'host' ? 'animplay_gamePin' : 'animplay_player_gamePin') || '';
  const seat = gameStorage.getItem('animplay_player_sessionId') || '';
  const restore = useCallback(async () => {
    if (!pin || role === 'player' && !seat) throw new Error(role === 'host' ? 'Choose a quiz from your library to start hosting.' : 'Join with a game PIN to take your seat.');
    await getSocket().request(role === 'host' ? 'host-register' : 'reconnect-player', { gamePin: pin, sessionId: seat });
  }, [pin, role, seat]);
  const run = useCallback(async (event: string, data: GameRecord = {}) => {
    setBusy(true); setError('');
    try { await getSocket().request(event, data); return true; }
    catch (e) { setError(gameError(e)); return false; }
    finally { setBusy(false); }
  }, []);
  const retry = useCallback(() => { setError(''); void restore().catch(e => setError(gameError(e))); }, [restore]);
  useEffect(() => {
    const socket = getSocket().connect();
    const failed = (data: GameRecord) => setError(data.message);
    const gone = (data: GameRecord) => { setError(data.message); setRemoved(true); };
    socket.on('game-state', setGame).on('update-player-list', setPlayers).on('player-state', setPlayer).on('error', failed).on('removed', gone);
    let mounted = true;
    void restore().catch(e => { if (mounted) setError(gameError(e)); });
    const connection = () => { setOnline(navigator.onLine); if (navigator.onLine) retry(); };
    window.addEventListener('online', connection); window.addEventListener('offline', connection);
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      mounted = false; socket.off('game-state', setGame).off('update-player-list', setPlayers).off('player-state', setPlayer).off('error', failed).off('removed', gone);
      window.clearInterval(timer); window.removeEventListener('online', connection); window.removeEventListener('offline', connection);
    };
  }, [restore, retry]);
  return { game, players, player, error, busy, online, now, removed, pin, run, retry };
}
