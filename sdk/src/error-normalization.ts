import {
  GenericContractError,
  ILNError,
  NetworkError,
  TransactionFailedError,
  ValidationError,
  parseContractError,
} from './errors';

export interface NormalizeErrorOptions {
  fallbackCode?: 'NETWORK_ERROR' | 'TRANSACTION_FAILED' | 'VALIDATION_ERROR' | 'CONTRACT_ERROR';
  context?: Record<string, unknown>;
  retryable?: boolean;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Convert any thrown value into the stable consumer-facing ILNError shape.
 * Existing ILNError instances are preserved while optional context is merged.
 */
export function normalizeError(error: unknown, options: NormalizeErrorOptions = {}): ILNError {
  if (error instanceof ILNError) {
    if (options.context) error.context = { ...(error.context ?? {}), ...options.context };
    if (typeof options.retryable === 'boolean') error.retryable = options.retryable;
    return error;
  }

  const message = messageOf(error);
  const context = {
    rawError: error,
    originalName: error instanceof Error ? error.name : typeof error,
    ...(options.context ?? {}),
  };

  if (/InvalidDiscountRate|TokenMismatch|PayerReputationTooLow|contract error/i.test(message)) {
    const parsed = parseContractError(message);
    parsed.context = { ...(parsed.context ?? {}), ...context };
    return parsed;
  }

  switch (options.fallbackCode) {
    case 'NETWORK_ERROR':
      return new NetworkError(message, undefined, context);
    case 'VALIDATION_ERROR':
      return new ValidationError(message, undefined, context);
    case 'CONTRACT_ERROR':
      return new GenericContractError(message, context);
    case 'TRANSACTION_FAILED':
    default:
      return new TransactionFailedError(message, undefined, context);
  }
}

/** Alias retained for callers that prefer an explicit conversion name. */
export const toILNError = normalizeError;
