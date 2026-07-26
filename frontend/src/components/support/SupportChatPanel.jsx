import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import useSupportSocket from '../../hooks/useSupportSocket.js';
import { supportConversationService } from '../../services/api/supportConversationService.js';

const MAX_MESSAGE_LENGTH = 2000;
const formatTime = (value) => value ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
const clientMessageId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const messageError = (error) => error?.message || 'Không thể tải cuộc trò chuyện. Vui lòng thử lại.';

function ConnectionStatus({ state }) {
  const copy = {
    connected: 'Đang kết nối trực tiếp',
    connecting: 'Đang kết nối…',
    offline: 'Ngoại tuyến',
    error: 'Không thể kết nối trực tiếp'
  };
  return <span className="flex items-center gap-1.5 text-xs text-[#777777]" role="status"><span className={`h-2 w-2 rounded-full ${state === 'connected' ? 'bg-[#2f7d32]' : state === 'error' ? 'bg-[#b94732]' : 'bg-[#9a6a16]'}`} />{copy[state] || copy.offline}</span>;
}

function MessageTimeline({ messages, loading, error, currentUserId, scrollRef, onScroll }) {
  if (loading) return <div className="flex-1 space-y-3 overflow-hidden p-4" aria-busy="true" aria-label="Đang tải tin nhắn"><div className="ui-skeleton h-14 w-3/4 rounded-lg" /><div className="ui-skeleton ml-auto h-12 w-2/3 rounded-lg" /></div>;
  if (error) return <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[#b94732]" role="alert">{error}</div>;
  if (!messages.length) return <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-sm text-[#777777]"><span className="material-symbols-outlined mb-2 text-3xl">forum</span><p className="font-semibold text-[#555555]">Hãy bắt đầu cuộc trò chuyện</p><p className="mt-1 leading-6">Nhân viên sẽ phản hồi ngay khi có thể.</p></div>;

  return (
    <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
      <ol className="space-y-3" role="list">
        {messages.map((message) => {
          const mine = message.pending || String(message.sender?.id) === String(currentUserId);
          return (
            <li key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6 ${mine ? 'bg-[#333333] text-white' : 'border border-[#e5e5e5] bg-[#fafaf8] text-[#333333]'}`}>
                {!mine ? <p className="mb-1 text-[11px] font-semibold text-[#777777]">Nhân viên hỗ trợ</p> : null}
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-[#777777]'}`}>{message.pending ? 'Đang gửi…' : formatTime(message.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function SupportChatPanel({ active, onClose, fullPage = false }) {
  const { user, isAuthenticated } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [retryMessage, setRetryMessage] = useState(null);
  const scrollRef = useRef(null);
  const atBottomRef = useRef(true);

  const loadMessages = useCallback(async (id) => {
    setMessagesLoading(true);
    try {
      const response = await supportConversationService.getMessages(id, { limit: 100 });
      setMessages(response?.data || []);
      setError('');
    } catch (loadError) {
      setError(messageError(loadError));
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'customer') return;
    setLoading(true);
    try {
      const response = await supportConversationService.createOrGet();
      const nextConversation = response?.data;
      setConversation(nextConversation || null);
      if (nextConversation?.id) await loadMessages(nextConversation.id);
      setError('');
    } catch (loadError) {
      setError(messageError(loadError));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loadMessages, user?.role]);

  useEffect(() => { if (active) loadConversation(); }, [active, loadConversation]);
  useEffect(() => {
    if (atBottomRef.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const onSocketEvent = useCallback(async ({ eventName }) => {
    if (!conversation?.id) return;
    try {
      if (eventName === 'conversation.message.created' || eventName === 'reconnect') {
        if (eventName === 'reconnect') {
          const response = await supportConversationService.getConversation(conversation.id);
          setConversation(response?.data || null);
        }
        await loadMessages(conversation.id);
      } else {
        const response = await supportConversationService.getConversation(conversation.id);
        setConversation(response?.data || null);
      }
    } catch (loadError) {
      setError(messageError(loadError));
    }
  }, [conversation?.id, loadMessages]);

  const connectionState = useSupportSocket({ active: active && isAuthenticated, conversationId: conversation?.id, onEvent: onSocketEvent });

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!conversation?.id || !content || content.length > MAX_MESSAGE_LENGTH || sending || conversation.status === 'CLOSED') return;
    const id = retryMessage?.content === content ? retryMessage.id : clientMessageId();
    const pending = {
      id: `pending-${id}`,
      clientMessageId: id,
      content,
      sender: { id: user?.id },
      createdAt: new Date().toISOString(),
      pending: true
    };
    setMessages((current) => [...current, pending]);
    setDraft('');
    setSending(true);
    try {
      const response = await supportConversationService.sendMessage(conversation.id, { content, clientMessageId: id });
      const message = response?.data;
      setMessages((current) => current.map((item) => item.clientMessageId === id ? message : item));
      setRetryMessage(null);
      setError('');
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.clientMessageId !== id));
      setDraft(content);
      setRetryMessage({ id, content });
      setError(messageError(sendError));
    } finally {
      setSending(false);
    }
  };

  const closed = conversation?.status === 'CLOSED';
  const onScroll = () => {
    const element = scrollRef.current;
    if (element) atBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32;
  };

  if (!isAuthenticated || user?.role !== 'customer') return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[#777777]">Vui lòng đăng nhập để trò chuyện với nhân viên.</div>;

  return (
    <section className={`flex min-h-0 flex-col overflow-hidden bg-white ${fullPage ? 'min-h-[620px] ui-card' : 'h-[min(680px,calc(100vh-2rem))] w-[min(100vw-1rem,430px)] rounded-[12px] border border-[#e5e5e5] shadow-[0_18px_42px_rgba(0,0,0,0.12)]'}`} aria-label="Trò chuyện hỗ trợ">
      <header className="flex items-center justify-between gap-3 border-b border-[#eeeeee] px-4 py-3">
        <div><h1 className="text-base font-bold text-[#333333]">Hỗ trợ trực tuyến</h1><ConnectionStatus state={connectionState} /></div>
        {onClose ? <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-[7px] text-[#555555] hover:bg-[#fafaf8]" aria-label="Đóng trò chuyện"><span className="material-symbols-outlined">close</span></button> : null}
      </header>
      {loading ? <div className="flex flex-1 items-center justify-center" role="status">Đang mở cuộc trò chuyện…</div> : <>
        <MessageTimeline messages={messages} loading={messagesLoading} error={error && !messages.length ? error : ''} currentUserId={user?.id} scrollRef={scrollRef} onScroll={onScroll} />
        {error && messages.length ? <div className="border-t border-[#fdebec] bg-[#fff8f7] px-4 py-2 text-xs text-[#b94732]" role="alert">{error}<button type="button" onClick={loadConversation} className="ml-2 font-bold underline">Thử lại</button></div> : null}
        {closed ? <div className="border-t border-[#eeeeee] bg-[#fafaf8] px-4 py-4 text-sm text-[#777777]">Cuộc trò chuyện đã đóng. Nhân viên quản trị có thể mở lại khi cần.</div> : <form onSubmit={sendMessage} className="border-t border-[#eeeeee] p-3"><label className="sr-only" htmlFor="support-message">Nội dung tin nhắn</label><textarea id="support-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={MAX_MESSAGE_LENGTH} disabled={sending} className="ui-textarea block w-full resize-none" rows="3" placeholder="Nhập tin nhắn của bạn…" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-[#777777]">{draft.length}/{MAX_MESSAGE_LENGTH}</span><button type="submit" disabled={sending || !draft.trim() || draft.trim().length > MAX_MESSAGE_LENGTH} className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-50">{sending ? 'Đang gửi…' : 'Gửi'}</button></div></form>}
      </>}
    </section>
  );
}
