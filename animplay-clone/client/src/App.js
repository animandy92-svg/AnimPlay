import { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState('Connecting...');

  useEffect(() => {
    fetch('http://localhost:3001')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('Unable to connect to server'));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>AnimPlay Clone</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;
