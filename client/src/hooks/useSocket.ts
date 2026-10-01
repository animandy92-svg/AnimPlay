import { useState, useEffect, useCallback, useRef } from 'react';
import { connectSocket, type FirebaseGameSocket } from '../services/socket';

export function useSocket() {
  const socketRef = useRef<FirebaseGameSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const connected = () => setConnected(true);
    const disconnected = () => setConnected(false);
    socket.on('connect', connected);
    socket.on('disconnect', disconnected);

    return () => {
      socket.off('connect', connected);
      socket.off('disconnect', disconnected);
    };
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, connected, on, emit };
}
