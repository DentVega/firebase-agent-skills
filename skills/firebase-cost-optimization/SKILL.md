---
name: firebase-cost-optimization
description: >-
  Audits and reduces Firebase bills — cutting Firestore reads, Cloud Functions
  invocations, Storage egress, FCM volume, and AI Logic token spend. Use
  whenever the user asks about Firebase costs, sees a bill spike, wants to
  prepare for scale, or is auditing a project for waste. Combine with the
  product-specific skills for implementation details.
compatibility: No dependencies. Works alongside every other skill. Pricing references current as of late 2025 — verify on https://firebase.google.com/pricing for exact rates.
---

# Firebase Cost Optimization

## Minimum viable example

The single biggest cost lever in 90% of Firebase apps:

```ts
// BAD — every snapshot listener re-reads on every doc change
const unsubs = posts.map((p) => onSnapshot(doc(db, "posts", p.id), handlePost));

// GOOD — one query listener for all visible posts
const unsub = onSnapshot(
  query(collection(db, "posts"), where("authorId", "==", uid), limit(20)),
  (snap) => handleAll(snap.docs),
);
```

The bad pattern can scale to millions of reads/day before you notice. The good pattern is the same cost for any number of docs.

## How Firebase charges (the short version)

| Product | Free tier (Spark) | Paid (Blaze) charges by |
|---|---|---|
| Firestore | 50k reads, 20k writes, 1 GiB storage / day | reads, writes, deletes, network egress |
| Realtime DB | 100 simultaneous connections, 1 GiB storage | data downloaded (egress), storage |
| Cloud Functions | 125k invocations / month | invocations + GB-seconds (memory × time) + outbound network |
| Cloud Storage | 5 GiB storage, 1 GiB/day egress | storage, operations (class A/B), egress |
| Hosting | 10 GiB storage, 360 MB/day egress | storage, egress |
| FCM | Free | Free (always — no per-message cost) |
| Analytics | Free | Free (BigQuery export incurs BigQuery charges) |
| AI Logic | n/a | input + output tokens, model-tier dependent |

The two that bite first: **Firestore reads** (often 90% of the bill in apps with lots of users) and **Cloud Functions invocations** (especially at high QPS or with cold starts).

## 1. Firestore — biggest lever

### a. Audit what you read

Run this in the console: Firestore → Usage → check Reads per day. If reads are >100× your DAU, you have a leaky pattern.

Common culprits:

- **Per-document listeners** instead of one query listener (see MVE above)
- **No pagination** — loading 500-doc collections every screen load
- **No client cache** — `getDocsFromCache()` for data that rarely changes
- **Fanning out denormalized writes** that trigger more reads in listeners

### b. Cut reads at the source

