import { afterEach, describe, expect, it, vi } from 'vitest';

const apiClientSpy = vi.fn();

vi.mock('./apiClient.js', () => ({
  default: apiClientSpy
}));

const loadService = async () => {
  vi.resetModules();
  return import('./aiAdvisorService.js');
};

afterEach(() => {
  apiClientSpy.mockReset();
  vi.restoreAllMocks();
  vi.resetModules();
});

const recommendation = (overrides = {}) => ({
  id: 7,
  name: 'Sofa Livia',
  slug: 'sofa-livia',
  image: '/uploads/livia.jpg',
  price: 12000000,
  finalPrice: 9900000,
  promotion: { name: 'Mua he', discountType: 'percentage', discountValue: 10 },
  stock: 4,
  category: { name: 'Sofa', slug: 'sofa' },
  averageRating: 4.8,
  reviewCount: 13,
  reason: 'Phu hop phong khach hien dai.',
  ...overrides
});

describe('aiAdvisorService', () => {
  it('sends only the approved message/context payload and forwards AbortSignal', async () => {
    const service = await loadService();
    const signal = new AbortController().signal;
    const input = { message: '  Tim sofa  ', context: { currentProductId: 12, ignored: 'x' }, signal };
    const snapshot = structuredClone({ message: input.message, context: input.context });
    apiClientSpy.mockResolvedValue({ answer: 'Day la goi y.', recommendations: [recommendation()] });

    const result = await service.sendAiAdvisorMessage(input);

    expect(apiClientSpy).toHaveBeenCalledWith('/ai-advisor/chat', {
      method: 'POST',
      body: JSON.stringify({ message: '  Tim sofa  ', context: { currentProductId: 12 } }),
      signal
    });
    expect(result).toEqual({ answer: 'Day la goi y.', recommendations: [recommendation()] });
    expect({ message: input.message, context: input.context }).toEqual(snapshot);
  });

  it('rejects malformed or legacy success payloads instead of inventing product data', async () => {
    const service = await loadService();
    apiClientSpy.mockResolvedValue({ answer: 'Legacy', recommendations: [], meta: { source: 'provider' } });

    await expect(service.sendAiAdvisorMessage({ message: 'Sofa' })).rejects.toMatchObject({
      code: 'AI_ADVISOR_RESPONSE_INVALID',
      status: 0
    });

    apiClientSpy.mockResolvedValue({ answer: 'Day la goi y.', recommendations: Array.from({ length: 6 }, (_, index) => recommendation({ id: index + 1 })) });
    await expect(service.sendAiAdvisorMessage({ message: 'Sofa' })).rejects.toMatchObject({ code: 'AI_ADVISOR_RESPONSE_INVALID' });
  });

  it('normalizes 400, 429, 500 and network errors without retaining raw response data', async () => {
    const service = await loadService();
    const scenarios = [
      [{ status: 400, message: 'raw validation data', data: { message: 'secret' } }, 'AI_ADVISOR_REQUEST_INVALID', 400, null],
      [{ status: 429, retryAfterSeconds: 12, message: 'raw limiter data', data: { ip: '127.0.0.1' } }, 'AI_ADVISOR_RATE_LIMITED', 429, 12],
      [{ status: 500, message: 'raw server data', data: { prompt: 'secret' } }, 'AI_ADVISOR_UNAVAILABLE', 500, null],
      [{ code: 'NETWORK_ERROR', message: 'raw network data', data: { key: 'secret' } }, 'AI_ADVISOR_NETWORK_ERROR', 0, null]
    ];

    for (const [source, code, status, retryAfterSeconds] of scenarios) {
      apiClientSpy.mockRejectedValueOnce(source);
      await expect(service.sendAiAdvisorMessage({ message: 'Sofa' })).rejects.toMatchObject({ code, status, retryAfterSeconds });
    }
  });

  it('parses Retry-After seconds and HTTP dates with a safe 60 second fallback and 300 second cap', async () => {
    const { parseAiAdvisorRetryAfter } = await loadService();
    const now = Date.parse('2026-01-01T00:00:00.000Z');

    expect(parseAiAdvisorRetryAfter('12', now)).toBe(12);
    expect(parseAiAdvisorRetryAfter('Thu, 01 Jan 2026 00:00:20 GMT', now)).toBe(20);
    expect(parseAiAdvisorRetryAfter('not-a-date', now)).toBe(60);
    expect(parseAiAdvisorRetryAfter('9999', now)).toBe(300);
  });
});
