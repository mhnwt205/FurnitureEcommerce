const fallbackText = 'Mình chưa có câu trả lời phù hợp lúc này. Bạn có thể thử diễn đạt lại yêu cầu.';
const options = (values, limit) => Array.isArray(values) ? values.slice(0, limit).map((item, index) => ({ label: String(item?.label || item || '').slice(0, 160), value: String(item?.label || item || '').slice(0, 160), id: item?.id || `option-${index + 1}` })).filter((item) => item.label) : [];

export const normalizeAdvisorResponse = (raw = {}) => {
  const recommendations = Array.isArray(raw.recommendations) ? raw.recommendations.map((item) => ({ ...item })) : [];
  const responseType = raw.type || (recommendations.length ? 'recommendation' : 'text');
  const base = { text: typeof raw.answer === 'string' && raw.answer.trim() ? raw.answer : fallbackText, recommendations, sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : null, expiresAt: raw.session?.expiresAt || null, terminal: raw.terminal === true };
  if (responseType === 'clarification') return { ...base, type: 'clarification', recommendations: [], options: options(raw.question?.options, 6), questionText: raw.question?.text || null };
  if (responseType === 'relaxation_proposal') return { ...base, type: 'relaxation', recommendations: [], options: options(raw.relaxation?.options, 3), proposalId: raw.relaxation?.proposalId || null };
  if (responseType === 'no_result') return { ...base, type: 'no_result', recommendations: [], options: [] };
  if (responseType === 'recommendation' || recommendations.length) return { ...base, type: 'recommendation', options: [], canRefine: raw.canRefine === true };
  return { ...base, type: 'text', recommendations: [], options: [] };
};

export const normalizeAdvisorError = (error = {}) => {
  if (error.code === 'REQUEST_ABORTED') return { kind: 'aborted', message: 'Yêu cầu đã được hủy.' };
  if (error.code === 'REQUEST_TIMEOUT') return { kind: 'timeout', message: 'Yêu cầu mất quá lâu. Vui lòng thử lại.' };
  if (error.status === 429) return { kind: 'rate_limit', message: 'Bạn đang gửi yêu cầu hơi nhanh. Vui lòng chờ một lát.' };
  if (error.status >= 400 && error.status < 500) return { kind: 'validation', message: 'Yêu cầu chưa hợp lệ. Vui lòng kiểm tra lại nội dung.' };
  if (error.status >= 500) return { kind: 'server', message: 'Dịch vụ tư vấn đang bận. Vui lòng thử lại sau.' };
  return { kind: 'network', message: 'Không thể kết nối AI tư vấn. Vui lòng thử lại.' };
};
