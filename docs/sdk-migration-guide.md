# SDK Migration Guide

This guide covers upgrades within the stable `@iln/sdk` package. For the separate, incremental migration from the stable SDK to the experimental browser-first rewrite, use the [SDK-next migration guide](sdk-next-migration.md).

## Stable SDK upgrade summary

| Feature | Change | Action |
|---|---|---|
| Invoice statuses | Raw strings became `InvoiceStatus` values. | Use enum values or helper predicates. |
| Errors | Generic errors became structured `ILNError` subclasses. | Handle error codes and remediation fields. |
| Amounts | Precision helpers are available. | Prefer bigint-safe amount utilities. |
| Cache | Reads may use a configured cache. | Disable caching when immediate on-chain reads are required. |
| Indexer and SSE | Routes are versioned. | Update clients to `/v1/` endpoints. |

## Upgrade

```bash
npm install @iln/sdk@latest @iln/react@latest
```

Replace raw status comparisons:

```ts
import { isFunded, isPaid } from '@iln/sdk';

const invoice = await sdk.getInvoice(invoiceId);
if (isPaid(invoice.status)) console.log('Payment completed');
if (isFunded(invoice.status)) console.log('Funding completed');
```

Handle structured errors:

```ts
import { ILNError, normalizeError } from '@iln/sdk';

try {
  await sdk.submitInvoice(params);
} catch (cause) {
  const error = normalizeError(cause, { operation: 'submitInvoice' });
  if (error instanceof ILNError) {
    console.error(error.code, error.remediation, error.docsUrl);
  }
}
```

Disable caching when required:

```ts
const sdk = new ILNSdk({
  ...ILN_TESTNET,
  cache: { enabled: false },
});
```

## Validation checklist

- Run `npx tsc --noEmit`.
- Test submit, fund, pay, default, and dispute flows.
- Test wallet disconnect and recovery.
- Verify structured error handling.
- Verify event-stream clients use versioned endpoints.

## Rollback

Pin the last known working stable versions, rebuild, and redeploy:

```bash
pnpm add @iln/sdk@0.1.0 @iln/react@0.1.0
pnpm run build
```

A rollback between stable SDK versions is separate from an SDK-next rollout. For SDK-next, keep both packages installed and switch the affected feature flag back to the stable client.
