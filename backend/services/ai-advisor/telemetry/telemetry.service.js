import { logger as defaultLogger } from '../../../utils/logger.js';
import { aiMetrics } from './metrics.service.js';
import { aiTelemetryEventSchema } from './telemetry.schema.js';

const defaultClock = () => new Date();
const defaultSink = (event) => defaultLogger.info(event.eventName, { requestId: event.requestId, sessionId: event.sessionId, userId: event.userId, ownerType: event.ownerType, outcome: event.outcome, durationMs: event.durationMs, ...event.metadata });

export const createAiTelemetry = ({ eventSink = defaultSink, metrics = aiMetrics, clock = defaultClock, logger = defaultLogger } = {}) => ({
  emit(eventName, fields = {}) {
    let event;
    try {
      event = aiTelemetryEventSchema.parse({ eventName, timestamp: (fields.timestamp || clock()).toISOString(), requestId: fields.requestId ?? null, sessionId: fields.sessionId ?? null, userId: fields.userId ?? null, ownerType: fields.ownerType || 'guest', durationMs: fields.durationMs ?? null, outcome: fields.outcome ?? null, metadata: fields.metadata || {} });
    } catch {
      try { logger.warn('ai_telemetry_event_rejected', { reason: 'validation_error' }); } catch {}
      return null;
    }
    try { eventSink(event); } catch { try { logger.warn('ai_telemetry_sink_failed', { reason: 'telemetry_sink_failure' }); } catch {} }
    try { metrics.recordEvent(event); } catch { try { logger.warn('ai_telemetry_metrics_failed', { reason: 'telemetry_metrics_failure' }); } catch {} }
    return event;
  }
});

export const aiTelemetry = createAiTelemetry();
