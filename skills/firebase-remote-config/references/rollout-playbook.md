# Gradual rollout playbook

Shipping a risky feature behind a Remote Config flag, then ramping safely. Battle-tested order of operations.

## 0. Prereqs

- Feature is gated behind a single boolean param (e.g. `feature_new_checkout`)
- App reads the flag through `useRemoteFlag` or equivalent, so toggling is instant
- Default in code AND default in console = **false** (off)
- Crashlytics + Analytics wired so you can compare cohorts

## 1. Internal-only flip (day 0)

Console → Remote Config → `feature_new_checkout`:

- Default: `false`
- Condition: `User property "qa_tester" exactly matches "true"` → `true`

Set `qa_tester` from QA devices' client code (`analytics().setUserProperty("qa_tester", "true")`). QA can now test in production without affecting real users.

**Verify**: log in on a QA-tagged device, confirm the flag activates. Log in on a non-QA device, confirm it does not.

## 2. 1% rollout (day 1)

Add a second condition (above the QA one — order matters, first match wins):

- `User in random percentile <= 1` → `true`

Publish. Wait at least 24h.

### What to watch (Firebase Console)

- **Crashlytics → Issues** filtered by `feature_new_checkout = true`. Compare crash rate to the `false` cohort.
- **Analytics → Events** for the feature's success/failure events. Conversion drop > 5% relative to the off cohort = rollback.
- **Performance Monitoring** if used, for any new screen.

If any metric regresses, set the flag's percentile back to 0 and publish. Effect is near-instant via `onConfigUpdated`.

## 3. 10% (day 3)

Bump the percentile to 10. Wait another 24h. Same checks.

## 4. 50% (day 7)

Now you have meaningful sample sizes. Run a **Firebase A/B Test** instead of a flat percentile so you get statistical significance reports:

- Console → A/B Testing → Create experiment → Remote Config
- Variant A: `feature_new_checkout = false`
- Variant B: `feature_new_checkout = true`
- Goal: pick a key metric (e.g. `purchase` revenue)
- Distribution: 50/50

The dashboard will tell you when the result is significant (typically 1-2 weeks at modest traffic).

## 5. 100% + flag removal (day 14+)

Once the experiment shows a non-negative result and a week of clean Crashlytics:

1. Set the flag default to `true` in the console; remove all conditions.
2. In code, **remove the flag check** and the dead `false` branch. Ship that as a normal release.
3. After a couple of releases, delete the parameter from the console.

Don't skip step 2 — flags that ship to production but never get removed are a leading cause of dead code accumulating in the repo.

## Rollback runbook (the most important part)

You should be able to kill any feature in **under 60 seconds**:

1. Console → Remote Config → param → set default to `false`, remove `random_percentile` condition
2. Click **Publish changes**
3. Verify in DebugView on a fresh device

Practice this once during the internal-only stage. The first time you do it under pressure is the wrong time to discover that your default override isn't where you thought.

## Caveats

- **Min fetch interval**: in production, devices won't see the flip until their next fetch. Default is 12h. For instant rollback, set `minimumFetchIntervalMillis: 60_000` in code and rely on `onConfigUpdated`.
- **Cached templates**: users offline at flip time keep the old value until they reconnect.
- **Feature flags ≠ permission**: a determined user can patch the binary and force the flag on. Don't gate paid features purely with Remote Config — also check entitlements server-side.
