# Migrating from `@iln/sdk` to `@iln/sdk-next`

`@iln/sdk` remains the stable, feature-complete package. `@iln/sdk-next` is the modular, browser-first rewrite. Adopt it incrementally: keep the stable SDK for features that have not reached parity, and move invoice write paths only after validating them against your deployment.

## 1. Decide whether to migrate

Do not fully replace `@iln/sdk` yet when your application uses governance, analytics, offline queues, plugins, recovery, federation, React widgets, or React Native. Those capabilities remain stable-SDK-only.

SDK-next currently adds:

- conditional browser exports built by `vite.browser.config.ts`;
- Web Crypto-compatible randomness and hashing;
- independent `tokens`, `events`, `errors`, and `xdr` entry points;
- real-browser compatibility tests with Playwright;
- richer write results containing transaction hashes and parsed events.

## 2. Install both packages during migration

```bash
npm install @iln/sdk @iln/sdk-next
```

Using both packages keeps read paths and unsupported features operational while individual write paths move to SDK-next.

## 3. Replace client construction

### Before

```ts
import { ILNSdk, ILN_TESTNET, createFreighterSigner } from '@iln/sdk';

const sdk = new ILNSdk({
  ...ILN_TESTNET,
  signer: createFreighterSigner(),
});
```

### After

```ts
import { InvoiceClient } from '@iln/sdk-next';
import { createFreighterSigner } from '@iln/sdk';

const next = new InvoiceClient({
  contractId: process.env.ILN_CONTRACT_ID!,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  network: 'testnet',
  signer: createFreighterSigner(),
});
```

The constructor is no longer a protocol-wide configuration object. Supply contract, RPC, Horizon, network, and signer values directly.

## 4. Migrate the common calls

### Submit invoice

Stable SDK:

```ts
const invoiceId = await sdk.submitInvoice({
  freelancer,
  payer,
  amount: 25_000_000n,
  dueDate,
  discountRate: 300,
});
```

SDK-next:

```ts
const result = await next.submitInvoice({
  freelancer,
  payer,
  amount: 25_000_000n,
  dueDate,
  discountRate: 300,
  token: process.env.ILN_TOKEN_CONTRACT_ID!,
});

const invoiceId = result.invoiceId;
console.log(result.txHash, result.events);
```

Breaking changes: `token` is required, and the return value is an object rather than a bare invoice ID.

### Fund invoice

Stable SDK:

```ts
await sdk.fundInvoice({ funder, invoiceId });
```

SDK-next:

```ts
const result = await next.fundInvoice({
  funder,
  invoiceId,
  // amount or fundAmount may be supplied for partial funding.
});

console.log(result.txHash, result.events);
```

The object form is supported, and SDK-next also accepts `fundInvoice(invoiceId, amount)` for concise partial funding.

### Get invoice

The current SDK-next `InvoiceClient` does not expose the stable SDK's public `getInvoice()` method. Keep this read path on the stable SDK until parity lands:

```ts
const invoice = await sdk.getInvoice(invoiceId);
```

A safe dual-stack adapter keeps call sites stable:

```ts
export const invoices = {
  submit: (input: Parameters<typeof next.submitInvoice>[0]) => next.submitInvoice(input),
  fund: (input: Parameters<typeof next.fundInvoice>[0]) => next.fundInvoice(input),
  get: (invoiceId: bigint) => sdk.getInvoice(invoiceId),
};
```

This limitation is intentional in the migration guide: replacing `getInvoice()` with an undocumented RPC call would create a fragile integration.

## 5. Find-and-replace table

| Stable pattern | SDK-next replacement | Notes |
|---|---|---|
| `ILNSdk` | `InvoiceClient` | Invoice-focused client rather than protocol-wide facade. |
| `new ILNSdk(ILN_TESTNET...)` | `new InvoiceClient({ contractId, rpcUrl, horizonUrl, network, signer })` | Configuration fields are explicit. |
| `await sdk.submitInvoice(input)` | `await next.submitInvoice({ ...input, token })` | Returns `{ invoiceId, txHash, hash, events }`. |
| `await sdk.fundInvoice({ funder, invoiceId })` | `await next.fundInvoice({ funder, invoiceId })` | Returns transaction metadata. |
| `await sdk.getInvoice(id)` | Keep stable SDK temporarily | No public SDK-next equivalent yet. |
| `import {...} from '@iln/sdk'` | `import {...} from '@iln/sdk-next/<module>'` | Use `/tokens`, `/events`, `/errors`, or `/xdr` for smaller imports. |
| Node `crypto` assumptions | Web Crypto-compatible browser build | Bundlers use the `browser` export condition. |

## 6. Browser migration

Modern bundlers select `dist/browser/index.js` automatically:

```ts
import { InvoiceClient } from '@iln/sdk-next';
```

For direct ES modules:

```html
<script type="module">
  import { InvoiceClient } from '/node_modules/@iln/sdk-next/dist/browser/index.js';
</script>
```

Validate your target browsers with:

```bash
cd packages/sdk
npm ci
npm run build:browser
npx playwright install
npm run test:browser
```

## 7. Runnable side-by-side example

Create `migration-check.ts`:

```ts
import { ILNSdk, ILN_TESTNET, createKeypairSigner } from '@iln/sdk';
import { InvoiceClient } from '@iln/sdk-next';

const signer = createKeypairSigner(process.env.STELLAR_SECRET_KEY!);
const stable = new ILNSdk({ ...ILN_TESTNET, signer });
const next = new InvoiceClient({
  contractId: process.env.ILN_CONTRACT_ID!,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  network: 'testnet',
  signer,
});

const submitted = await next.submitInvoice({
  payer: process.env.PAYER_ADDRESS!,
  amount: 25_000_000n,
  dueDate: Math.floor(Date.now() / 1000) + 604_800,
  discountRate: 300,
  token: process.env.ILN_TOKEN_CONTRACT_ID!,
});

await next.fundInvoice({
  funder: process.env.FUNDER_ADDRESS!,
  invoiceId: submitted.invoiceId,
});

const invoice = await stable.getInvoice(submitted.invoiceId);
console.log({ submitted, invoice });
```

Run it with your normal TypeScript runner after supplying the four environment variables.

## 8. Rollout checklist

1. Add SDK-next without removing the stable dependency.
2. Migrate one write method behind a feature flag.
3. Compare transaction hashes, events, and contract state in testnet.
4. Verify browser, Node.js, and signer behaviour.
5. Keep `getInvoice()` and non-parity features on the stable SDK.
6. Remove the stable package only after SDK-next reaches documented parity and a deprecation notice is published.
