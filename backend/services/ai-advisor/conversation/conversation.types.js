import crypto from 'node:crypto';

export const AI_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const AI_SESSION_MAX_TURNS = 30;
export const AI_SESSION_RECENT_TURNS = 4;
export const AI_SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createEmptyIntent = () => ({
  intentType: 'unknown', category: null, budget: { min: null, max: null, currency: 'VND' }, room: null, style: null,
  colors: [], materials: [], size: null, stockRequired: false, sortPreference: null, constraints: [], confidence: 0,
  missingImportantFields: [], ambiguousFields: []
});

export const createSession = ({ ownerUserId = null, now = new Date() } = {}) => ({
  id: crypto.randomUUID(), generation: crypto.randomUUID(), ownerUserId, createdAt: now, updatedAt: now, expiresAt: new Date(now.getTime() + AI_SESSION_TTL_MS),
  turnCount: 0, intent: createEmptyIntent(), fieldMeta: {}, excluded: { categories: [], colors: [], materials: [], styles: [] },
  lastRecommendationContext: { productIds: [], productPrices: [], minPrice: null, maxPrice: null, category: null, dominantColors: [], dominantSize: null },
  comparativeState: { type: 'none', reference: { source: 'none', productId: null, productIds: [], ordinal: null, category: null, minPrice: null, maxPrice: null, colors: [], materials: [], style: null, size: null }, confidence: 1, ambiguous: false, missingReference: false, updatedAtTurn: 0 },
  relaxationState: { pendingProposal: null, lastAppliedProposalId: null, rejectedProposalIds: [] },
  currentProductId: null, processedMessages: new Map(), recentTurns: [], clarificationState: { consecutiveCount: 0, lastAskedField: null, askedFields: [], lastReasonCode: null, terminal: false, terminalReasonCode: null }
});
