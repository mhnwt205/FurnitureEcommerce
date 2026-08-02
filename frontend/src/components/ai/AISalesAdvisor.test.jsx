import { describe, expect, it } from 'vitest';
import {
  appendBoundedAdvisorMessage,
  canSendAdvisorMessage,
  formatAdvisorCooldown,
  getAdvisorProductHref,
  getAdvisorProductImage,
  isAdvisorAbortError
} from './aiAdvisorUi.js';

describe('AISalesAdvisor pure UI behavior', () => {
  it('keeps bounded in-memory history and does not mutate prior messages', () => {
    const existing = Array.from({ length: 30 }, (_, index) => ({ id: index, role: 'user', text: String(index) }));
    const result = appendBoundedAdvisorMessage(existing, { id: 30, role: 'assistant', text: 'Moi' });

    expect(result).toHaveLength(30);
    expect(result[0].id).toBe(1);
    expect(result.at(-1)).toEqual({ id: 30, role: 'assistant', text: 'Moi' });
    expect(existing[0].id).toBe(0);
  });

  it('prevents empty, loading and cooldown submissions without relying on client-side product logic', () => {
    expect(canSendAdvisorMessage({ input: '   ', loading: false, cooldownUntil: 0, now: 1 })).toBe(false);
    expect(canSendAdvisorMessage({ input: 'Sofa', loading: true, cooldownUntil: 0, now: 1 })).toBe(false);
    expect(canSendAdvisorMessage({ input: 'Sofa', loading: false, cooldownUntil: 100, now: 1 })).toBe(false);
    expect(canSendAdvisorMessage({ input: 'Sofa', loading: false, cooldownUntil: 0, now: 1 })).toBe(true);
  });

  it('formats countdowns and treats only cancellation as a silent request outcome', () => {
    expect(formatAdvisorCooldown(135)).toBe('02:15');
    expect(formatAdvisorCooldown(0)).toBe('00:00');
    expect(isAdvisorAbortError({ code: 'REQUEST_ABORTED' })).toBe(true);
    expect(isAdvisorAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAdvisorAbortError({ code: 'NETWORK_ERROR' })).toBe(false);
  });

  it('uses backend order/data unchanged and handles nullable image or slug safely', () => {
    expect(getAdvisorProductHref({ id: 9, slug: 'sofa-livia' })).toBe('/products/9');
    expect(getAdvisorProductHref({ id: 9, slug: null })).toBe('/products/9');
    expect(getAdvisorProductImage({ image: null })).toBeNull();
    expect(getAdvisorProductImage({ image: '/uploads/sofa.jpg' })).toBe('/uploads/sofa.jpg');
  });
});
