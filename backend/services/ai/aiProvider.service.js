import {
  AI_ERROR_CODE,
  AI_MAX_TIMEOUT_MS,
  AI_MIN_TIMEOUT_MS,
  AI_TOTAL_PROMPT_MAX_CHARS,
  AiContractError
} from './aiContracts.js';
import {
  parseAiProviderResponse,
  validateRecommendationAllowList
} from './aiValidation.js';

const GEMINI_GENERATE_CONTENT_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_PROVIDER_ATTEMPTS = 2;

class AttemptDeadlineExceeded extends Error {
  constructor() {
    super('AI provider attempt timed out');
    this.name = 'AttemptDeadlineExceeded';
  }
}

const PROVIDER_ERROR_CODE = Object.freeze({
  noApiKey: 'AI_PROVIDER_NO_API_KEY',
  configInvalid: 'AI_PROVIDER_CONFIG_INVALID',
  timeout: 'AI_PROVIDER_TIMEOUT',
  network: 'AI_PROVIDER_NETWORK_ERROR',
  dns: 'AI_PROVIDER_DNS_ERROR',
  tls: 'AI_PROVIDER_TLS_ERROR',
  aborted: 'AI_PROVIDER_ABORTED',
  requestInvalid: 'AI_PROVIDER_REQUEST_INVALID',
  auth: 'AI_PROVIDER_AUTH_ERROR',
  upstream: 'AI_PROVIDER_UPSTREAM_ERROR',
  unknown: 'AI_PROVIDER_UNKNOWN_ERROR',
  rateLimited: 'AI_PROVIDER_RATE_LIMITED',
  responseEmpty: 'AI_PROVIDER_RESPONSE_EMPTY',
  jsonInvalid: 'AI_PROVIDER_INVALID_RESPONSE'
});

const providerFailure = ({ code, retryable, attemptCount, status }) => Object.freeze({
  ok: false,
  error: Object.freeze({
    code,
    retryable,
    ...(Number.isInteger(status) ? { status } : {})
  }),
  provider: Object.freeze({ attemptCount, fallbackUsed: true })
});

const providerSuccess = (data, attemptCount) => Object.freeze({
  ok: true,
  data,
  provider: Object.freeze({ attemptCount, fallbackUsed: false })
});

