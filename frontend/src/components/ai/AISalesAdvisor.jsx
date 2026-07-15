import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { aiAdvisorService } from '../../services/api/aiAdvisorService';
import { getStaticFileUrl } from '../../utils/imageUtils';
import PriceDisplay from '../common/PriceDisplay';
import { isOutOfStock } from '../../utils/stockUtils';

const INITIAL_MESSAGE = 'Xin chào! Mình có thể giúp bạn chọn nội thất theo nhu cầu, ngân sách hoặc không gian.';
const MAX_MESSAGE_LENGTH = 1000;

const getCurrentProductId = (pathname) => {
  const match = pathname.match(/^\/products\/(\d+)/);
  return match ? Number(match[1]) : undefined;
};

function ProductImage({ src, alt }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f3f3f1] text-[#999999]">
        <span className="material-symbols-outlined text-2xl">chair</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />;
}

function RecommendationCard({ product }) {
  const imageUrl = product.imageUrl ? getStaticFileUrl(product.imageUrl) : '';
  const outOfStock = isOutOfStock(product);

  return (
    <article className="group rounded-[10px] border border-[#e5e5e5] bg-white p-3 transition-colors hover:border-[#bfa37c]">
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[8px] border border-[#eeeeee] bg-[#f6f6f4]">
          <ProductImage src={imageUrl} alt={product.name} />
          {outOfStock && <span className="absolute inset-0 bg-white/20" aria-hidden="true" />}
          {outOfStock && <span className="pointer-events-none absolute left-1 top-1 rounded-[5px] bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">Hết hàng</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-[#333333]">{product.name}</p>
          <PriceDisplay {...product} size="small" showBadge showSavings className="mt-1" />
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#777777]">
            {product.category && <span>{product.category}</span>}
            <span>{outOfStock ? 'Hết hàng' : `Còn ${product.stock}`}</span>
            {product.averageRating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[#bfa37c]">
                <span className="material-symbols-outlined text-[14px]">star</span>
                {product.averageRating} ({product.reviewCount || 0})
              </span>
            )}
          </div>
        </div>
      </div>
      {product.reason && <p className="mt-2 text-xs leading-5 text-[#777777]">{product.reason}</p>}
      <Link to={`/products/${product.id}`} className="mt-3 inline-flex w-full items-center justify-center rounded-[8px] border border-[#333333] px-3 py-2 text-xs font-bold text-[#333333] transition-colors hover:bg-[#333333] hover:text-white">
        Xem sản phẩm
      </Link>
    </article>
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
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
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
      setMessages(prev => [...prev, { id: `bot-error-${Date.now()}`, role: 'bot', text: message, recommendations: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="fixed bottom-5 right-4 z-[95] flex max-w-[calc(100vw-2rem)] flex-col items-end sm:bottom-6 sm:right-6">
      {isOpen && (
        <div className="mb-3 flex h-[min(660px,calc(100vh-112px))] w-[calc(100vw-32px)] max-w-[400px] flex-col overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-white shadow-[0_18px_42px_rgba(0,0,0,0.10)]">
          <div className="flex items-start justify-between gap-3 border-b border-[#eeeeee] bg-white px-5 py-4">
            <div>
              <p className="text-[15px] font-bold leading-tight text-[#333333]">Tư vấn nội thất</p>
              <p className="mt-1 text-xs leading-5 text-[#777777]">Gợi ý theo nhu cầu, ngân sách và sản phẩm thật</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#777777] transition-colors hover:bg-[#f3f3f1] hover:text-[#333333]" aria-label="Đóng AI tư vấn">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-[#fafaf8] px-4 py-4">
            {messages.map(message => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={message.role === 'user' ? 'max-w-[82%] rounded-[14px] bg-[#333333] px-4 py-3 text-sm leading-6 text-white' : 'max-w-[92%] rounded-[14px] border border-[#e5e5e5] bg-white px-4 py-3 text-sm leading-6 text-[#434343]'}>
                  <p className="whitespace-pre-line">{message.text}</p>
                  {message.recommendations?.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {message.recommendations.map(product => <RecommendationCard key={product.id} product={product} />)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-[14px] border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#777777]">
                  <div className="mb-2 flex gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#bfa37c] animate-pulse" /><span className="h-1.5 w-1.5 rounded-full bg-[#bfa37c] animate-pulse [animation-delay:120ms]" /><span className="h-1.5 w-1.5 rounded-full bg-[#bfa37c] animate-pulse [animation-delay:240ms]" /></div>
                  Đang tìm sản phẩm phù hợp...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-[#eeeeee] bg-white p-4">
            {error && <div className="mb-3 rounded-[8px] border border-[#f5d2d3] bg-[#fdebec] px-3 py-2 text-xs text-[#9f2f2d]">{error}</div>}
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
                className="ui-textarea min-h-[44px] flex-1 resize-none text-sm"
              />
              <button type="submit" disabled={!input.trim() || loading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#333333] text-white transition-colors hover:bg-[#4a3a31] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Gửi tin nhắn">
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
            <div className="mt-2 text-right text-[11px] text-[#777777]">{input.length}/{MAX_MESSAGE_LENGTH}</div>
          </form>
        </div>
      )}

      <button type="button" onClick={() => setIsOpen(prev => !prev)} className="flex h-12 items-center gap-2 rounded-[12px] border border-[#333333] bg-[#333333] px-4 text-white shadow-[0_8px_22px_rgba(0,0,0,0.14)] transition-colors hover:bg-[#4a3a31] active:scale-[0.98] sm:h-13" aria-expanded={isOpen} aria-label="AI tư vấn nội thất">
        <span className="material-symbols-outlined text-[22px]">support_agent</span>
        <span className="hidden text-sm font-bold md:inline">Tư vấn nội thất</span>
      </button>
    </div>
  );
}