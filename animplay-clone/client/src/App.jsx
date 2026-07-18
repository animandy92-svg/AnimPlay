import { useState } from 'react';
import HostScreen from './HostScreen.jsx';
import PlayerScreen from './PlayerScreen.jsx';

function App() {
  const [mode, setMode] = useState('HOST');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 20, gap: 12 }}>
        <button
          onClick={() => setMode('HOST')}
          style={{ padding: 12, cursor: 'pointer', backgroundColor: mode === 'HOST' ? '#46178f' : '#eee', color: mode === 'HOST' ? '#fff' : '#000', border: 'none', borderRadius: 4 }}
        >
          Host
        </button>
        <button
          onClick={() => setMode('PLAYER')}
          style={{ padding: 12, cursor: 'pointer', backgroundColor: mode === 'PLAYER' ? '#46178f' : '#eee', color: mode === 'PLAYER' ? '#fff' : '#000', border: 'none', borderRadius: 4 }}
        >
          Player
        </button>
      </div>
      {mode === 'HOST' ? <HostScreen /> : <PlayerScreen />}
    </div>
  );
}

export default App;