const isTransientStatus = (status) => status === 429 || (status >= 500 && status <= 599);
const classifyNetworkError = (error, deadline, controller) => {
  if (error instanceof AttemptDeadlineExceeded || deadline.timedOut) return PROVIDER_ERROR_CODE.timeout;
  if (controller.signal.aborted) return PROVIDER_ERROR_CODE.aborted;
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(error?.code)) return PROVIDER_ERROR_CODE.dns;
  if (typeof error?.code === 'string' && (error.code.startsWith('ERR_TLS') || ['EPROTO', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED'].includes(error.code))) return PROVIDER_ERROR_CODE.tls;
  return PROVIDER_ERROR_CODE.network;
};

const stripOptionalJsonCodeFence = (text) => {
  const trimmed = text.trim();
  const match = trimmed.match(/^```json[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
  return match ? match[1].trim() : trimmed;
};

const extractGeminiText = (body) => {
  const parts = body?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return undefined;
  const part = parts.find((item) => typeof item?.text === 'string' && item.text.trim().length > 0);
  return part?.text;
};

const validateProviderInputs = ({ prompt, allowedCandidateIds, config, fetchImpl, parseResponse }) => {
  if (typeof prompt !== 'string' || prompt.length > AI_TOTAL_PROMPT_MAX_CHARS) {
    return PROVIDER_ERROR_CODE.configInvalid;
  }
  if (!config?.apiKey || typeof config.apiKey !== 'string' || !config.apiKey.trim()) {
    return PROVIDER_ERROR_CODE.noApiKey;
  }
  if (!config?.model || typeof config.model !== 'string' || !config.model.trim()) {
    return PROVIDER_ERROR_CODE.configInvalid;
  }
  if (
    !Number.isInteger(config.timeoutMs)
    || config.timeoutMs < (config.allowShortTimeout === true ? 1_000 : AI_MIN_TIMEOUT_MS)
    || config.timeoutMs > AI_MAX_TIMEOUT_MS
    || typeof fetchImpl !== 'function'
  ) {
    return PROVIDER_ERROR_CODE.configInvalid;
  }

  if (typeof parseResponse !== 'function') {
    try { validateRecommendationAllowList({ answer: 'allow-list validation', recommendations: [] }, allowedCandidateIds); } catch (error) { return error instanceof AiContractError ? error.code : PROVIDER_ERROR_CODE.configInvalid; }
  }
  return undefined;
};

const buildAiAdvisorResponseSchema = (allowedCandidateIds) => ({
  type: 'object',
  properties: {
    answer: { type: 'string', description: 'A concise Vietnamese shopping answer.' },
    recommendations: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', enum: allowedCandidateIds },
          reason: { type: 'string', description: 'A concise evidence-based reason.' }
        },
        required: ['id', 'reason'],
        additionalProperties: false,
        propertyOrdering: ['id', 'reason']
      }
    }
  },
  required: ['answer', 'recommendations'],
  additionalProperties: false,
  propertyOrdering: ['answer', 'recommendations']
});

const buildGeminiRequest = ({ prompt, config, responseSchema }) => ({
  url: `${GEMINI_GENERATE_CONTENT_URL}/${encodeURIComponent(config.model.trim())}:generateContent`,
  options: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseFormat: {
          text: {
            // Gemini's v1beta TextResponseFormat is a protobuf enum. The
            // endpoint rejects the MIME string "application/json" with HTTP 400.
            mimeType: 'APPLICATION_JSON',
            schema: responseSchema
          }
        }
      }
    })
  }
});

const createAttemptDeadline = ({ controller, timeoutMs, setTimeoutImpl, clearTimeoutImpl }) => {
  let timedOut = false;
  let timer;
  let rejectDeadline;
  const deadline = new Promise((_, reject) => {
    rejectDeadline = reject;
    timer = setTimeoutImpl(() => {
      timedOut = true;
      controller.abort();
      rejectDeadline(new AttemptDeadlineExceeded());
    }, timeoutMs);
  });

  return {
    get timedOut() {
      return timedOut;
    },
    run: (operation) => Promise.race([Promise.resolve().then(operation), deadline]),
    cleanup: () => clearTimeoutImpl(timer)
  };
};

const isTimeout = ({ error, deadline, controller }) => (
  error instanceof AttemptDeadlineExceeded || deadline.timedOut || controller.signal.aborted
);

const callProviderAttempt = async ({ prompt, allowedCandidateIds, config, fetchImpl, setTimeoutImpl, clearTimeoutImpl, AbortControllerImpl, parseResponse, responseSchema }) => {
  const controller = new AbortControllerImpl();
  const request = buildGeminiRequest({ prompt, config, responseSchema });
  const deadline = createAttemptDeadline({
    controller,
    timeoutMs: config.timeoutMs,
    setTimeoutImpl,
    clearTimeoutImpl
  });

  try {
    let response;
    try {
      response = await deadline.run(() => fetchImpl(request.url, { ...request.options, signal: controller.signal }));
    } catch (error) {
      return providerFailure({
        code: classifyNetworkError(error, deadline, controller),
        retryable: true,
        attemptCount: 0
      });
    }

    if (!response || typeof response.ok !== 'boolean') {
      return providerFailure({ code: PROVIDER_ERROR_CODE.network, retryable: true, attemptCount: 0 });
    }

    if (!response.ok) {
      const status = Number.isInteger(response.status) ? response.status : undefined;
      return providerFailure({
        code: status === 400 ? PROVIDER_ERROR_CODE.requestInvalid : (status === 429 ? PROVIDER_ERROR_CODE.rateLimited : (status === 401 || status === 403 ? PROVIDER_ERROR_CODE.auth : (status >= 500 && status <= 599 ? PROVIDER_ERROR_CODE.upstream : PROVIDER_ERROR_CODE.unknown))),
        retryable: isTransientStatus(status),
        attemptCount: 0,
        status
      });
    }

    let body;
    try {
      body = await deadline.run(() => response.json());
    } catch (error) {
      if (isTimeout({ error, deadline, controller })) {
        return providerFailure({ code: PROVIDER_ERROR_CODE.timeout, retryable: true, attemptCount: 0 });
      }
      return providerFailure({
        code: error instanceof SyntaxError ? PROVIDER_ERROR_CODE.jsonInvalid : classifyNetworkError(error, deadline, controller),
        retryable: !(error instanceof SyntaxError),
        attemptCount: 0
      });
    }

    const text = extractGeminiText(body);
    if (!text) {
      return providerFailure({ code: PROVIDER_ERROR_CODE.responseEmpty, retryable: false, attemptCount: 0 });
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(stripOptionalJsonCodeFence(text));
    } catch (_error) {
      return providerFailure({ code: PROVIDER_ERROR_CODE.jsonInvalid, retryable: false, attemptCount: 0 });
    }

    try {
      const parsed = parseResponse ? parseResponse(parsedJson) : validateRecommendationAllowList(parseAiProviderResponse(parsedJson), allowedCandidateIds);
      return providerSuccess(parsed, 0);
    } catch (error) {
      const code = error instanceof AiContractError ? error.code : AI_ERROR_CODE.providerOutputInvalid;
      return providerFailure({ code, retryable: false, attemptCount: 0 });
    }
  } finally {
    deadline.cleanup();
  }
};

export const callAiProvider = async ({
  prompt,
  allowedCandidateIds,
  config,
  fetchImpl = globalThis.fetch,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  AbortControllerImpl = globalThis.AbortController
  ,parseResponse,
  onTelemetry,
  shouldRetry,
  getRemainingMs,
  minimumRetryRemainingMs,
  responseSchema
}) => {
  const emit = typeof onTelemetry === 'function' ? (...args) => {
    try { onTelemetry(...args); } catch {}
  } : () => {};
  const inputErrorCode = validateProviderInputs({ prompt, allowedCandidateIds, config, fetchImpl, parseResponse });
  if (inputErrorCode) {
    return providerFailure({
      code: inputErrorCode,
      retryable: false,
      attemptCount: 0
    });
  }

  const maxAttempts = Number.isInteger(config.maxAttempts) && config.maxAttempts >= 1 && config.maxAttempts <= MAX_PROVIDER_ATTEMPTS ? config.maxAttempts : MAX_PROVIDER_ATTEMPTS;
  const effectiveResponseSchema = responseSchema ?? (parseResponse ? undefined : buildAiAdvisorResponseSchema(allowedCandidateIds));
  const minimumRetryBudgetMs = Number.isInteger(minimumRetryRemainingMs) && minimumRetryRemainingMs > 0
    ? minimumRetryRemainingMs
    : (config.allowShortTimeout === true ? 1_000 : AI_MIN_TIMEOUT_MS);
  let nextAttemptTimeoutMs = config.timeoutMs;
  for (let attemptCount = 1; attemptCount <= maxAttempts; attemptCount += 1) {
    const attemptConfig = nextAttemptTimeoutMs === config.timeoutMs ? config : { ...config, timeoutMs: nextAttemptTimeoutMs };
    const startedAt = Date.now();
    emit('provider_attempt_started', { attemptCount, timeoutMs: attemptConfig.timeoutMs });
    const result = await callProviderAttempt({
      prompt,
      allowedCandidateIds,
      config: attemptConfig,
      fetchImpl,
      setTimeoutImpl,
      clearTimeoutImpl,
      AbortControllerImpl
      ,parseResponse,
      responseSchema: effectiveResponseSchema
    });

    if (result.ok) return providerSuccess(result.data, attemptCount);
    emit('provider_attempt_failed', {
      failureCode: result.error.code,
      providerFailureStatus: result.error.status,
      durationMs: Math.max(0, Date.now() - startedAt),
      timedOut: result.error.code === PROVIDER_ERROR_CODE.timeout,
      attemptCount
    });
    const retryAllowedByPolicy = typeof shouldRetry === 'function'
      ? (() => {
          try { return shouldRetry(result.error) === true; } catch { return false; }
        })()
      : result.error.retryable;
    if (!retryAllowedByPolicy || attemptCount === maxAttempts) {
      return providerFailure({
        code: result.error.code,
        retryable: result.error.retryable,
        attemptCount,
        status: result.error.status
      });
    }

    if (typeof getRemainingMs === 'function') {
      let remainingMs;
      try { remainingMs = Math.floor(getRemainingMs()); } catch { remainingMs = 0; }
      if (!Number.isFinite(remainingMs) || remainingMs < minimumRetryBudgetMs) {
        return providerFailure({
          code: result.error.code,
          retryable: result.error.retryable,
          attemptCount,
          status: result.error.status
        });
      }
      nextAttemptTimeoutMs = Math.min(config.timeoutMs, remainingMs);
    }
  }

  return providerFailure({ code: PROVIDER_ERROR_CODE.network, retryable: true, attemptCount: maxAttempts });
};

export const AI_PROVIDER_ERROR_CODE = PROVIDER_ERROR_CODE;
