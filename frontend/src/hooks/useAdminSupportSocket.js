import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../services/api/apiClient.js';
import { getAccessToken } from '../services/auth/accessTokenStore.js';

const events = ['conversation.message.created', 'conversation.accepted', 'conversation.assigned', 'conversation.closed', 'conversation.reopened'];
const socketUrl = API_URL.replace(/\/api\/?$/, '');

export default function useAdminSupportSocket({ active, conversationId, onEvent }) {
  const callbackRef = useRef(onEvent);
  const [state, setState] = useState('offline');
  useEffect(() => { callbackRef.current = onEvent; }, [onEvent]);
  useEffect(() => {
    const token = getAccessToken();
    if (!active || !token) return undefined;
    const socket = io(socketUrl, { auth: { token: `Bearer ${token}` }, transports: ['websocket'], forceNew: true, reconnection: true });
    const seen = new Set();
    let connectedOnce = false;
    const join = () => { if (conversationId) socket.emit('joinConversation', { conversationId }, () => undefined); };
    const emit = (eventName) => (payload) => {
      if (payload?.eventId && seen.has(payload.eventId)) return;
      if (payload?.eventId) {
        if (seen.size >= 500) seen.clear();
        seen.add(payload.eventId);
      }
      callbackRef.current?.({ eventName, payload });
    };
    socket.on('connect', () => { setState('connected'); join(); if (connectedOnce) callbackRef.current?.({ eventName: 'reconnect', payload: { conversationId } }); connectedOnce = true; });
    socket.on('disconnect', () => setState('offline'));
    socket.on('connect_error', () => setState('error'));
    events.forEach((event) => socket.on(event, emit(event)));
    setState('connecting');
    return () => { if (conversationId) socket.emit('leaveConversation', { conversationId }, () => undefined); events.forEach((event) => socket.off(event)); socket.disconnect(); };
  }, [active, conversationId]);
  return state;
}
