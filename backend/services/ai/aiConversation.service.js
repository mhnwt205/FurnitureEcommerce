import { randomBytes } from 'node:crypto';
import { AI_CONVERSATION_ID_PATTERN } from './aiContracts.js';

const clone = (value) => structuredClone(value);
export const emptyAiConversationProfile = () => ({ productType: null, room: null, budgetMin: null, budgetMax: null, household: [], style: null, materials: [], colors: [] });
const cleanTurn = (value, maxTurnChars) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxTurnChars);
const dedupe = (values) => [...new Set(values ?? [])];

export const mergeAiConversationProfile = (stored, patch = {}) => {
  const profile = { ...emptyAiConversationProfile(), ...(stored ?? {}) };
  const explicit = new Set(patch.explicitFields ?? Object.keys(patch));
  for (const key of ['productType', 'room', 'budgetMin', 'budgetMax', 'style']) if (explicit.has(key) && Object.hasOwn(patch, key)) profile[key] = patch[key];
  for (const key of ['household', 'materials', 'colors']) if (explicit.has(key) && Array.isArray(patch[key])) profile[key] = dedupe(patch[key]);
  profile.household = dedupe([...profile.household, ...(patch.householdAdd ?? [])]).filter((item) => !(patch.householdRemove ?? []).includes(item));
  for (const key of ['materials', 'colors']) profile[key] = dedupe(profile[key]).filter((item) => !(patch[`${key}Remove`] ?? []).includes(item));
  if (profile.budgetMin !== null && profile.budgetMax !== null && profile.budgetMin > profile.budgetMax) profile.budgetMin = null;
  return profile;
};

const matches = (text, pattern) => pattern.test(text);
const budget = (text) => {
  const match = text.match(/(?:dưới|tối đa|không quá|đến)\s*(\d+(?:[.,]\d+)?)\s*(tr|triệu|m|000\.000)?/i) ?? text.match(/\b(\d+(?:[.,]\d+)?)\s*(tr|triệu)\b/i);
  if (!match) return undefined;
  const raw = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(raw) || raw <= 0) return undefined;
  return Math.round((match[2] ? raw * 1_000_000 : raw));
};
export const extractAiCurrentTurnIntent = (message) => {
  const text = String(message ?? '').toLocaleLowerCase(); const patch = { explicitFields: [] };
  const productTypes = [['chair', /ghế/], ['sofa', /sofa/], ['table', /bàn/], ['bed', /giường/], ['cabinet', /tủ/], ['lamp', /đèn/]];
  const rooms = [['dining_room', /phòng ăn/], ['living_room', /phòng khách/], ['bedroom', /phòng ngủ/], ['office', /văn phòng/], ['cafe', /quán c[aá]f[eé]/], ['apartment', /chung cư|căn hộ/]];
  const latestMatch = (values) => values.map(([value, pattern]) => { const found = text.match(pattern); return { value, index: found ? text.lastIndexOf(found[0]) : -1 }; }).filter(({ index }) => index >= 0).sort((left, right) => right.index - left.index)[0]?.value;
  const type = latestMatch(productTypes); const room = latestMatch(rooms);
  if (type) { patch.productType = type; patch.explicitFields.push('productType'); }
  if (room) { patch.room = room; patch.explicitFields.push('room'); }
  const max = budget(text); if (max !== undefined) { patch.budgetMax = max; patch.explicitFields.push('budgetMax'); }
  const household = [['children', /trẻ em|trẻ nhỏ|em bé/], ['pets', /thú cưng/], ['older_adults', /người lớn tuổi/], ['large_family', /gia đình đông/]].filter(([, p]) => matches(text, p)).map(([v]) => v);
  if (household.length) { patch.householdAdd = household; patch.explicitFields.push('household'); }
  const styles = [['modern', /hiện đại/], ['minimalist', /tối giản/], ['scandinavian', /bắc âu/], ['classic', /cổ điển/], ['industrial', /industrial/]]; const style = styles.find(([, p]) => matches(text, p))?.[0];
  if (style) { patch.style = style; patch.explicitFields.push('style'); }
  return patch;
};

export const createInMemoryAiConversationStore = ({ ttlMs, maxEntries, maxRecentTurns, maxTotalChars, maxTurnChars, now = Date.now, idFactory = () => randomBytes(16).toString('hex') } = {}) => {
  const entries = new Map();
  const expiry = (time) => time + ttlMs;
  const trimTurns = (turns) => { let result = turns.map((turn) => cleanTurn(turn, maxTurnChars)).filter(Boolean).slice(-maxRecentTurns); while (result.join('').length > maxTotalChars) result.shift(); return result; };
  const cleanupExpired = () => { const time = now(); for (const [id, state] of entries) if (state.expiresAt <= time) entries.delete(id); };
  const get = (id) => { cleanupExpired(); const state = entries.get(id); return state ? clone(state) : null; };
  const create = () => { cleanupExpired(); if (entries.size >= maxEntries) entries.delete(entries.keys().next().value); const time = now(); let id = idFactory(); while (!AI_CONVERSATION_ID_PATTERN.test(id) || entries.has(id)) id = idFactory(); const state = { conversationId: id, profile: emptyAiConversationProfile(), recentUserTurns: [], createdAt: time, updatedAt: time, expiresAt: expiry(time) }; entries.set(id, state); return clone(state); };
  const update = (id, updater) => { const current = get(id); if (!current) return null; const next = updater(clone(current)); if (!next) return null; const time = now(); const state = { ...next, conversationId: id, recentUserTurns: trimTurns(next.recentUserTurns ?? []), updatedAt: time, expiresAt: expiry(time) }; entries.set(id, state); return clone(state); };
  return Object.freeze({ get, create, update, delete: (id) => entries.delete(id), cleanupExpired, size: () => { cleanupExpired(); return entries.size; } });
};
