import crypto from 'node:crypto';
import { prepareAdvisorCandidates, completeAdvisorRecommendation, resolveAdvisorIntent } from '../recommendation/advisor.service.js';
import { mergeConversationIntent } from './merge.service.js';
import { inferConversationOperations, isConversationResetMessage } from './reset.service.js';
import { recognizeConversationOperations } from './operation.service.js';
import { AI_SESSION_MAX_TURNS, AI_SESSION_RECENT_TURNS } from './conversation.types.js';
import { aiConversationSessionStore } from './session.store.js';
import { orchestrateClarificationState } from '../clarification/clarification.service.js';
import { buildCandidateSummary } from '../candidates/summary.service.js';
import { buildClarificationQuestion } from '../clarification/question.service.js';
import { aiAdvisorConversationResponseSchema } from '../clarification/clarification.schema.js';
import { extractComparativeSignal } from '../comparative/extraction.service.js';
import { resolveComparativeReference } from '../comparative/reference.service.js';
import { buildRelaxationProposal } from '../relaxation/policy.service.js';
import { recognizeRelaxationConsent } from '../relaxation/consent.service.js';
import { applyRelaxationProposal } from '../relaxation/application.service.js';
import { aiTelemetry } from '../telemetry/telemetry.service.js';

const clone = (value) => structuredClone(value);
const ownerMatches = (session, ownerUserId) => session.ownerUserId === ownerUserId;
const truncate = (text, length = 160) => String(text).slice(0, length);

const recommendationContext = (recommendations = []) => {
  const prices = recommendations.map((item) => Number(item.finalPrice ?? item.price)).filter(Number.isFinite);
  return { productIds: recommendations.map((item) => item.id).filter(Number.isInteger).slice(0, 5), productPrices: recommendations.map((item) => ({ productId: item.id, effectivePrice: Number(item.finalPrice ?? item.price) })).filter((item) => Number.isInteger(item.productId) && Number.isInteger(item.effectivePrice)).slice(0, 5), minPrice: prices.length ? Math.min(...prices) : null, maxPrice: prices.length ? Math.max(...prices) : null, category: recommendations[0]?.category || null, dominantColors: [...new Set(recommendations.map((item) => item.color).filter(Boolean))].slice(0, 5), dominantSize: null };
};

const toResponse = (result, session, isNew) => aiAdvisorConversationResponseSchema.parse({
  answer: String(result.answer || ''),
  recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
  ...(result.type ? { type: result.type } : {}),
  ...(result.question ? { question: result.question } : {}),
  ...(typeof result.canRefine === 'boolean' ? { canRefine: result.canRefine } : {}),
  ...(result.terminal === true ? { terminal: true } : {}),
  ...(result.relaxation ? { relaxation: result.relaxation } : {}),
  sessionId: session.id,
  session: { isNew, turnCount: session.turnCount, expiresAt: session.expiresAt.toISOString() }
});

const emptyRecommendation = () => ({ type: 'recommendation', answer: 'Phiên tư vấn đã thay đổi. Vui lòng gửi lại yêu cầu của bạn.', recommendations: [], canRefine: false });
const terminalAnswer = (reasons = []) => {
  if (reasons.includes('no_category_match')) return 'Hiện mình chưa tìm thấy sản phẩm đúng danh mục bạn yêu cầu. Bạn có thể bắt đầu một yêu cầu mới với loại sản phẩm khác.';
  if (reasons.includes('no_budget_match')) return 'Hiện chưa có sản phẩm phù hợp với ngân sách này. Bạn có thể bắt đầu một yêu cầu mới khi muốn thay đổi ngân sách.';
  if (reasons.includes('no_attribute_match')) return 'Hiện chưa có sản phẩm khớp toàn bộ tiêu chí. Bạn có thể bắt đầu một yêu cầu mới với tiêu chí khác.';
  if (reasons.includes('excluded_only')) return 'Hiện chưa có sản phẩm phù hợp sau khi loại các tiêu chí bạn không muốn. Bạn có thể bắt đầu một yêu cầu mới nếu muốn bỏ bớt điều kiện loại trừ.';
  if (reasons.includes('out_of_stock_only')) return 'Các sản phẩm phù hợp hiện đang hết hàng. Bạn có thể bắt đầu một yêu cầu mới nếu muốn xem cả sản phẩm tạm hết hàng hoặc thay đổi tiêu chí.';
  return 'Hiện chưa có sản phẩm phù hợp. Bạn có thể bắt đầu một yêu cầu mới với tiêu chí khác.';
};
const intentFingerprint = (session) => JSON.stringify({ intent: session.intent, excluded: session.excluded, currentProductId: session.currentProductId });

