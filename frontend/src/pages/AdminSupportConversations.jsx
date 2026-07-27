import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAdminSupportSocket from '../hooks/useAdminSupportSocket.js';
import { adminSupportConversationService } from '../services/api/adminSupportConversationService.js';

const MAX_LENGTH = 2000;
const tabs = [
  { key: 'WAITING', label: 'Yêu cầu mới' },
  { key: 'ACTIVE', label: 'Đang xử lý' },
  { key: 'CLOSED', label: 'Đã đóng' }
];
const errorText = (error) => error?.message || 'Không thể cập nhật cuộc trò chuyện. Vui lòng thử lại.';
const errorCode = (error) => error?.data?.error?.code;
const newMessageId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const formatTime = (value) => value ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';

function Status({ state }) {
  const label = {
    connected: 'Trực tuyến',
    connecting: 'Đang kết nối…',
    offline: 'Ngoại tuyến',
    error: 'Lỗi kết nối'
  }[state] || 'Ngoại tuyến';
  return <span className="flex items-center gap-1.5 text-xs text-[#777777]"><span className={`h-2 w-2 rounded-full ${state === 'connected' ? 'bg-[#2f7d32]' : state === 'error' ? 'bg-[#b94732]' : 'bg-[#9a6a16]'}`} />{label}</span>;
}

function SenderLabel({ message, mine }) {
  if (mine || message.pending) return null;
  return <p className="mb-1 text-[11px] font-semibold text-[#777777]">{message.sender?.fullName || (message.senderRole === 'CUSTOMER' ? 'Khách hàng' : 'Nhân viên hỗ trợ')}</p>;
}

