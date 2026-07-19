import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002';
const socket = io(SERVER_URL);

export default function PlayerScreen() {
  const [view, setView] = useState('JOIN');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [answerCount, setAnswerCount] = useState(0);
  const [activeAnswer, setActiveAnswer] = useState(null);

  useEffect(() => {
    socket.on('join-success', () => {
      setView('WAITING');
      setErrorMessage('');
    });

    socket.on('join-error', (message) => {
      setErrorMessage(message);
    });

    socket.on('player-question-start', (data) => {
      setAnswerCount(data.answerCount);
      setView('QUESTION');
    });

    return () => {
      socket.off('join-success');
      socket.off('join-error');
      socket.off('player-question-start');
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

  const submitAnswer = (index) => {
    // We send the index (0, 1, 2, or 3) back to the server
    socket.emit('submit-answer', { pin, answerIndex: index });

    // Immediately put the player back into a waiting state so they can't double-click
    setView('WAITING');
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

  if (view === 'QUESTION') {
    const buttonData = [
      { color: '#e21b3c', shape: 'polygon', points: '50,15 100,100 0,100' }, // Red Triangle
      { color: '#1368ce', shape: 'polygon', points: '50,0 100,50 50,100 0,50' }, // Blue Diamond
      { color: '#d89e00', shape: 'circle', cx: '50', cy: '50', r: '40' }, // Yellow Circle
      { color: '#26890c', shape: 'rect', x: '15', y: '15', width: '70', height: '70' }, // Green Square
    ];

    return (
      <div style={styles.container}>
        <div style={styles.padGrid}>
          {buttonData.slice(0, answerCount).map((btn, index) => (
            <button
              key={index}
              style={{
                ...styles.answerBtn,
                backgroundColor: btn.color,
                transform: activeAnswer === index ? 'translateY(2px)' : 'translateY(0)',
                boxShadow: activeAnswer === index ? '0px 2px 0px rgba(0,0,0,0.2)' : styles.answerBtn.boxShadow,
              }}
              onMouseDown={() => setActiveAnswer(index)}
              onMouseUp={() => setActiveAnswer(null)}
              onMouseLeave={() => setActiveAnswer(null)}
              onTouchStart={() => setActiveAnswer(index)}
              onTouchEnd={() => setActiveAnswer(null)}
              onClick={() => submitAnswer(index)}
            >
              <svg viewBox="0 0 100 100" width="50%" height="50%" fill="white">
                {btn.shape === 'polygon' && <polygon points={btn.points} />}
                {btn.shape === 'circle' && <circle cx={btn.cx} cy={btn.cy} r={btn.r} />}
                {btn.shape === 'rect' && <rect x={btn.x} y={btn.y} width={btn.width} height={btn.height} />}
              </svg>
            </button>
          ))}
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
  questionBox: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0px 8px 20px rgba(0,0,0,0.12)',
    textAlign: 'center',
    maxWidth: 480,
    width: '100%',
  },
  padGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr', // 2 columns
    gridTemplateRows: '1fr 1fr',    // 2 rows
    gap: '10px',
    width: '100vw',
    height: '100vh',
    padding: '10px',
    boxSizing: 'border-box',
    backgroundColor: '#f2f2f2',
  },
  answerBtn: {
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    backgroundColor: '#fff',
    color: '#46178f',
    boxShadow: '0px 4px 0px rgba(0,0,0,0.2)',
    transition: 'transform 0.1s, box-shadow 0.1s',
  },
};
