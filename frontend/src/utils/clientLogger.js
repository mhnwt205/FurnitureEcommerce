const MAX_MESSAGE_LENGTH = 240;

const sanitizeText = (value) => value
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
  .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]')
  .replace(/\b(?:\+?\d[\d\s.-]{7,}\d)\b/g, '[REDACTED_PHONE]')
  .replace(/\b(authorization|cookie|token|password)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
  .slice(0, MAX_MESSAGE_LENGTH);

const sanitizeDiagnostic = (details) => {
  if (typeof details === 'string') return { message: sanitizeText(details) };
  if (!details || typeof details !== 'object') return undefined;

  const diagnostic = {};
  if (typeof details.message === 'string') diagnostic.message = sanitizeText(details.message);
  if (typeof details.code === 'string') diagnostic.code = sanitizeText(details.code);
  if (typeof details.code === 'number') diagnostic.code = details.code;
  if (typeof details.status === 'number') diagnostic.status = details.status;
  return Object.keys(diagnostic).length > 0 ? diagnostic : undefined;
};

const getConsoleMethod = (method) => {
  if (typeof console === 'undefined') return null;
  if (typeof console[method] === 'function') return console[method].bind(console);
  if (typeof console.log === 'function') return console.log.bind(console);
  return null;
};

const writeDiagnostic = (method, event, details) => {
  if (!import.meta.env.DEV) return;

  try {
    const consoleMethod = getConsoleMethod(method);
    if (!consoleMethod) return;

    const diagnostic = sanitizeDiagnostic(details);
    if (diagnostic) {
      consoleMethod(`[client] ${event}`, diagnostic);
      return;
    }

    consoleMethod(`[client] ${event}`);
  } catch {
    // Diagnostics must never disrupt application behavior.
  }
};

const clientLogger = {
  error: (event, details) => writeDiagnostic('error', event, details),
  warn: (event, details) => writeDiagnostic('warn', event, details),
  info: (event, details) => writeDiagnostic('info', event, details),
  debug: (event, details) => writeDiagnostic('debug', event, details)
};

export default clientLogger;
