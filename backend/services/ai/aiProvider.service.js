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
  http: 'AI_PROVIDER_HTTP_ERROR',
  rateLimited: 'AI_PROVIDER_RATE_LIMITED',
  responseEmpty: 'AI_PROVIDER_RESPONSE_EMPTY',
  jsonInvalid: 'AI_PROVIDER_JSON_INVALID'
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

const validateProviderInputs = ({ prompt, allowedCandidateIds, config, fetchImpl }) => {
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
    || config.timeoutMs < AI_MIN_TIMEOUT_MS
    || config.timeoutMs > AI_MAX_TIMEOUT_MS
    || typeof fetchImpl !== 'function'
  ) {
    return PROVIDER_ERROR_CODE.configInvalid;
  }

  try {
    validateRecommendationAllowList({ answer: 'allow-list validation', recommendations: [] }, allowedCandidateIds);
  } catch (error) {
    if (error instanceof AiContractError) return error.code;
    return PROVIDER_ERROR_CODE.configInvalid;
  }
  return undefined;
};

const buildGeminiRequest = ({ prompt, config }) => ({
  url: `${GEMINI_GENERATE_CONTENT_URL}/${encodeURIComponent(config.model.trim())}:generateContent`,
  options: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
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

const callProviderAttempt = async ({ prompt, allowedCandidateIds, config, fetchImpl, setTimeoutImpl, clearTimeoutImpl, AbortControllerImpl }) => {
  const controller = new AbortControllerImpl();
  const request = buildGeminiRequest({ prompt, config });
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
        code: isTimeout({ error, deadline, controller }) ? PROVIDER_ERROR_CODE.timeout : PROVIDER_ERROR_CODE.network,
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
        code: status === 429 ? PROVIDER_ERROR_CODE.rateLimited : PROVIDER_ERROR_CODE.http,
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
        code: error instanceof SyntaxError ? PROVIDER_ERROR_CODE.jsonInvalid : PROVIDER_ERROR_CODE.network,
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
      const parsed = parseAiProviderResponse(parsedJson);
      return providerSuccess(validateRecommendationAllowList(parsed, allowedCandidateIds), 0);
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
}) => {
  const inputErrorCode = validateProviderInputs({ prompt, allowedCandidateIds, config, fetchImpl });
  if (inputErrorCode) {
    return providerFailure({
      code: inputErrorCode,
      retryable: false,
      attemptCount: 0
    });
  }

  for (let attemptCount = 1; attemptCount <= MAX_PROVIDER_ATTEMPTS; attemptCount += 1) {
    const result = await callProviderAttempt({
      prompt,
      allowedCandidateIds,
      config,
      fetchImpl,
      setTimeoutImpl,
      clearTimeoutImpl,
      AbortControllerImpl
    });

    if (result.ok) return providerSuccess(result.data, attemptCount);
    if (!result.error.retryable || attemptCount === MAX_PROVIDER_ATTEMPTS) {
      return providerFailure({
        code: result.error.code,
        retryable: result.error.retryable,
        attemptCount,
        status: result.error.status
      });
    }
  }

  return providerFailure({ code: PROVIDER_ERROR_CODE.network, retryable: true, attemptCount: MAX_PROVIDER_ATTEMPTS });
};

export const AI_PROVIDER_ERROR_CODE = PROVIDER_ERROR_CODE;
