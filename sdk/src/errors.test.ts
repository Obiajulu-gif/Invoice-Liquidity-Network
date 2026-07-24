import { describe, expect, it } from 'vitest';
import {
  GenericContractError,
  ILN_ERROR_CODES,
  ILNError,
  InsufficientBalanceError,
  InvalidDiscountRateError,
  NetworkError,
  PayerReputationTooLowError,
  TokenMismatchError,
  TransactionFailedError,
  UnknownSDKError,
  ValidationError,
  WalletNotConnectedError,
  normalizeError,
  parseContractError,
  toILNError,
} from './errors';

const allErrors = [
  new InvalidDiscountRateError(),
  new TokenMismatchError(),
  new PayerReputationTooLowError(),
  new InsufficientBalanceError(),
  new NetworkError(),
  new TransactionFailedError(),
  new ValidationError(),
  new WalletNotConnectedError(),
  new GenericContractError('unknown'),
  new UnknownSDKError('unknown'),
];

describe('structured SDK errors', () => {
  it('gives every public error a unique code and documentation URL', () => {
    const codes = allErrors.map((error) => error.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(Object.values(ILN_ERROR_CODES)).size).toBe(
      Object.values(ILN_ERROR_CODES).length,
    );

    for (const error of allErrors) {
      expect(error).toBeInstanceOf(ILNError);
      expect(error.docsUrl).toContain('docs/errors.md');
      expect(error.docsUrl).toContain(error.code.toLowerCase().replaceAll('_', '-'));
      expect(error.remediation.length).toBeGreaterThan(20);
      expect(typeof error.retryable).toBe('boolean');
    }
  });

  it('preserves structured context and produces JSON-safe output', () => {
    const error = new ValidationError(
      'payer is required',
      undefined,
      { field: 'payer', invoiceId: '42' },
    );

    expect(error.context).toEqual({ field: 'payer', invoiceId: '42' });
    expect(error.toJSON()).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'payer is required',
      context: { field: 'payer', invoiceId: '42' },
      retryable: false,
    });
  });
});

describe('parseContractError', () => {
  it.each([
    ['InvalidDiscountRate', InvalidDiscountRateError, 'INVALID_DISCOUNT_RATE'],
    ['TokenMismatch', TokenMismatchError, 'TOKEN_MISMATCH'],
    ['PayerReputationTooLow', PayerReputationTooLowError, 'PAYER_REPUTATION_TOO_LOW'],
  ])('maps %s and records the matched signature', (signature, ErrorType, code) => {
    const raw = `Error(Contract, #1): ${signature}`;
    const error = parseContractError(raw);

    expect(error).toBeInstanceOf(ErrorType);
    expect(error.code).toBe(code);
    expect(error.context).toMatchObject({
      rawContractError: raw,
      matchedSignature: signature,
    });
  });

  it('retains the raw unknown contract error for debugging', () => {
    const raw = { error: 'Error(Contract, #999)', diagnostic: 'opaque' };
    const error = parseContractError(raw);

    expect(error).toBeInstanceOf(GenericContractError);
    expect(error.context.matchedSignature).toBeNull();
    expect(String(error.context.rawContractError)).toContain('#999');
    expect(error.cause).toBe(raw);
  });
});

describe('normalizeError', () => {
  it('returns an existing ILNError unchanged when no context is added', () => {
    const source = new NetworkError();
    expect(normalizeError(source)).toBe(source);
  });

  it('merges operation context into an existing ILNError', () => {
    const source = new NetworkError('RPC unavailable', undefined, { rpcUrl: 'test' });
    const normalized = normalizeError(source, {
      operation: 'getInvoice',
      context: { invoiceId: '7' },
    });

    expect(normalized.code).toBe('NETWORK_ERROR');
    expect(normalized.context).toEqual({
      rpcUrl: 'test',
      operation: 'getInvoice',
      invoiceId: '7',
    });
  });

  it.each([
    [new Error('fetch failed: ECONNREFUSED'), 'NETWORK_ERROR', true],
    [new Error('insufficient balance for fee'), 'INSUFFICIENT_BALANCE', true],
    [new TypeError('payer is required'), 'VALIDATION_ERROR', false],
    [new Error('unclassified failure'), 'UNKNOWN_ERROR', false],
  ])('normalizes unknown failures into ILNError', (source, code, retryable) => {
    const error = normalizeError(source, { operation: 'submitInvoice' });
    expect(error).toBeInstanceOf(ILNError);
    expect(error.code).toBe(code);
    expect(error.retryable).toBe(retryable);
    expect(error.context.operation).toBe('submitInvoice');
    expect(error.cause).toBe(source);
  });

  it('normalizes contract errors through the same public path', () => {
    const error = toILNError('HostFunction failed: TokenMismatch', {
      operation: 'fundInvoice',
    });
    expect(error).toBeInstanceOf(TokenMismatchError);
    expect(error.context).toMatchObject({
      matchedSignature: 'TokenMismatch',
      operation: 'fundInvoice',
    });
  });
});