const operationForMerge = (message, intent) => {
  const legacy = inferConversationOperations(message, intent);
  const recognized = recognizeConversationOperations(message);
  const operations = Object.fromEntries(Object.keys(recognized).map((field) => {
    if (recognized[field] !== 'retain') return [field, recognized[field]];
    if (legacy[field] && legacy[field] !== 'retain') return [field, legacy[field]];
    if (['category', 'room', 'style', 'size'].includes(field) && intent[field] !== null && intent[field] !== undefined) return [field, 'replace'];
    return [field, 'retain'];
  }));
  const normalized = String(message).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const explicitRequired = /\b(chi|bat buoc|nhat dinh|phai)\b/.test(normalized);
  const strengths = {};
  if (explicitRequired) {
    if (intent.colors?.length) strengths.colors = 'required';
    if (intent.materials?.length) strengths.materials = 'required';
    if (intent.room) strengths.room = 'required';
    if (intent.style) strengths.style = 'required';
    if (intent.size) strengths.size = 'required';
  }
  return { ...operations, strengths };
};

const applyExclusions = (session, operations, incoming) => {
  for (const field of ['colors', 'materials']) {
    const values = Array.isArray(incoming[field]) ? incoming[field] : [];
    if (operations[field] === 'exclude') {
      session.excluded[field] = [...new Set([...session.excluded[field], ...values])].slice(0, 5);
      session.intent[field] = session.intent[field].filter((value) => !session.excluded[field].includes(value));
    } else if ((operations[field] === 'replace' || operations[field] === 'append') && values.length) {
      session.excluded[field] = session.excluded[field].filter((value) => !values.includes(value));
    }
  }
};

const genericNoResult = () => ({
  action: 'no_result_refinement',
  field: 'relaxation',
  reasonCode: 'no_candidate',
  question: buildClarificationQuestion('relaxation')
});
const emptyComparativeState = () => ({ type: 'none', reference: { source: 'none', productId: null, productIds: [], ordinal: null, category: null, minPrice: null, maxPrice: null, colors: [], materials: [], style: null, size: null }, confidence: 1, ambiguous: false, missingReference: false, updatedAtTurn: 0 });

