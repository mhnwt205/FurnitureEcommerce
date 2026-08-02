const MAX_HISTORY_MESSAGES = 30;

export const appendBoundedAdvisorMessage = (messages, message) => [...messages, message].slice(-MAX_HISTORY_MESSAGES);

export const canSendAdvisorMessage = ({ input, loading, cooldownUntil, now }) => (
  typeof input === 'string' && input.trim().length > 0 && !loading && cooldownUntil <= now
);

export const formatAdvisorCooldown = (seconds) => {
  const remaining = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
};

export const isAdvisorAbortError = (error) => error?.code === 'AI_ADVISOR_ABORTED' || error?.code === 'REQUEST_ABORTED' || error?.name === 'AbortError';
export const getAdvisorProductHref = (product) => `/products/${product.id}`;
export const getAdvisorProductImage = (product) => typeof product?.image === 'string' && product.image ? product.image : null;
