# ILN SDK error catalogue

All consumer-facing SDK failures can be converted to a consistent `ILNError` with `normalizeError()` (also exported as `toILNError()`).

```ts
interface ILNErrorShape {
  code: string;
  message: string;
  remediation: string;
  docsUrl: string;
  context: Record<string, unknown>;
  retryable: boolean;
}
```

Never put secret keys, signed XDR, access tokens, or personal data in `context`.

## Error code index

| Code | Meaning | Retryable |
|---|---|---|
| [`INVALID_DISCOUNT_RATE`](#invalid-discount-rate) | Discount rate is outside protocol bounds or uses the wrong unit. | No |
| [`TOKEN_MISMATCH`](#token-mismatch) | Transaction token differs from the invoice or deployment token. | No |
| [`PAYER_REPUTATION_TOO_LOW`](#payer-reputation-too-low) | Payer does not meet the protocol threshold. | No |
| [`INSUFFICIENT_BALANCE`](#insufficient-balance) | Token balance, reserve, or transaction fee is insufficient. | Yes |
| [`NETWORK_ERROR`](#network-error) | Horizon, RPC, DNS, connectivity, or timeout failure. | Yes |
| [`TRANSACTION_FAILED`](#transaction-failed) | Submitted transaction failed on-chain. | No |
| [`VALIDATION_ERROR`](#validation-error) | Input is missing, malformed, or outside an accepted range. | No |
| [`WALLET_NOT_CONNECTED`](#wallet-not-connected) | A required signer is unavailable. | No |
| [`CONTRACT_ERROR`](#contract-error) | Unclassified contract rejection. | No |
| [`SIMULATION_FAILED`](#simulation-failed) | Soroban simulation failed before submission. | No |
| [`UNKNOWN_ERROR`](#unknown-error) | Failure does not match a known category. | No |

## Invalid discount rate

Use basis points, where `300` means 3%, and check the current protocol maximum before rebuilding the transaction.

## Token mismatch

Read the invoice and deployment token address, then rebuild and re-sign the transaction with that token.

## Payer reputation too low

Check the payer score and submit with a payer that meets the current protocol threshold.

## Insufficient balance

Fund the token balance and XLM reserve/fees, verify trustlines, then retry with bounded attempts.

## Network error

Verify Horizon and Soroban RPC URLs and health. Retry with bounded exponential backoff.

## Transaction failed

Inspect the result XDR and current invoice state. Correct the operation and build a new transaction rather than blindly resubmitting an expired envelope.

## Validation error

Inspect `context.field` when present and validate all inputs before transaction construction.

## Wallet not connected

Configure a signer or connect and unlock the browser wallet on the correct Stellar network.

## Contract error

Inspect `context.rawContractError` and `context.matchedSignature`. Compare the rejected operation with current contract state.

## Simulation failed

Review operation parameters, account state, contract state, and resource limits. Do not force-submit unless the failure is understood.

## Unknown error

Log the serialised error, SDK version, operation, and network, then file a reproducible report without secrets.

## Worked example

```ts
import { normalizeError } from '@iln/sdk';

try {
  await sdk.fundInvoice({ funder: walletAddress, invoiceId: 42n });
} catch (cause) {
  const error = normalizeError(cause, {
    operation: 'fundInvoice',
    context: { invoiceId: '42' },
  });

  console.error(error.code, error.message);
  console.error(error.remediation);
  console.error(error.docsUrl);

  if (error.retryable) {
    scheduleBoundedRetry();
  }
}
```

`parseContractError()` preserves `rawContractError` and the known `matchedSignature` used to classify a Soroban failure. These fields are intended for secure diagnostics, not direct display to end users.
