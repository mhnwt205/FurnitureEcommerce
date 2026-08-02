import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../../utils/formatters.js';
import { getStaticFileUrl } from '../../utils/imageUtils.js';
import { sendAiAdvisorMessage } from '../../services/api/aiAdvisorService.js';
import {
  appendBoundedAdvisorMessage,
  canSendAdvisorMessage,
  formatAdvisorCooldown,
  getAdvisorProductHref,
  getAdvisorProductImage,
  isAdvisorAbortError
} from './aiAdvisorUi.js';

const MAX_MESSAGE_LENGTH = 1000;

const displayError = (error) => {
  if (error?.code === 'AI_ADVISOR_REQUEST_INVALID' || error?.status === 400) return 'Nội dung yêu cầu chưa hợp lệ.';
  if (error?.code === 'AI_ADVISOR_RATE_LIMITED' || error?.status === 429) return 'Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau.';
  if (error?.code === 'AI_ADVISOR_UNAVAILABLE' || error?.status === 500 || error?.status === 503) return 'Trợ lý AI hiện chưa thể phản hồi. Vui lòng thử lại sau.';
  return 'Không thể kết nối đến trợ lý AI. Vui lòng kiểm tra kết nối và thử lại.';
};

function RecommendationCard({ product }) {
  const image = getAdvisorProductImage(product);
  const originalPriceVisible = product.price !== product.finalPrice;

  return (
    <article className="overflow-hidden rounded-lg border border-commerce-border bg-white">
      <a href={getAdvisorProductHref(product)} className="grid grid-cols-[76px_1fr] gap-3 p-3 hover:bg-commerce-surface-muted">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-commerce-surface-muted text-center text-xs text-commerce-muted">
          {image ? <img src={getStaticFileUrl(image)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="material-symbols-outlined">image_not_supported</span>}
        </div>
        <div className="min-w-0">
          {product.category?.name ? <p className="text-xs text-commerce-muted">{product.category.name}</p> : null}
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5 text-commerce-text">{product.name}</h3>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-bold text-commerce-sale">{formatPrice(product.finalPrice)}</span>
            {originalPriceVisible ? <span className="text-xs text-commerce-muted line-through">{formatPrice(product.price)}</span> : null}
          </div>
          {product.promotion?.name ? <p className="mt-1 text-xs text-commerce-secondary">{product.promotion.name}</p> : null}
          <p className="mt-1 text-xs text-commerce-muted">{product.stock > 0 ? `Còn hàng: ${product.stock}` : 'Tạm hết hàng'}</p>
          {product.reviewCount > 0 ? <p className="mt-1 text-xs text-commerce-muted">★ {product.averageRating.toFixed(1)} ({product.reviewCount})</p> : null}
        </div>
      </a>
      <p className="border-t border-commerce-border px-3 py-2 text-xs leading-5 text-commerce-text">{product.reason}</p>
    </article>
  );
}

function MessageList({ messages, loading, scrollRef, onScroll }) {
  if (!messages.length && !loading) {
    return <div className="flex flex-1 items-center justify-center px-6 text-center text-sm leading-6 text-commerce-muted">Hãy cho tôi biết bạn đang tìm món nội thất nào.</div>;
  }

  return (
    <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
      <ol className="space-y-3" role="list">
        {messages.map((message) => (
          <li key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={message.role === 'user' ? 'max-w-[85%] rounded-lg bg-commerce-primary px-3 py-2 text-sm leading-6 text-white' : 'max-w-[95%] rounded-lg border border-commerce-border bg-commerce-surface-muted px-3 py-2 text-sm leading-6 text-commerce-text'}>
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
              {message.recommendations?.length ? <div className="mt-3 space-y-2">{message.recommendations.map((product) => <RecommendationCard key={product.id} product={product} />)}</div> : null}
            </div>
          </li>
        ))}
        {loading ? <li className="flex justify-start"><div className="rounded-lg border border-commerce-border bg-commerce-surface-muted px-3 py-2 text-sm text-commerce-muted" role="status">Đang tìm gợi ý phù hợp…</div></li> : null}
      </ol>
    </div>
  );
}

export default function AISalesAdvisor({ open = false, onOpenChange, currentProductId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState(null);
  const activeRequestRef = useRef(null);
  const mountedRef = useRef(true);
  const scrollRef = useRef(null);
  const atBottomRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    activeRequestRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!open) activeRequestRef.current?.abort();
  }, [open]);

  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const interval = setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (nextNow >= cooldownUntil) setCooldownUntil(0);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  useEffect(() => {
    if (atBottomRef.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, error]);

  const appendMessage = (message) => setMessages((current) => appendBoundedAdvisorMessage(current, message));
  const close = () => onOpenChange?.(false);
  const remainingSeconds = cooldownUntil > now ? Math.ceil((cooldownUntil - now) / 1000) : 0;
  const disabled = loading || remainingSeconds > 0;

  const submitMessage = async (text, { appendUser = true } = {}) => {
    const message = text.trim();
    if (!canSendAdvisorMessage({ input: message, loading, cooldownUntil, now: Date.now() })) return;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    if (appendUser) appendMessage({ id: `user-${Date.now()}`, role: 'user', text: message });
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const response = await sendAiAdvisorMessage({
        message,
        context: Number.isInteger(currentProductId) && currentProductId > 0 ? { currentProductId } : undefined,
        signal: controller.signal
      });
      if (!mountedRef.current || activeRequestRef.current !== controller) return;
      appendMessage({ id: `assistant-${Date.now()}`, role: 'assistant', text: response.answer, recommendations: response.recommendations });
    } catch (requestError) {
      if (!mountedRef.current || activeRequestRef.current !== controller || isAdvisorAbortError(requestError)) return;
      if (requestError?.code === 'AI_ADVISOR_RATE_LIMITED' || requestError?.status === 429) {
        const seconds = Number.isSafeInteger(requestError.retryAfterSeconds) ? requestError.retryAfterSeconds : 60;
        setCooldownUntil(Date.now() + seconds * 1000);
      }
      setError({ message, text: displayError(requestError) });
    } finally {
      if (mountedRef.current && activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setLoading(false);
      }
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    submitMessage(input);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit(event);
    }
  };

  const onScroll = () => {
    const element = scrollRef.current;
    if (element) atBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32;
  };

  if (!open) {
    return <button type="button" onClick={() => onOpenChange?.(true)} className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-[10px] border border-commerce-secondary bg-white px-3 text-sm font-bold text-commerce-primary shadow-commerce-card hover:bg-commerce-surface-muted" aria-haspopup="dialog" aria-expanded={false}><span className="material-symbols-outlined">auto_awesome</span><span className="hidden sm:inline">Tư vấn AI</span></button>;
  }

  return (
    <section className="flex h-[min(680px,calc(100vh-2rem))] w-[min(100vw-1rem,430px)] flex-col overflow-hidden rounded-[12px] border border-commerce-border bg-white shadow-[0_18px_42px_rgba(0,0,0,0.12)]" role="dialog" aria-modal="true" aria-label="Tư vấn nội thất AI">
      <header className="flex items-center justify-between gap-3 border-b border-commerce-border px-4 py-3"><div><h2 className="text-base font-bold text-commerce-text">Tư vấn nội thất AI</h2><p className="mt-0.5 text-xs text-commerce-muted">Gợi ý dựa trên dữ liệu sản phẩm hiện có</p></div><button type="button" onClick={close} className="flex h-10 w-10 items-center justify-center rounded-md text-commerce-muted hover:bg-commerce-surface-muted" aria-label="Đóng tư vấn AI"><span className="material-symbols-outlined">close</span></button></header>
      <MessageList messages={messages} loading={loading} scrollRef={scrollRef} onScroll={onScroll} />
      {remainingSeconds > 0 ? <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900" role="alert">Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau {formatAdvisorCooldown(remainingSeconds)}.</div> : null}
      {error ? <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800" role="alert"><span>{error.text}</span>{remainingSeconds === 0 ? <button type="button" onClick={() => submitMessage(error.message, { appendUser: false })} disabled={disabled} className="ml-2 font-semibold underline disabled:cursor-not-allowed disabled:opacity-50">Thử lại</button> : null}</div> : null}
      <form onSubmit={onSubmit} className="border-t border-commerce-border p-3"><label htmlFor="ai-advisor-message" className="sr-only">Nhu cầu nội thất</label><textarea id="ai-advisor-message" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} maxLength={MAX_MESSAGE_LENGTH} rows={3} disabled={disabled} className="ui-textarea block w-full resize-none" placeholder="Ví dụ: Tôi cần sofa cho phòng khách nhỏ…" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-commerce-muted">{input.length}/{MAX_MESSAGE_LENGTH}</span><button type="submit" disabled={!canSendAdvisorMessage({ input, loading, cooldownUntil, now: Date.now() })} className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Đang gửi…' : 'Gửi'}</button></div></form>
    </section>
  );
}