- **Use `onSnapshot` with `includeMetadataChanges: false`** (the default). Setting it to true doubles reads.
- **Cache aggressively** with `getDocs(query, { source: "cache" })` for static data
- **Paginate with cursors**, not offset (`startAfter` not skipping reads of skipped docs)
- **Denormalize cold data** — store the author name on the post once instead of looking it up on every render
- **Delete listeners on unmount** — leaked listeners keep documents hydrated and chargeable
- **Bundle initial reads** with [Firestore bundles](https://firebase.google.com/docs/firestore/bundles) — serve commonly-queried data as a static blob from Hosting

### c. Right-size your indexes

Each composite index adds storage and write cost. Drop unused indexes:

Console → Firestore → Indexes → check the **Last used** column. Anything unused for 30 days is a candidate for removal.

## 2. Cloud Functions

### a. Right-size memory and concurrency

```ts
export const fn = onCall({
  memory: "256MiB",        // not 1GiB if you don't need it
  concurrency: 80,         // I/O-bound: keep high. CPU-bound: lower.
  minInstances: 0,         // unless cold start latency hurts UX
  maxInstances: 100,       // backstop against runaway loops
  region: "us-central1",   // pin
}, handler);
```

Functions bill by **GB-seconds** (memory × execution time). Halving memory halves the rate. A function running at 256 MiB for 100 ms costs 1/16 of one at 1 GiB for 400 ms — same work, 16× the bill.

### b. Avoid invocation amplification

- **Don't trigger a function on every doc write** if you can batch: a scheduled function that processes a queue is cheaper than a trigger that fires per write
- **Use Cloud Tasks** for fan-out work — pay once per enqueue, processing rate is decoupled
- **Cache cold data** inside the function (module-scoped `const cache = new Map()`) — instance reuse means subsequent invocations skip the fetch
- **Set `maxInstances`** so a runaway loop doesn't scale to thousands of concurrent invocations before you notice

### c. Cold start cost vs. min instances

- **Min instances = 1** costs ~$8/month per region per function. Worth it for user-facing callables that need <1s response.
- For background triggers (Firestore writes, scheduled), cold starts don't affect UX. Skip min instances.

## 3. Storage

- **Lifecycle policies** — auto-delete objects older than N days, or move to Coldline storage class:
  ```bash
  gsutil lifecycle set lifecycle.json gs://<bucket>
  ```
- **Cache-Control** — set `public, max-age=31536000, immutable` on hashed assets so the CDN serves them and you don't pay egress repeatedly
- **Don't list large prefixes from the client** — `listAll()` is paginated but slow + expensive. Maintain a Firestore index of paths.
- **Delete on user deletion** — orphaned files keep billing forever. Hook `beforeUserDeleted` to bulk-delete the user's prefix.
- **Resize images at upload** — the `storage-resize-images` extension generates thumbnails so you don't serve 4MB originals for 100px avatars.

## 4. AI Logic (Gemini)

Tokens are the unit. The biggest wins:

- **Use `flash` over `pro`** unless you've benchmarked that pro is required. Flash is ~10× cheaper per token.
- **Context caching** (Vertex AI feature) — cache long system prompts so they're billed at ~25% rate on repeat use
- **Pin to a specific version** (`gemini-2.5-flash-002`) — unversioned aliases roll forward and can change cost characteristics overnight
- **Set `maxOutputTokens`** — if you only need a 50-token classification, don't let the model emit 2000
- **Streaming + cancellation** — let users cancel long generations; you only pay for tokens emitted before cancellation

## 5. Budget alerts (set this BEFORE you optimize)

Google Cloud Console → Billing → Budgets & alerts → Create budget.

- **Threshold alerts at 50%, 80%, 100%, 150%** of expected monthly spend
- **Pubsub notification + Cloud Function** to programmatically respond (e.g. disable a runaway feature flag via Remote Config)
- **Hard cap** is not available on most Firebase products — alerts are advisory. Build kill switches into the app.

```ts
// Cloud Function triggered by budget Pub/Sub topic
export const onBudgetAlert = onMessagePublished("budget-alerts", async (event) => {
  const { costAmount, budgetAmount } = event.data.message.json;
  if (costAmount / budgetAmount > 1.5) {
    // Activate "low-traffic mode" via Remote Config
    await getRemoteConfig().publishTemplate(/* ... */);
  }
});
```

## 6. Audit checklist

Run quarterly:

- [ ] Firestore reads / DAU ratio — should be a small constant, not growing
- [ ] Functions with no `maxInstances` set
- [ ] Functions allocated more memory than they use (check Cloud Monitoring → Cloud Run → Memory utilization)
- [ ] Storage objects older than 90 days with no `Cache-Control`
- [ ] Unused composite Firestore indexes (30+ days idle)
- [ ] Auth users count vs. active users — dead accounts hold storage
- [ ] AI Logic spend per user — if a single user can drive 10× average, add per-user rate limiting
- [ ] Budget alerts configured and routed to a human

## 7. Common mistakes

- **Optimizing before measuring.** Look at the actual usage panels in the console first; don't pre-optimize patterns that aren't hot.
- **Confusing "reads" with "queries".** A query that returns 100 docs costs 100 reads, not 1.
- **Leaving listeners attached on hidden screens.** Unmount = unsubscribe.
- **Min instances on triggers.** Background triggers (Firestore, Pub/Sub) don't need warm instances. Min instances is for HTTPS / callable only.
- **Treating Hosting like Storage.** Hosting bills egress aggressively for large files. User uploads go in Storage.
- **No budget alert.** A bug pushing 100M Firestore reads in a day costs ~$60 before anyone notices. The alert costs $0.
- **Using Pro Gemini for trivial tasks.** Classification, extraction, simple summarization — Flash handles them at 10% the cost.
