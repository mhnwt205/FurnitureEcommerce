import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../services/api/apiClient.js';
import { getAccessToken } from '../services/auth/accessTokenStore.js';

const SOCKET_EVENTS = [
  'conversation.message.created',
  'conversation.accepted',
  'conversation.assigned',
  'conversation.closed',
  'conversation.reopened'
];

const socketUrl = API_URL.replace(/\/api\/?$/, '');

export default function useSupportSocket({ active, conversationId, onEvent }) {
  const callbackRef = useRef(onEvent);
  const [connectionState, setConnectionState] = useState('offline');

  useEffect(() => { callbackRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    const token = getAccessToken();
    if (!active || !conversationId || !token) return undefined;

    const seenEventIds = new Set();
    let hasConnected = false;
    const socket = io(socketUrl, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
      forceNew: true,
      reconnection: true
    });
    const join = () => socket.emit('joinConversation', { conversationId }, () => undefined);
    const dispatch = (eventName) => (payload) => {
      if (payload?.conversationId !== conversationId) return;
      if (payload?.eventId && seenEventIds.has(payload.eventId)) return;
      if (payload?.eventId) seenEventIds.add(payload.eventId);
      callbackRef.current?.({ eventName, payload });
    };

    setConnectionState('connecting');
    socket.on('connect', () => {
      setConnectionState('connected');
      join();
      if (hasConnected) callbackRef.current?.({ eventName: 'reconnect', payload: { conversationId } });
      hasConnected = true;
    });
    socket.on('disconnect', () => setConnectionState('offline'));
    socket.on('connect_error', () => setConnectionState('error'));
    SOCKET_EVENTS.forEach((eventName) => socket.on(eventName, dispatch(eventName)));

    return () => {
      socket.emit('leaveConversation', { conversationId }, () => undefined);
      SOCKET_EVENTS.forEach((eventName) => socket.off(eventName));
      socket.disconnect();
    };
  }, [active, conversationId]);

  return connectionState;
}
