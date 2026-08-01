const MAX_MESSAGES = 20;
const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const createClientMessageId = () => globalThis.crypto?.randomUUID?.() || `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export const initialAdvisorState = (persisted = null, greeting) => ({
  sessionId: persisted?.sessionId || null, expiresAt: persisted?.expiresAt || null,
  messages: persisted?.messages?.length ? persisted.messages : [greeting], loading: false, error: null,
  request: null, generation: 0
});

const append = (messages, message) => [...messages, message].slice(-MAX_MESSAGES);

export const aiAdvisorReducer = (state, action) => {
  switch (action.type) {
    case 'SEND': return { ...state, error: null, loading: true, request: action.request, messages: action.message ? append(state.messages, action.message) : state.messages };
    case 'SUCCESS':
      if (!state.request || state.request.generation !== action.generation || state.request.clientMessageId !== action.clientMessageId) return state;
      return { ...state, loading: false, request: null, error: null, sessionId: action.sessionId || state.sessionId, expiresAt: action.expiresAt || state.expiresAt, messages: append(state.messages, action.message) };
    case 'FAILURE':
      if (!state.request || state.request.generation !== action.generation || state.request.clientMessageId !== action.clientMessageId) return state;
      return { ...state, loading: false, error: action.error, messages: append(state.messages, action.message) };
    case 'OPTION_CONSUMED': return { ...state, messages: state.messages.map((item) => item.id === action.messageId ? { ...item, options: [], requestState: 'consumed' } : item) };
    case 'RESET_START': return { ...state, loading: true, error: null, generation: state.generation + 1 };
    case 'RESET_SUCCESS': return { ...state, loading: false, request: null, sessionId: action.sessionId || null, expiresAt: action.expiresAt || null, messages: [action.greeting], generation: state.generation + 1 };
    case 'RESET_FAILURE': return { ...state, loading: false, error: action.error };
    case 'EXPIRE': return { ...state, sessionId: null, expiresAt: null, request: null, loading: false, messages: [action.greeting], generation: state.generation + 1 };
    default: return state;
  }
};

export const makeUiMessage = ({ role, type = 'text', text, recommendations = [], options = [], requestState = null }) => ({ id: id(role === 'user' ? 'user' : 'assistant'), role, type, text: String(text || ''), recommendations: Array.isArray(recommendations) ? recommendations.map((item) => ({ ...item })) : [], options: Array.isArray(options) ? options.slice(0, 6).map((item) => ({ ...item })) : [], createdAt: new Date().toISOString(), requestState });
