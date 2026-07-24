import { describe, expect, it } from 'vitest';
import {
  ILNError,
  NetworkError,
  TransactionFailedError,
  normalizeError,
  toILNError,
} from './index';

describe('normalizeError', () => {
  it('preserves ILNError instances and merges context', () => {
    const original = new NetworkError('offline', undefined, { endpoint: 'rpc-a' });
    const normalized = normalizeError(original, { context: { requestId: 'req-1' } });

    expect(normalized).toBe(original);
    expect(normalized).toBeInstanceOf(ILNError);
    expect(normalized.docsUrl).toContain('NETWORK_ERROR');
    expect(normalized.context).toEqual({ endpoint: 'rpc-a', requestId: 'req-1' });
    expect(normalized.retryable).toBe(true);
  });

  it('maps unknown thrown values to a consistent transaction error', () => {
    const raw = new Error('submission failed');
    const normalized = normalizeError(raw, { context: { operation: 'submitInvoice' } });

    expect(normalized).toBeInstanceOf(TransactionFailedError);
    expect(normalized.code).toBe('TRANSACTION_FAILED');
    expect(normalized.message).toBe('submission failed');
    expect(normalized.docsUrl).toContain('TRANSACTION_FAILED');
    expect(normalized.context).toMatchObject({
      rawError: raw,
      originalName: 'Error',
      operation: 'submitInvoice',
    });
  });

  it('uses the requested fallback category', () => {
    const normalized = toILNError('RPC unavailable', {
      fallbackCode: 'NETWORK_ERROR',
      retryable: true,
    });

    expect(normalized).toBeInstanceOf(NetworkError);
    expect(normalized.code).toBe('NETWORK_ERROR');
    expect(normalized.retryable).toBe(true);
  });

  it('preserves raw contract error and matched signature', () => {
    const normalized = normalizeError('HostError: InvalidDiscountRate');

    expect(normalized.code).toBe('INVALID_DISCOUNT_RATE');
    expect(normalized.context).toMatchObject({
      rawError: 'HostError: InvalidDiscountRate',
      matchedPattern: 'InvalidDiscountRate',
    });
  });
});
