# `@iln/sdk-next`

> This package is the experimental, modular, browser-first rewrite of the stable
> `@iln/sdk` package in `sdk/`. Use the stable package for production integrations
> and follow the [step-by-step migration guide](../../docs/sdk-next-migration.md)
> for an incremental rollout.

Typed TypeScript SDK for the Invoice Liquidity Network in Node.js and modern browsers.

## Install

```bash
npm install @iln/sdk-next
```

Keep `@iln/sdk` installed during migration when you need `getInvoice`, governance, analytics, offline support, plugins, React, or React Native.

## Node.js usage

```ts
import { InvoiceClient } from '@iln/sdk-next';

const client = new InvoiceClient({
  contractId: process.env.ILN_CONTRACT_ID!,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  network: 'testnet',
  signer,
});

const submitted = await client.submitInvoice({
  payer,
  amount: 25_000_000n,
  dueDate,
  discountRate: 300,
  token: process.env.ILN_TOKEN_CONTRACT_ID!,
});

await client.fundInvoice({ funder, invoiceId: submitted.invoiceId });
```

## Browser usage

The package exports `dist/browser/index.js`, built with `vite.browser.config.ts`. Bundlers that respect the `browser` export condition select it automatically:

```ts
import { InvoiceClient } from '@iln/sdk-next';
```

Direct ES module usage:

```html
<script type="module">
  import { InvoiceClient } from './node_modules/@iln/sdk-next/dist/browser/index.js';
</script>
```

The browser build uses Web Crypto rather than Node.js `crypto`, supports strict Content Security Policies, and is tested in Chrome, Firefox, WebKit, and sandboxed iframe environments.

## Modular imports

```ts
import { parseTokenAmount } from '@iln/sdk-next/tokens';
import { ContractCallError } from '@iln/sdk-next/errors';
import { xdr } from '@iln/sdk-next/xdr';
```

## Build and test

```bash
npm run build
npm run build:browser
npm test
npx playwright install
npm run test:browser
```

See the [SDK-next migration guide](../../docs/sdk-next-migration.md) for breaking changes, before/after examples, the find-and-replace table, feature gaps, and rollback guidance.
