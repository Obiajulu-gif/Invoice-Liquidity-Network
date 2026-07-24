const DEFAULT_DOCS_BASE_URL =
  'https://github.com/Invoice-Liquidity-Network/Invoice-Liquidity-Network/blob/main/docs/errors.md';

export const ILN_ERROR_CODES = {
  INVALID_DISCOUNT_RATE: 'INVALID_DISCOUNT_RATE',
  TOKEN_MISMATCH: 'TOKEN_MISMATCH',
  PAYER_REPUTATION_TOO_LOW: 'PAYER_REPUTATION_TOO_LOW',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  SIMULATION_FAILED: 'SIMULATION_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ILNErrorCode = (typeof ILN_ERROR_CODES)[keyof typeof ILN_ERROR_CODES];
export type ILNErrorContext = Record<string, unknown>;

export interface ILNErrorOptions {
  docsUrl?: string;
  context?: ILNErrorContext;
  retryable?: boolean;
  cause?: unknown;
}

function docsUrlFor(code: ILNErrorCode): string {
  return `${DEFAULT_DOCS_BASE_URL}#${code.toLowerCase().replaceAll('_', '-')}`;
}

function serialiseUnknown(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Base error class returned by all consumer-facing SDK error paths. */
export class ILNError extends Error {
  public readonly code: ILNErrorCode;
  public readonly remediation: string;
  public readonly docsUrl: string;
  public readonly context: ILNErrorContext;
  public readonly retryable: boolean;
  public override readonly cause?: unknown;

  constructor(
    message: string,
    code: ILNErrorCode,
    remediation: string,
    options: ILNErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.code = code;
    this.remediation = remediation;
    this.docsUrl = options.docsUrl ?? docsUrlFor(code);
    this.context = options.context ?? {};
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
  }

  /** JSON-safe representation suitable for logs, API responses, and telemetry. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      remediation: this.remediation,
      docsUrl: this.docsUrl,
      context: this.context,
      retryable: this.retryable,
    };
  }
}

export class InvalidDiscountRateError extends ILNError {
  constructor(context: ILNErrorContext = {}, cause?: unknown) {
    super(
      'Invalid discount rate.',
      ILN_ERROR_CODES.INVALID_DISCOUNT_RATE,
      'Check that discountRate is within the protocol bounds and is expressed in basis points (300 = 3%).',
      { context, retryable: false, cause },
    );
  }
}

export class TokenMismatchError extends ILNError {
  constructor(context: ILNErrorContext = {}, cause?: unknown) {
    super(
      'Token mismatch in transaction.',
      ILN_ERROR_CODES.TOKEN_MISMATCH,
      'Use the token contract configured for the invoice and protocol network, then rebuild the transaction.',
      { context, retryable: false, cause },
    );
  }
}

export class PayerReputationTooLowError extends ILNError {
  constructor(context: ILNErrorContext = {}, cause?: unknown) {
    super(
      'Payer reputation is too low.',
      ILN_ERROR_CODES.PAYER_REPUTATION_TOO_LOW,
      'Check the payer reputation score and submit the invoice with a payer that meets the protocol threshold.',
      { context, retryable: false, cause },
    );
  }
}

export class InsufficientBalanceError extends ILNError {
  constructor(
    message = 'Insufficient balance to complete the transaction.',
    remediation = 'Ensure the account has enough token balance and XLM for fees, then retry.',
    context: ILNErrorContext = {},
    cause?: unknown,
  ) {
    super(message, ILN_ERROR_CODES.INSUFFICIENT_BALANCE, remediation, {
      context,
      retryable: true,
      cause,
    });
  }
}

export class NetworkError extends ILNError {
  constructor(
    message = 'Network request failed.',
    remediation = 'Verify the configured Horizon and Soroban RPC URLs, connectivity, and service health, then retry.',
    context: ILNErrorContext = {},
    cause?: unknown,
  ) {
    super(message, ILN_ERROR_CODES.NETWORK_ERROR, remediation, {
      context,
      retryable: true,
      cause,
    });
  }
}

export class TransactionFailedError extends ILNError {
  constructor(
    message = 'Transaction execution failed on-chain.',
    remediation = 'Inspect the transaction result and invoice state, correct the rejected operation, and submit a new transaction.',
    context: ILNErrorContext = {},
    cause?: unknown,
  ) {
    super(message, ILN_ERROR_CODES.TRANSACTION_FAILED, remediation, {
      context,
      retryable: false,
      cause,
    });
  }
}

export class ValidationError extends ILNError {
  constructor(
    message = 'Validation failed.',
    remediation = 'Check the supplied parameters and use the SDK validators to identify the invalid field.',
    context: ILNErrorContext = {},
    cause?: unknown,
  ) {
    super(message, ILN_ERROR_CODES.VALIDATION_ERROR, remediation, {
      context,
      retryable: false,
      cause,
    });
  }
}

export class WalletNotConnectedError extends ILNError {
  constructor(
    message = 'Wallet is not connected.',
    remediation = 'Provide a signer in the ILNSdk configuration or connect and unlock the browser wallet.',
    context: ILNErrorContext = {},
    cause?: unknown,
  ) {
    super(message, ILN_ERROR_CODES.WALLET_NOT_CONNECTED, remediation, {
      context,
      retryable: false,
      cause,
    });
  }
}

export class GenericContractError extends ILNError {
  constructor(rawError: string, context: ILNErrorContext = {}, cause?: unknown) {
    super(
      `Contract error: ${rawError}`,
      ILN_ERROR_CODES.CONTRACT_ERROR,
      'Inspect the raw contract error and invoice state, correct the operation inputs, and retry only after the cause is understood.',
      {
        context: { rawContractError: rawError, ...context },
        retryable: false,
        cause,
      },
    );
  }
}

export class SimulationError extends ILNError {
  constructor(
    message = 'Transaction simulation failed.',
    remediation = 'Review the simulated operation, account state, contract state, and resource limits before retrying.',
    context: ILNErrorContext = {},
    cause?: unknown,
  ) {
    super(message, ILN_ERROR_CODES.SIMULATION_FAILED, remediation, {
      context,
      retryable: false,
      cause,
    });
  }
}

export class UnknownSDKError extends ILNError {
  constructor(message: string, context: ILNErrorContext = {}, cause?: unknown) {
    super(
      message,
      ILN_ERROR_CODES.UNKNOWN_ERROR,
      'Inspect the original error and context. If it persists, report it with the SDK version and network.',
      { context, retryable: false, cause },
    );
  }
}

interface ContractErrorMatcher {
  signature: string;
  create: (context: ILNErrorContext, cause: unknown) => ILNError;
}

const CONTRACT_ERROR_MATCHERS: readonly ContractErrorMatcher[] = [
  {
    signature: 'InvalidDiscountRate',
    create: (context, cause) => new InvalidDiscountRateError(context, cause),
  },
  {
    signature: 'TokenMismatch',
    create: (context, cause) => new TokenMismatchError(context, cause),
  },
  {
    signature: 'PayerReputationTooLow',
    create: (context, cause) => new PayerReputationTooLowError(context, cause),
  },
];

/** Convert a raw Soroban/contract failure into a typed ILNError. */
export function parseContractError(contractError: unknown): ILNError {
  const rawContractError = serialiseUnknown(contractError);
  const matched = CONTRACT_ERROR_MATCHERS.find(({ signature }) =>
    rawContractError.includes(signature),
  );
  const context: ILNErrorContext = {
    rawContractError,
    matchedSignature: matched?.signature ?? null,
  };

  return matched
    ? matched.create(context, contractError)
    : new GenericContractError(rawContractError, context, contractError);
}

export interface NormalizeErrorOptions {
  operation?: string;
  context?: ILNErrorContext;
  retryable?: boolean;
  assumeContractError?: boolean;
}

/**
 * Normalise every unknown consumer-facing failure into the stable ILNError shape.
 * Existing ILNError instances retain their code while receiving call-site context.
 */
export function normalizeError(
  error: unknown,
  options: NormalizeErrorOptions = {},
): ILNError {
  const callContext = {
    ...(options.operation ? { operation: options.operation } : {}),
    ...(options.context ?? {}),
  };

  if (error instanceof ILNError) {
    if (Object.keys(callContext).length === 0 && options.retryable === undefined) return error;
    return new ILNError(error.message, error.code, error.remediation, {
      docsUrl: error.docsUrl,
      context: { ...error.context, ...callContext },
      retryable: options.retryable ?? error.retryable,
      cause: error.cause ?? error,
    });
  }

  const rawError = serialiseUnknown(error);
  const lower = rawError.toLowerCase();

  if (
    options.assumeContractError ||
    CONTRACT_ERROR_MATCHERS.some(({ signature }) => rawError.includes(signature)) ||
    lower.includes('contracterror') ||
    lower.includes('hostfunction')
  ) {
    const parsed = parseContractError(error);
    return normalizeError(parsed, { ...options, assumeContractError: false });
  }

  if (
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('network') ||
    lower.includes('fetch failed') ||
    lower.includes('timeout')
  ) {
    return new NetworkError(rawError, undefined, { rawError, ...callContext }, error);
  }

  if (lower.includes('insufficient') && lower.includes('balance')) {
    return new InsufficientBalanceError(rawError, undefined, { rawError, ...callContext }, error);
  }

  if (error instanceof TypeError || lower.includes('invalid') || lower.includes('required')) {
    return new ValidationError(rawError, undefined, { rawError, ...callContext }, error);
  }

  return new UnknownSDKError(rawError || 'Unknown SDK error.', { rawError, ...callContext }, error);
}

/** Backwards-compatible explicit alias for normalizeError(). */
export const toILNError = normalizeError;
