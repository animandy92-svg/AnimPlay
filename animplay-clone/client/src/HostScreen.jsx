import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002';

export default function HostScreen() {
  const [pin, setPin] = useState('');
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState('Connecting to server...');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const client = io(SERVER_URL);
    setSocket(client);

    client.on('connect', () => {
      setStatus('Connected to the server');
      client.emit('create-game');
    });

    client.on('game-created', (newPin) => {
      setPin(newPin);
    });

    client.on('update-player-list', (playerList) => {
      setPlayers(playerList);
    });

    client.on('connect_error', () => {
      setStatus('Unable to connect to server');
    });

    return () => {
      client.off('connect');
      client.off('game-created');
      client.off('update-player-list');
      client.off('connect_error');
      client.disconnect();
    };
  }, []);

  const handleStartGame = () => {
    if (!socket || !pin) {
      return;
    }

    console.log('Starting game with PIN:', pin);
    socket.emit('start-game', pin);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>AnimPlay!</h1>
        <p>Join at <strong>www.animplay.com</strong> with Game PIN:</p>
        <h2 style={styles.pin}>{pin || 'Loading...'}</h2>
        <p style={{ marginTop: 12, color: '#444' }}>{status}</p>
      </div>

      <div style={styles.lobby}>
        <div style={styles.playerCount}>
          <span role="img" aria-label="players">👥</span> Players: {players.length}
        </div>

        <ul style={styles.playerList}>
          {players.map((player) => (
            <li key={player.socketId} style={styles.playerItem}>
              {player.nickname}
            </li>
          ))}
        </ul>
      </div>

      <button
        style={styles.startButton}
        onClick={handleStartGame}
        disabled={players.length === 0}
      >
        Start Game
      </button>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#46178f',
    color: 'white',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: 'sans-serif',
    padding: '24px',
  },
  header: {
    backgroundColor: '#fff',
    color: '#000',
    padding: '30px 80px',
    borderRadius: '4px',
    marginTop: '10vh',
    textAlign: 'center',
    boxShadow: '0px 4px 10px rgba(0,0,0,0.2)',
    maxWidth: '650px',
  },
  pin: {
    fontSize: '64px',
    margin: '10px 0 0 0',
    letterSpacing: '5px',
  },
  lobby: {
    marginTop: '40px',
    width: '100%',
    maxWidth: '1000px',
  },
  playerCount: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: '10px 20px',
    borderRadius: '4px',
    display: 'inline-block',
  },
  playerList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  playerItem: {
    backgroundColor: '#fff',
    color: '#333',
    padding: '12px 24px',
    borderRadius: '4px',
    fontSize: '20px',
    fontWeight: 'bold',
    boxShadow: '0px 2px 5px rgba(0,0,0,0.2)',
  },
  startButton: {
    marginTop: 'auto',
    marginBottom: '5vh',
    padding: '15px 40px',
    fontSize: '24px',
    fontWeight: 'bold',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    opacity: 1,
  },
};
