import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { aiAdvisorService } from '../../services/api/aiAdvisorService';
import { getStaticFileUrl } from '../../utils/imageUtils';

const INITIAL_MESSAGE = 'Xin chào! Mình có thể giúp bạn chọn nội thất theo nhu cầu, ngân sách hoặc không gian.';
const MAX_MESSAGE_LENGTH = 1000;

const formatPrice = (price) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(Number(price) || 0);

const getCurrentProductId = (pathname) => {
  const match = pathname.match(/^\/products\/(\d+)/);
  return match ? Number(match[1]) : undefined;
};

function RecommendationCard({ product }) {
  const imageUrl = getStaticFileUrl(product.imageUrl) || 'https://placehold.co/120x120?text=SP';

  return (
    <div className="rounded-xl border border-outline-variant/40 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-beige border border-outline-variant/20">
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = 'https://placehold.co/120x120?text=SP';
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-bold text-primary">{product.name}</p>
          <p className="mt-1 text-sm font-bold text-accent-terracotta">{formatPrice(product.price)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
            {product.category && <span>{product.category}</span>}
            <span>{product.stock > 0 ? `Còn ${product.stock}` : 'Tạm hết hàng'}</span>
            {product.averageRating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-accent-gold">
                <span className="material-symbols-outlined text-[14px]">star</span>
                {product.averageRating} ({product.reviewCount || 0})
              </span>
            )}
          </div>
        </div>
      </div>
      {product.reason && <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{product.reason}</p>}
      <Link
        to={`/products/${product.id}`}
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
      >
        Xem sản phẩm
      </Link>
    </div>
  );
}

export default function AISalesAdvisor() {
  const location = useLocation();
  const listRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'bot', text: INITIAL_MESSAGE, recommendations: [] }
  ]);

  const currentProductId = useMemo(() => getCurrentProductId(location.pathname), [location.pathname]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading, isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = { id: `user-${Date.now()}`, role: 'user', text, recommendations: [] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await aiAdvisorService.sendMessage(text, {
        ...(currentProductId ? { currentProductId } : {})
      });

      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: response.answer || 'Mình chưa có câu trả lời phù hợp lúc này.',
          recommendations: response.recommendations || []
        }
      ]);
    } catch (err) {
      const message = err.message || 'Không thể kết nối AI tư vấn. Vui lòng thử lại sau.';
      setError(message);
      setMessages(prev => [
        ...prev,
        { id: `bot-error-${Date.now()}`, role: 'bot', text: message, recommendations: [] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[95] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 flex h-[min(680px,calc(100vh-120px))] w-[calc(100vw-32px)] max-w-[390px] flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 bg-primary px-5 py-4 text-white">
            <div>
              <p className="font-display-lg text-lg leading-tight">AI Tư vấn nội thất</p>
              <p className="mt-1 text-xs text-white/80">Gợi ý theo nhu cầu, ngân sách và sản phẩm thật</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Đóng AI tư vấn"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-surface-ivory/50 px-4 py-4">
            {messages.map(message => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={message.role === 'user' ? 'max-w-[82%] rounded-2xl bg-primary px-4 py-3 text-sm leading-relaxed text-white' : 'max-w-[92%] rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm leading-relaxed text-primary shadow-sm'}>
                  <p className="whitespace-pre-line">{message.text}</p>
                  {message.recommendations?.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {message.recommendations.map(product => (
                        <RecommendationCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm text-on-surface-variant shadow-sm">
                  Đang tìm sản phẩm phù hợp...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-outline-variant/30 bg-white p-4">
            {error && <div className="mb-3 rounded-lg bg-error-container/30 px-3 py-2 text-xs text-error">{error}</div>}
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                rows="2"
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Ví dụ: Tôi cần sofa dưới 10 triệu..."
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Gửi tin nhắn"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
            <div className="mt-2 text-right text-[11px] text-on-surface-variant">{input.length}/{MAX_MESSAGE_LENGTH}</div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-white shadow-xl transition-all hover:bg-primary-container active:scale-95"
        aria-expanded={isOpen}
        aria-label="AI Tư vấn nội thất"
      >
        <span className="material-symbols-outlined text-[24px]">support_agent</span>
        <span className="hidden text-sm font-bold md:inline">AI Tư vấn nội thất</span>
      </button>
    </div>
  );
}