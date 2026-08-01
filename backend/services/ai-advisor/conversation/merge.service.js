import { createEmptyIntent } from './conversation.types.js';

const FIELD_PRIORITY = { explicit_user: 4, gemini_nlu: 3, legacy_parser: 2, derived_context: 1 };
const dedupe = (values) => [...new Set(values)].slice(0, 5);
const hasBudget = (budget) => budget.min !== null || budget.max !== null;

export const mergeConversationIntent = ({ previous = createEmptyIntent(), previousFieldMeta = {}, incoming, source = 'legacy_parser', turnCount, operations = {} }) => {
  const next = structuredClone(previous);
  const fieldMeta = {};
  const clearedFields = [];
  const strengthFor = (field) => operations.strengths?.[field] || 'preferred';
  const canOverwrite = (field) => FIELD_PRIORITY[source] >= FIELD_PRIORITY[previousFieldMeta[field]?.source || 'derived_context'];
  const setScalar = (field) => {
    if (operations[field] === 'clear' && canOverwrite(field)) { next[field] = null; clearedFields.push(field); }
    else if (operations[field] !== 'retain' && incoming[field] !== null && incoming[field] !== undefined && canOverwrite(field)) next[field] = incoming[field];
    else return;
    if (operations[field] !== 'clear') fieldMeta[field] = { source, confidence: incoming.confidence, updatedAtTurn: turnCount, strength: strengthFor(field) };
  };
  ['category', 'room', 'style', 'size', 'sortPreference'].forEach(setScalar);
  if ((incoming.stockRequired === true || operations.stockRequired === 'clear') && canOverwrite('stockRequired')) {
    next.stockRequired = operations.stockRequired === 'clear' ? false : true;
    if (operations.stockRequired === 'clear') clearedFields.push('stockRequired');
    else fieldMeta.stockRequired = { source, confidence: incoming.confidence, updatedAtTurn: turnCount, strength: 'required' };
  }
  if (operations.budget === 'clear' && canOverwrite('budget')) { next.budget = { min: null, max: null, currency: 'VND' }; clearedFields.push('budget'); }
  else if (hasBudget(incoming.budget) && operations.budget !== 'retain' && canOverwrite('budget')) { next.budget = incoming.budget; fieldMeta.budget = { source, confidence: incoming.confidence, updatedAtTurn: turnCount, strength: 'required' }; }
  for (const field of ['colors', 'materials']) {
    const operation = operations[field] || (incoming[field].length ? 'replace' : 'retain');
    if (operation !== 'retain' && canOverwrite(field)) {
      if (operation === 'clear') { next[field] = []; clearedFields.push(field); }
      if (operation === 'replace') next[field] = dedupe(incoming[field]);
      if (operation === 'append') next[field] = dedupe([...next[field], ...incoming[field]]);
      if (operation !== 'clear') fieldMeta[field] = { source, confidence: incoming.confidence, updatedAtTurn: turnCount, strength: strengthFor(field) };
    }
  }
  next.intentType = incoming.intentType === 'unknown' ? next.intentType : incoming.intentType;
  next.confidence = incoming.confidence;
  next.missingImportantFields = dedupe(incoming.missingImportantFields);
  next.ambiguousFields = dedupe(incoming.ambiguousFields);
  return { intent: next, fieldMeta, clearedFields };
};

export const updateExcluded = ({ excluded, field, values, operation = 'exclude' }) => {
  const next = structuredClone(excluded);
  if (!Object.hasOwn(next, field)) return next;
  next[field] = operation === 'clear' ? [] : dedupe([...next[field], ...values]);
  return next;
};

export { FIELD_PRIORITY };
export const recordClarification = (state, { field, reasonCode }) => ({ consecutiveCount: Math.min(2, Math.max(0, state.consecutiveCount) + 1), lastAskedField: field, askedFields: [...new Set([...state.askedFields, field])].slice(0, 9), lastReasonCode: reasonCode, terminal: false, terminalReasonCode: null });
export const resetClarificationState = () => ({ consecutiveCount: 0, lastAskedField: null, askedFields: [], lastReasonCode: null, terminal: false, terminalReasonCode: null });