function ConversationMessages({ messages, currentUserId, scrollRef: _scrollRef, onScroll: _onScroll }) {
  if (!messages.length) return <p className="py-10 text-center text-sm text-[#777777]">Chưa có tin nhắn.</p>;
  return (
    <ol className="space-y-3" role="list">
      {messages.map((message) => {
        const mine = message.pending || String(message.sender?.id) === String(currentUserId);
        return (
          <li key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6 ${mine ? 'bg-[#333333] text-white' : 'border border-[#e5e5e5] bg-[#fafaf8] text-[#333333]'}`}>
              <SenderLabel message={message} mine={mine} />
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-[#777777]'}`}>{message.pending ? 'Đang gửi…' : formatTime(message.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AssigneeDialog({ conversation, assignees, loading, error, selectedId, onSelectedId, onRetry, onClose, onSubmit }) {
  const currentAssigneeId = conversation?.assignedStaff?.id;
  const selectedIsCurrent = String(selectedId) === String(currentAssigneeId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-label="Phân công hội thoại">
      <form onSubmit={onSubmit} className="ui-modal-panel w-full max-w-md p-5">
        <h2 className="text-lg font-bold text-[#333333]">{conversation?.assignedStaff ? 'Chuyển người xử lý' : 'Phân công nhân viên'}</h2>
        {conversation?.assignedStaff ? <p className="mt-1 text-sm text-[#777777]">Đang giao cho {conversation.assignedStaff.fullName}.</p> : null}
        <label htmlFor="support-assignee" className="mt-4 block text-sm font-semibold text-[#555555]">Nhân viên xử lý</label>
        {loading ? <div className="mt-2 h-11 animate-pulse rounded-[7px] bg-[#f3f3f1]" aria-busy="true" aria-label="Đang tải nhân viên" /> : null}
        {!loading && error ? <div className="mt-2 rounded-[7px] border border-[#f3c9c4] bg-[#fff8f7] p-3 text-sm text-[#b94732]" role="alert">{error}<button type="button" onClick={onRetry} className="ml-2 font-bold underline">Thử lại</button></div> : null}
        {!loading && !error ? <>
          <select id="support-assignee" value={selectedId} onChange={(event) => onSelectedId(event.target.value)} className="ui-select mt-2 w-full" required>
            <option value="">Chọn nhân viên phù hợp</option>
            {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.fullName} · {assignee.email}{assignee.role === 'admin' ? ' (Quản trị viên)' : ''}</option>)}
          </select>
          {!assignees.length ? <p className="mt-2 text-sm text-[#777777]">Chưa có nhân viên hỗ trợ đủ điều kiện.</p> : null}
          {selectedIsCurrent ? <p className="mt-2 text-xs text-[#777777]">Hãy chọn người khác để chuyển xử lý.</p> : null}
        </> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ui-button-secondary">Hủy</button>
          <button type="submit" disabled={loading || Boolean(error) || !selectedId || selectedIsCurrent} className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-50">Xác nhận</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminSupportConversations() {
  const { user, isAuthenticated } = useAuth();
  const permissions = user?.userPermissions?.map((item) => item.permission?.key).filter(Boolean) || [];
  const can = (permission) => user?.role === 'admin' || permissions.includes(permission);
  const [tab, setTab] = useState('WAITING');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [retryMessage, setRetryMessage] = useState(null);
  const [sending, setSending] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignees, setAssignees] = useState([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesError, setAssigneesError] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const scrollRef = useRef(null);
  const atBottom = useRef(true);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminSupportConversationService.list({ status: tab, page: 1, limit: 50 });
      const next = response?.data || [];
      setItems(next);
      setSelectedId((current) => current && next.some((item) => item.id === current) ? current : null);
      setError('');
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const [detail, history] = await Promise.all([
        adminSupportConversationService.get(id),
        adminSupportConversationService.messages(id, { limit: 100 })
      ]);
      setConversation(detail?.data || null);
      setMessages(history?.data || []);
      setError('');
    } catch (loadError) {
      if (loadError?.status === 404) {
        setSelectedId(null);
        setConversation(null);
        setMessages([]);
      } else {
        setError(errorText(loadError));
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadAssignees = useCallback(async () => {
    setAssigneesLoading(true);
    setAssigneesError('');
    try {
      const response = await adminSupportConversationService.assignees();
      const nextAssignees = response?.data || [];
      setAssignees(nextAssignees);
      setSelectedAssigneeId((current) => (
        nextAssignees.some((assignee) => String(assignee.id) === String(current)) ? current : ''
      ));
    } catch (loadError) {
      setAssigneesError(errorText(loadError));
    } finally {
      setAssigneesLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); else { setConversation(null); setMessages([]); } }, [selectedId, loadDetail]);
  useEffect(() => { if (atBottom.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const socketEvent = useCallback(async ({ payload }) => {
    await loadList();
    if (!selectedId || (payload?.conversationId && payload.conversationId !== selectedId)) return;
    await loadDetail(selectedId);
  }, [loadDetail, loadList, selectedId]);
  const socketState = useAdminSupportSocket({ active: isAuthenticated && can('support_conversation.read'), conversationId: selectedId, onEvent: socketEvent });

  const mutate = async (operation) => {
    if (!conversation?.id) return;
    try {
      await operation(conversation.id);
      setAssignOpen(false);
      await Promise.all([loadList(), loadDetail(conversation.id)]);
    } catch (mutationError) {
      setError(errorText(mutationError));
    }
  };

  const send = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!conversation?.id || !content || sending || conversation.status === 'CLOSED') return;
    const id = retryMessage?.content === content ? retryMessage.id : newMessageId();
    setMessages((current) => [...current, {
      id: `pending-${id}`,
      clientMessageId: id,
      content,
      sender: { id: user?.id },
      createdAt: new Date().toISOString(),
      pending: true
    }]);
    setDraft('');
    setSending(true);
    try {
      const result = await adminSupportConversationService.send(conversation.id, { content, clientMessageId: id });
      setMessages((current) => current.map((message) => message.clientMessageId === id ? result.data : message));
      setRetryMessage(null);
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.clientMessageId !== id));
      setDraft(content);
      setRetryMessage({ id, content });
      setError(errorText(sendError));
    } finally {
      setSending(false);
    }
  };

  const openAssignDialog = () => {
    setSelectedAssigneeId(String(conversation?.assignedStaff?.id || ''));
    setAssignOpen(true);
    loadAssignees();
  };

  const submitAssign = async (event) => {
    event.preventDefault();
    const assigneeId = Number(selectedAssigneeId);
    if (!conversation?.id || !Number.isSafeInteger(assigneeId) || assigneeId <= 0) return;
    try {
      await adminSupportConversationService.assign(conversation.id, assigneeId);
      setAssignOpen(false);
      await Promise.all([loadList(), loadDetail(conversation.id)]);
    } catch (assignError) {
      setError(errorText(assignError));
      if (errorCode(assignError) === 'STAFF_NOT_ELIGIBLE') {
        setAssigneesError('Nhân viên này không còn đủ điều kiện xử lý. Danh sách đã được làm mới.');
        await loadAssignees();
      }
    }
  };

  const onScroll = () => {
    const element = scrollRef.current;
    if (element) atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32;
  };
  const assignedToMe = conversation?.assignedStaff?.id === user?.id;
  const canReply = can('support_conversation.reply') && (user?.role === 'admin' || assignedToMe);
  const canAssign = user?.role === 'admin' && can('support_conversation.assign');
  const currentTabLabel = useMemo(() => tabs.find((item) => item.key === tab)?.label, [tab]);

  return (
    <AdminLayout>
      <main aria-label="Hỗ trợ trực tuyến">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-headline-lg">Hỗ trợ trực tuyến</h1><p className="mt-1 text-sm text-ui-muted">Quản lý các cuộc trò chuyện trực tiếp với khách hàng.</p></div>
          <div className="flex items-center gap-3"><Status state={socketState} /><button type="button" onClick={loadList} className="ui-button-secondary">Làm mới</button></div>
        </div>
        {error ? <div className="mb-4 flex items-center justify-between gap-3 rounded-[7px] border border-[#f3c9c4] bg-[#fff8f7] px-4 py-3 text-sm text-[#b94732]" role="alert"><span>{error}</span><button type="button" onClick={() => { setError(''); loadList(); }} className="font-bold underline">Thử lại</button></div> : null}
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Trạng thái hội thoại">
          {tabs.map((item) => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)} className={`min-h-11 rounded-[7px] px-4 text-sm font-bold ${tab === item.key ? 'bg-[#333333] text-white' : 'border border-[#dddddd] bg-white text-[#555555] hover:bg-[#fafaf8]'}`}>{item.label}</button>)}
        </div>
        <div className="grid min-h-[620px] overflow-hidden rounded-[12px] border border-[#e5e5e5] bg-white lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-[#eeeeee] lg:border-b-0 lg:border-r" aria-label={currentTabLabel}>
            {loading ? <div className="space-y-3 p-4" aria-busy="true"><div className="ui-skeleton h-16 rounded" /><div className="ui-skeleton h-16 rounded" /></div> : !items.length ? <div className="p-6 text-center text-sm text-[#777777]">Chưa có hội thoại trong mục này.</div> : <ul className="max-h-[300px] overflow-y-auto lg:max-h-none" role="list">{items.map((item) => <li key={item.id}><button type="button" onClick={() => setSelectedId(item.id)} className={`w-full border-b border-[#eeeeee] px-4 py-3 text-left ${selectedId === item.id ? 'bg-[#fafaf8]' : 'hover:bg-[#fafaf8]'}`}><p className="truncate text-sm font-bold text-[#333333]">{item.customer?.fullName || `Khách hàng #${item.customer?.id}`}</p><p className="mt-1 truncate text-xs text-[#777777]">{item.lastMessagePreview || 'Chưa có tin nhắn'}</p><p className="mt-1 text-[11px] text-[#777777]">{item.assignedStaff?.fullName || 'Chưa phân công'}</p></button></li>)}</ul>}
          </aside>
          <section className="flex min-h-0 flex-col">
            {!selectedId ? <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-[#777777]"><span className="material-symbols-outlined mb-2 text-3xl">forum</span>Chọn một hội thoại để xem chi tiết.</div> : detailLoading && !conversation ? <div className="flex flex-1 items-center justify-center" aria-busy="true">Đang tải hội thoại…</div> : conversation ? <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeeee] px-4 py-3">
                <div><h2 className="text-base font-bold text-[#333333]">{conversation.customer?.fullName || 'Khách hàng'}</h2><p className="text-xs text-[#777777]">{conversation.status} · {conversation.assignedStaff?.fullName || 'Chưa phân công'}</p></div>
                <div className="flex flex-wrap gap-2">
                  {conversation.status === 'WAITING' && can('support_conversation.accept') ? <button type="button" onClick={() => mutate(adminSupportConversationService.accept)} className="ui-button-primary">Nhận hội thoại</button> : null}
                  {canAssign && conversation.status !== 'CLOSED' ? <button type="button" onClick={openAssignDialog} className="ui-button-secondary">{conversation.assignedStaff ? 'Chuyển người xử lý' : 'Phân công'}</button> : null}
                  {conversation.status === 'ACTIVE' && can('support_conversation.close') && (user?.role === 'admin' || assignedToMe) ? <button type="button" onClick={() => { if (window.confirm('Đóng cuộc trò chuyện này?')) mutate(adminSupportConversationService.close); }} className="ui-button-secondary">Đóng</button> : null}
                  {conversation.status === 'CLOSED' && user?.role === 'admin' ? <button type="button" onClick={() => mutate(adminSupportConversationService.reopen)} className="ui-button-primary">Mở lại</button> : null}
                </div>
              </header>
              <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto p-4" aria-live="polite"><ConversationMessages messages={messages} currentUserId={user?.id} scrollRef={scrollRef} onScroll={onScroll} /></div>
              {conversation.status === 'CLOSED' ? <div className="border-t border-[#eeeeee] bg-[#fafaf8] px-4 py-4 text-sm text-[#777777]">Cuộc trò chuyện đã đóng.</div> : !canReply ? <div className="border-t border-[#eeeeee] bg-[#fafaf8] px-4 py-4 text-sm text-[#777777]">Bạn không có quyền trả lời hội thoại này.</div> : <form onSubmit={send} className="border-t border-[#eeeeee] p-3"><label htmlFor="admin-support-message" className="sr-only">Nội dung trả lời</label><textarea id="admin-support-message" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={sending} maxLength={MAX_LENGTH} rows="3" className="ui-textarea block w-full resize-none" placeholder="Nhập phản hồi…" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-[#777777]">{draft.length}/{MAX_LENGTH}</span><button type="submit" disabled={sending || !draft.trim()} className="ui-button-primary disabled:opacity-50">{sending ? 'Đang gửi…' : 'Gửi'}</button></div></form>}
            </> : null}
          </section>
        </div>
        {assignOpen ? <AssigneeDialog conversation={conversation} assignees={assignees} loading={assigneesLoading} error={assigneesError} selectedId={selectedAssigneeId} onSelectedId={setSelectedAssigneeId} onRetry={loadAssignees} onClose={() => setAssignOpen(false)} onSubmit={submitAssign} /> : null}
      </main>
    </AdminLayout>
  );
}
