import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002';

export default function HostScreen() {
  const [view, setView] = useState('LOBBY'); // LOBBY, QUESTION, RESULTS
  const [pin, setPin] = useState('');
  const [players, setPlayers] = useState([]);

  const [socket, setSocket] = useState(null);

  // Game loop state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answersReceived, setAnswersReceived] = useState(0);

  useEffect(() => {
    const client = io(SERVER_URL);
    setSocket(client);

    client.on('connect', () => {
      client.emit('create-game');
    });

    client.on('game-created', (newPin) => {
      setPin(newPin);
    });

    client.on('update-player-list', (playerList) => {
      setPlayers(playerList);
    });

    // 1) Server sends the question
    client.on('host-question-start', (questionData) => {
      setCurrentQuestion(questionData);
      setTimeLeft(questionData.timeLimit);
      setAnswersReceived(0);
      setView('QUESTION');
    });

    // 2) Server ticks the clock down every second
    client.on('timer-tick', (time) => {
      setTimeLeft(time);
    });

    // 3) Player submitted an answer
    client.on('answer-received', () => {
      setAnswersReceived((prev) => prev + 1);
    });

    // 4) Timer hit zero
    client.on('time-up', () => {
      setView('RESULTS');
    });

    // Fallback: current server emits different events; map them so UI still works
    client.on('player-answered', () => {
      // this clone server currently emits player-answered; we treat it as an answer received
      setAnswersReceived((prev) => prev + 1);
    });

    // Cleanup
    return () => {
      client.off('connect');
      client.off('game-created');
      client.off('update-player-list');
      client.off('host-question-start');
      client.off('timer-tick');
      client.off('answer-received');
      client.off('time-up');
      client.off('player-answered');
      client.disconnect();
    };
  }, []);

  const handleStartGame = () => {
    if (!socket || !pin) return;
    socket.emit('start-game', pin);
  };

  // --- VIEW 1: LOBBY ---
  if (view === 'LOBBY') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1>AnimPlay!</h1>
          <p>
            Join at <strong>www.animplay.com</strong> with Game PIN:
          </p>
          <h2 style={styles.pin}>{pin || 'Loading...'}</h2>
        </div>

        <div style={styles.lobby}>
          <div style={styles.playerCount}>
            <span role="img" aria-label="players">
              👥
            </span>{' '}
            Players: {players.length}
          </div>

          <ul style={styles.playerList}>
            {players.map((player, index) => (
              <li key={index} style={styles.playerItem}>
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

  // --- VIEW 2: QUESTION ---
  if (view === 'QUESTION' && currentQuestion) {
    const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']; // Red, Blue, Yellow, Green

    return (
      <div style={styles.questionContainer}>
        <h1 style={styles.questionText}>{currentQuestion.text}</h1>

        <div style={styles.hud}>
          <div style={styles.timerCircle}>{Math.ceil(timeLeft)}</div>
          <div style={styles.answerCounter}>
            <h2>{answersReceived}</h2>
            <p>Answers</p>
          </div>
        </div>

        <div style={styles.answerGrid}>
          {currentQuestion.answers.map((answer, index) => (
            <div
              key={index}
              style={{ ...styles.answerCard, backgroundColor: colors[index] }}
            >
              <span style={styles.shapeIcon}>
                {index === 0 && '▲'}
                {index === 1 && '◆'}
                {index === 2 && '●'}
                {index === 3 && '■'}
              </span>
              {answer.text}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VIEW 3: RESULTS (Placeholder) ---
  if (view === 'RESULTS') {
    return (
      <div style={styles.container}>
        <h1 style={{ fontSize: '64px' }}>Time's Up!</h1>
        <p style={{ fontSize: '24px', marginTop: 12 }}>
          Answers received: <strong>{answersReceived}</strong>
        </p>
      </div>
    );
  }

  return null;
}

const styles = {
  container: {
    backgroundColor: '#46178f',
    color: 'white',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: 'sans-serif',
  },
  header: {
    backgroundColor: '#fff',
    color: '#000',
    padding: '30px 80px',
    borderRadius: '4px',
    marginTop: '10vh',
    textAlign: 'center',
    boxShadow: '0px 4px 10px rgba(0,0,0,0.2)',
  },
  pin: {
    fontSize: '64px',
    margin: '10px 0 0 0',
    letterSpacing: '5px',
  },
  lobby: {
    marginTop: '40px',
    width: '80%',
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
  },

  questionContainer: {
    backgroundColor: '#f2f2f2',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'sans-serif',
  },
  questionText: {
    backgroundColor: '#fff',
    color: '#333',
    margin: '20px',
    padding: '30px',
    textAlign: 'center',
    fontSize: '48px',
    borderRadius: '8px',
    boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
  },
  hud: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 50px',
    flex: 1,
  },
  timerCircle: {
    backgroundColor: '#864cbf',
    color: 'white',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '48px',
    fontWeight: 'bold',
    boxShadow: '0px 4px 10px rgba(0,0,0,0.2)',
  },
  answerCounter: {
    textAlign: 'center',
    color: '#333',
  },
  answerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr',
    gap: '15px',
    padding: '20px',
    height: '40vh',
  },
  answerCard: {
    color: 'white',
    fontSize: '32px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    padding: '0 30px',
    borderRadius: '8px',
    boxShadow: '0px 4px 0px rgba(0,0,0,0.2)',
  },
  shapeIcon: {
    marginRight: '20px',
    fontSize: '40px',
  },
};

