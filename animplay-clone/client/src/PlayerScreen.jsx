import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002';
const socket = io(SERVER_URL);

export default function PlayerScreen() {
  const [view, setView] = useState('JOIN');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    socket.on('join-success', () => {
      setView('WAITING');
      setErrorMessage('');
    });

    socket.on('join-error', (message) => {
      setErrorMessage(message);
    });

    return () => {
      socket.off('join-success');
      socket.off('join-error');
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pin || !nickname) {
      setErrorMessage('Please enter both a PIN and a nickname.');
      return;
    }

    socket.emit('player-join', { pin, nickname });
  };

  if (view === 'WAITING') {
    return (
      <div style={styles.container}>
        <div style={styles.waitingBox}>
          <h2>You're in!</h2>
          <p>See your nickname on the screen.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleJoin} style={styles.formBox}>
        <h1 style={styles.logo}>AnimPlay!</h1>
        {errorMessage && <div style={styles.error}>{errorMessage}</div>}
        <input
          style={styles.input}
          type="text"
          placeholder="Game PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={6}
        />
        <input
          style={styles.input}
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={15}
        />
        <button type="submit" style={styles.enterButton}>
          Enter
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#ebf2f8',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'sans-serif',
  },
  formBox: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '400px',
    boxSizing: 'border-box',
  },
  logo: {
    textAlign: 'center',
    color: '#46178f',
    marginBottom: '20px',
    fontSize: '32px',
  },
  input: {
    padding: '15px',
    marginBottom: '15px',
    borderRadius: '4px',
    border: '2px solid #ccc',
    fontSize: '18px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  enterButton: {
    padding: '15px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: {
    backgroundColor: '#ff4d4f',
    color: 'white',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  waitingBox: {
    textAlign: 'center',
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
  },
};
