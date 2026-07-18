import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function App() {
  const [status, setStatus] = useState('Connecting to server...');

  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      setStatus(`Connected as ${socket.id}`);
    });

    socket.on('disconnect', () => {
      setStatus('Disconnected from server');
    });

    socket.on('connect_error', () => {
      setStatus('Unable to connect to server');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>AnimPlay Clone</h1>
      <p>{status}</p>
      <p>Open the server at <code>http://localhost:3001</code> and the client at <code>http://localhost:5173</code>.</p>
    </div>
  );
}

export default App;