export const processAiConversation = async ({ message, sessionId, clientMessageId, resetSession = false, context = {}, ownerUserId = null, requestId = null, telemetry = aiTelemetry, store = aiConversationSessionStore, resolveIntentFn = resolveAdvisorIntent, prepareCandidatesFn = prepareAdvisorCandidates, completeRecommendationFn = completeAdvisorRecommendation, buildSummaryFn = buildCandidateSummary, orchestrateClarificationFn = orchestrateClarificationState, buildQuestionFn = buildClarificationQuestion, extractComparativeFn = extractComparativeSignal, resolveComparativeFn = resolveComparativeReference, advisorPipelineFn = null, advisorResponseFn = null }) => {
  const startedAt = process.hrtime.bigint();
  const safeRequestId = typeof requestId === 'string' && /^[0-9a-f-]{36}$/i.test(requestId) ? requestId : null;
  const safeUserId = Number.isInteger(ownerUserId) && ownerUserId > 0 ? ownerUserId : null;
  const ownerType = safeUserId === null ? 'guest' : 'authenticated';
  const duration = () => Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
  const emit = (eventName, session = null, fields = {}) => telemetry.emit(eventName, { requestId: safeRequestId, sessionId: session?.id || null, userId: safeUserId, ownerType, ...fields });
  let executionStarted = false;
  const finish = (response, session, { stage2DurationMs = null, outcome = null } = {}) => {
    const resolvedOutcome = outcome || (response.type === 'recommendation' ? 'recommendation' : response.type === 'clarification' ? 'clarification' : response.type === 'relaxation_proposal' ? 'relaxation_proposal' : response.type === 'no_result' ? 'terminal_no_result' : 'failed');
    if (response.type === 'recommendation') emit('ai_recommendation_returned', session, { durationMs: stage2DurationMs, outcome: resolvedOutcome, metadata: { recommendationCount: response.recommendations.length } });
    if (response.type === 'clarification') emit('ai_clarification_returned', session, { outcome: resolvedOutcome, metadata: { clarificationField: response.question?.field || null } });
    if (response.type === 'relaxation_proposal') emit('ai_relaxation_proposed', session, { outcome: resolvedOutcome, metadata: { reasonCode: response.relaxation?.reasonCode || null } });
    if (response.type === 'no_result') emit('ai_terminal_no_result', session, { outcome: resolvedOutcome, metadata: {} });
    emit('ai_request_completed', session, { durationMs: duration(), outcome: resolvedOutcome, metadata: { recommendationCount: response.recommendations.length } });
    return response;
  };
  const suppliedId = store.isValidId(sessionId) ? sessionId : null;
  const queueId = suppliedId || `new:${crypto.randomUUID()}`;
  if (suppliedId && clientMessageId && resetSession) {
    const receipt = store.getResetReceipt(ownerUserId, suppliedId, clientMessageId);
    if (receipt) { emit('ai_idempotency_cache_hit', null, { metadata: {} }); return receipt; }
  }
  const execution = store.enqueue(queueId, async () => {
    if (suppliedId && clientMessageId && resetSession) {
      const receipt = store.getResetReceipt(ownerUserId, suppliedId, clientMessageId);
      if (receipt) { emit('ai_idempotency_cache_hit', null, { metadata: {} }); return receipt; }
    }
    let session = suppliedId ? store.get(suppliedId) : null;
    let isNew = !session || !ownerMatches(session, ownerUserId);
    if (!session || !ownerMatches(session, ownerUserId)) { session = store.create(ownerUserId); emit('ai_session_created', session, { metadata: { sessionAction: 'created' } }); }
    else emit('ai_session_reused', session, { metadata: { sessionAction: 'reused' } });
    const shouldRotate = resetSession || isConversationResetMessage(message) || session.turnCount >= AI_SESSION_MAX_TURNS;
    if (shouldRotate) {
      const oldSessionId = session.id;
      store.delete(oldSessionId);
      session = store.create(ownerUserId);
      isNew = true;
      if (suppliedId !== oldSessionId) session.currentProductId = null;
      emit('ai_session_reset', session, { metadata: { sessionAction: 'reset' } });
    }
    if (clientMessageId && session.processedMessages.has(clientMessageId)) { emit('ai_idempotency_cache_hit', session, { metadata: {} }); return clone(session.processedMessages.get(clientMessageId)); }

    executionStarted = true;
    emit('ai_request_started', session, { metadata: { messageLength: String(message).length } });

    const storedSession = session;
    const workingSession = store.cloneSessionForWork(storedSession);
    let acceptedProposal = false;
    const pending = workingSession.relaxationState?.pendingProposal;
    const pendingIsExpired = pending && workingSession.turnCount >= pending.createdAtTurn + pending.expiresAfterTurns;
    if (pendingIsExpired) {
      workingSession.relaxationState = { ...workingSession.relaxationState, pendingProposal: null };
    }
    if (pending && !pendingIsExpired) {
      const consent = recognizeRelaxationConsent(message, pending);
      if (consent.action === 'reject' || consent.action === 'ambiguous') {
        if (consent.action === 'reject') workingSession.relaxationState = { ...workingSession.relaxationState, pendingProposal: null, rejectedProposalIds: [...workingSession.relaxationState.rejectedProposalIds, pending.proposalId].slice(-5) };
        workingSession.turnCount += 1;
        const result = consent.action === 'reject'
          ? { type: 'no_result', answer: 'Mình sẽ giữ nguyên các tiêu chí hiện tại.', recommendations: [], terminal: true }
          : { type: 'relaxation_proposal', answer: 'Bạn hãy chọn rõ một phương án nới điều kiện.', recommendations: [], relaxation: { proposalId: pending.proposalId, reasonCode: pending.reasonCode, options: pending.options.map((option) => ({ id: option.id, label: option.description })) } };
        store.prepareSessionForCommit(workingSession); const response = toResponse(result, workingSession, isNew); if (clientMessageId) workingSession.processedMessages.set(clientMessageId, clone(response));
        if (!store.commitSession({ expectedSession: storedSession, nextSession: workingSession })) { emit('ai_session_stale_commit_prevented', storedSession, { metadata: {} }); return finish(toResponse(emptyRecommendation(), store.create(ownerUserId), true), null, { outcome: 'failed' }); }
        if (consent.action === 'reject') emit('ai_relaxation_rejected', workingSession, { outcome: 'rejected_relaxation', metadata: {} });
        return finish(response, workingSession, { outcome: consent.action === 'reject' ? 'rejected_relaxation' : 'relaxation_proposal' });
      }
      const applied = applyRelaxationProposal(workingSession, pending, consent.optionId);
      Object.assign(workingSession, applied);
      acceptedProposal = true;
    }
    const priorFingerprint = intentFingerprint(storedSession);
    const turn = await resolveIntentFn({ message, context, telemetry, telemetryContext: { requestId: safeRequestId, sessionId: storedSession.id, userId: safeUserId, ownerType } });
    const operations = operationForMerge(message, turn.intent);
    const mergeOperations = { ...operations, colors: operations.colors === 'exclude' ? 'retain' : operations.colors, materials: operations.materials === 'exclude' ? 'retain' : operations.materials };
    const merged = mergeConversationIntent({ previous: workingSession.intent, previousFieldMeta: workingSession.fieldMeta, incoming: turn.intent, source: turn.source === 'gemini' ? 'gemini_nlu' : 'legacy_parser', turnCount: workingSession.turnCount + 1, operations: mergeOperations });
    workingSession.intent = merged.intent;
    workingSession.fieldMeta = { ...workingSession.fieldMeta, ...merged.fieldMeta };
    for (const field of merged.clearedFields) delete workingSession.fieldMeta[field];
    applyExclusions(workingSession, operations, turn.intent);
    workingSession.currentProductId = Number.isInteger(Number(context.currentProductId)) ? Number(context.currentProductId) : workingSession.currentProductId;
    const comparativeSignal = extractComparativeFn(message);
    if (comparativeSignal.type !== 'none') {
      const comparative = resolveComparativeFn({ signal: comparativeSignal, lastRecommendationContext: workingSession.lastRecommendationContext, currentProductId: context.currentProductId, message });
      workingSession.comparativeState = { ...comparative, updatedAtTurn: workingSession.turnCount + 1 };
    } else if (operations.category === 'replace' && turn.intent.category) {
      workingSession.comparativeState = emptyComparativeState();
    }
    const meaningfulIntentChange = priorFingerprint !== intentFingerprint(workingSession);
    if (workingSession.clarificationState.terminal && meaningfulIntentChange) workingSession.clarificationState = { consecutiveCount: 0, lastAskedField: null, askedFields: [], lastReasonCode: null, terminal: false, terminalReasonCode: null };
    const advisorInput = { message, context, resolvedIntent: { ...turn, intent: workingSession.intent, source: 'merged' }, excluded: workingSession.excluded, fieldMeta: workingSession.fieldMeta, operations, comparativeState: workingSession.comparativeState, lastRecommendationContext: workingSession.lastRecommendationContext };
    const usesLegacyResponseAdapter = Boolean(advisorResponseFn && !advisorPipelineFn);
    const stage1StartedAt = process.hrtime.bigint();
    const artifacts = advisorPipelineFn ? await advisorPipelineFn(advisorInput) : usesLegacyResponseAdapter ? { recommendation: await advisorResponseFn(advisorInput), retrieval: { candidates: [], metadata: { primaryCount: 0, retrievedCount: 0, fallbackUsed: false, fallbackReason: 'none' } }, eligibility: { candidates: [], diagnostics: { beforeBudgetCount: 0, afterBudgetCount: 0, beforeAttributeCount: 0, afterAttributeCount: 0 } } } : await prepareCandidatesFn({ ...advisorInput, telemetry, telemetryContext: { requestId: safeRequestId, sessionId: storedSession.id, userId: safeUserId, ownerType } });
    emit('ai_candidate_pipeline_completed', storedSession, { durationMs: Number((process.hrtime.bigint() - stage1StartedAt) / 1_000_000n), metadata: { primaryCount: artifacts.retrieval.metadata.primaryCount, retrievedCount: artifacts.retrieval.metadata.retrievedCount, candidateCount: artifacts.eligibility.candidates.length, fallbackUsed: artifacts.retrieval.metadata.fallbackUsed, fallbackReason: artifacts.retrieval.metadata.fallbackReason } });
    if (!store.isCurrent(storedSession)) { emit('ai_session_stale_commit_prevented', storedSession, { metadata: {} }); return finish(toResponse(emptyRecommendation(), store.create(ownerUserId), true), null, { outcome: 'failed' }); }
    let clarification;
    let summary;
    try {
      if (usesLegacyResponseAdapter) throw new Error('legacy response adapter does not provide candidate artifacts');
      summary = buildSummaryFn({ mergedIntent: workingSession.intent, retrievalMetadata: artifacts.retrieval.metadata, retrievedCandidates: artifacts.retrieval.candidates, eligibleCandidates: artifacts.eligibility.candidates, filterDiagnostics: artifacts.eligibility.diagnostics, classification: artifacts.stageContext?.classification || null, comparativePolicy: artifacts.stageContext?.comparativePolicy || null });
      clarification = orchestrateClarificationFn({ mergedIntent: workingSession.intent, clarificationState: workingSession.clarificationState, candidateCount: summary.eligibleCount, noResultReasons: summary.noResultReasons });
    } catch (error) {
      clarification = { decision: usesLegacyResponseAdapter || artifacts.eligibility.candidates.length ? { action: 'recommend', field: null, reasonCode: 'sufficient_information' } : genericNoResult(), nextClarificationState: usesLegacyResponseAdapter ? { consecutiveCount: 0, lastAskedField: null, askedFields: [], lastReasonCode: null, terminal: false, terminalReasonCode: null } : workingSession.clarificationState };
    }
    const isNoResult = clarification.decision.action === 'no_result_refinement';
    const cappedNoResult = workingSession.clarificationState.consecutiveCount >= 2 && isNoResult && (summary?.eligibleCount ?? 0) === 0;
    const shouldClarify = clarification.decision.action === 'clarify' || isNoResult;
    let result;
    let stage2DurationMs = null;
    if (cappedNoResult || (workingSession.clarificationState.terminal && !meaningfulIntentChange && isNoResult)) {
      workingSession.clarificationState = { ...workingSession.clarificationState, terminal: true, terminalReasonCode: clarification.decision.reasonCode };
      result = { type: 'no_result', answer: terminalAnswer(summary?.noResultReasons || []), recommendations: [], terminal: true };
    } else if (shouldClarify) {
      const question = (() => { try { return buildQuestionFn(clarification.decision.field || 'relaxation', clarification.decision.reasonCode, summary?.noResultReasons || []); } catch { return buildClarificationQuestion(clarification.decision.field || 'relaxation', clarification.decision.reasonCode, summary?.noResultReasons || []); } })();
      result = { type: 'clarification', answer: question.text, recommendations: [], question: { field: clarification.decision.field || 'relaxation', ...question } };
      workingSession.clarificationState = clarification.nextClarificationState;
    } else {
      const stage2StartedAt = process.hrtime.bigint();
      const recommendation = artifacts.recommendation || await completeRecommendationFn(artifacts);
      stage2DurationMs = Number((process.hrtime.bigint() - stage2StartedAt) / 1_000_000n);
      result = { ...recommendation, type: 'recommendation', canRefine: clarification.decision.action === 'recommend_and_refine' };
    }
    if (result.type === 'clarification' && isNoResult && summary?.noResultReasons?.[0]) {
      const proposal = buildRelaxationProposal({ reasonCode: summary.noResultReasons[0], session: workingSession });
      if (proposal && !workingSession.relaxationState?.rejectedProposalIds?.includes(proposal.proposalId)) {
        workingSession.relaxationState = { ...workingSession.relaxationState, pendingProposal: proposal };
        result = { type: 'relaxation_proposal', answer: `Hiện chưa có sản phẩm phù hợp. Bạn có thể chọn một phương án nới điều kiện.`, recommendations: [], relaxation: { proposalId: proposal.proposalId, reasonCode: proposal.reasonCode, options: proposal.options.map(option => ({ id: option.id, label: option.description })) } };
      }
    }
    if (!store.isCurrent(storedSession)) { emit('ai_session_stale_commit_prevented', storedSession, { metadata: {} }); return finish(toResponse(emptyRecommendation(), store.create(ownerUserId), true), null, { outcome: 'failed' }); }
    workingSession.turnCount += 1;
    if (result.type === 'recommendation') workingSession.clarificationState = clarification.nextClarificationState;
    if (result.recommendations.length) workingSession.lastRecommendationContext = recommendationContext(result.recommendations);
    workingSession.recentTurns = [...workingSession.recentTurns, { role: 'user', summary: truncate(message) }, { role: 'assistant', summary: truncate(result.answer) }].slice(-AI_SESSION_RECENT_TURNS);
    store.prepareSessionForCommit(workingSession);
    const response = toResponse(result, workingSession, isNew);
    if (clientMessageId) workingSession.processedMessages.set(clientMessageId, clone(response));
    while (workingSession.processedMessages.size > AI_SESSION_MAX_TURNS) workingSession.processedMessages.delete(workingSession.processedMessages.keys().next().value);
    if (!store.commitSession({ expectedSession: storedSession, nextSession: workingSession })) { emit('ai_session_stale_commit_prevented', storedSession, { metadata: {} }); return finish(toResponse(emptyRecommendation(), store.create(ownerUserId), true), null, { outcome: 'failed' }); }
    if (acceptedProposal) emit('ai_relaxation_accepted', workingSession, { metadata: {} });
    if (shouldRotate && suppliedId && clientMessageId) store.setResetReceipt(ownerUserId, suppliedId, clientMessageId, response);
    return finish(response, workingSession, { stage2DurationMs });
  });
  return execution.catch((error) => { if (executionStarted) emit('ai_request_failed', null, { durationMs: duration(), outcome: 'failed', metadata: { errorCode: 'unknown_error' } }); throw error; });
};
