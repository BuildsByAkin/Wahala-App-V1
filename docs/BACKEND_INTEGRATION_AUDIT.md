# Wahala — Backend Integration Audit & Fix-It List

> **Audience.** The next agent who will *finish wiring the frontend to the backend* described in [./BACKEND.md](./BACKEND.md). I (the auditor) am NOT going to write the code — I'm telling you exactly what is wired, what is faked, what is missing, and what to do about each one. Treat each `Section` as a self-contained ticket.
>
> **Scope of audit.**
> - All `features/*/api/*.ts` API clients.
> - All `hooks/use*.ts` data hooks.
> - `lib/api/{axios,query-keys,store-ref}.ts`.
> - Redux store + persistence in `store/index.ts` and `features/*/store/*.ts`.
> - TanStack Query usage across screens.
> - The 6 redesign bundles described in [./HANDOFF.md](./HANDOFF.md) and the 20 backend sections in [./BACKEND.md](./BACKEND.md).
>
> **Out of scope (per the user).** Push notifications and the *real* live audio (WebRTC) backend. Those are explicitly deferred — but the **registration plumbing for push** and the **read-only room state endpoints** are in scope and called out below.

---

## 0. TL;DR — what is the state of the integration?

| Area                                 | Frontend UI | API client | Wired to real endpoint | Verdict |
|--------------------------------------|:-----------:|:----------:|:----------------------:|---------|
| Auth (signup/login/me/PATCH me)      | done        | done       | yes                    | **OK**  |
| Markets list + detail                | done        | done       | yes                    | **OK** (missing v2 fields, see §3) |
| Comments (list/create/like)          | done        | done       | yes                    | **OK**  |
| Bets (place/list/summary)            | done        | done       | yes                    | **OK** (summary missing W—L, see §10) |
| Deposits (Stripe init + poll)        | done        | done       | yes                    | **OK**  |
| Withdrawals (banks, accounts, BVN)   | done        | done       | yes                    | **OK**  |
| Leaderboard                          | done        | done       | yes                    | **OK**  |
| Redux + redux-persist                | done        | n/a        | yes                    | **OK** (one small cache concern, §13) |
| TanStack Query keys factory          | done        | n/a        | n/a                    | **OK**  |
| Category palette + meta              | hard-coded  | none       | no                     | **GAP** — see §2 |
| Daily Wahala                         | screens exist | none     | no                     | **GAP** — see §4 |
| Streak                               | local only  | none       | no                     | **GAP** — see §11 |
| Live pulse (sparkline / deltas / recent stakers / volatility) | partly mocked | none | no | **GAP** — see §3 |
| Realtime (SSE / WebSocket)           | none        | none       | no                     | **GAP** — see §5 |
| Camp roster / camp-split header data | synthesized | none       | no                     | **GAP** — see §6 |
| Activity tape                        | synthesized | none       | no                     | **GAP** — see §7 |
| Camp private chat                    | tab only    | none       | no                     | **GAP** — see §8 |
| Reactions / confetti                 | UI only     | none       | no                     | **GAP** — see §9 |
| Per-camp wallet breakdown            | client-derived | none    | no                     | **GAP** — see §12 |
| Personal record + 30-day sparkline   | client-derived | none    | no                     | **GAP** — see §10 |
| Stance change (defection)            | UI event card only | none | no                  | **GAP** — see §14 |
| Drama-mode late fee                  | UI mode only | none      | no                     | **GAP** — see §15 |
| Resolution (winner id)               | optimistic stub | none   | no                     | **GAP** — see §16 |
| Live audio room state (read-only)    | UI stub     | none       | no                     | **GAP — Phase 1 stub from BACKEND.md §12** (still required) — see §17 |
| Push device registration             | none        | none       | no                     | **GAP — but user deferred this. Stub a single file so future agent has the shape.** — see §18 |
| Moderation reports                   | none        | none       | no                     | **GAP** — see §19 |
| `app.json` deep-link / push config   | partial     | n/a        | n/a                    | **CHECK** — see §20 |

**Bottom line.** The "P0 plumbing" (auth, markets, bets, comments, wallet, withdrawals) is real. **Every "v2 feature" — camps, daily wahala, audio, reactions, activity tape, stance change, late fee, push, realtime — is currently faked in the UI with synthesized data.** The UI is shipped but it is decoupled from the backend the redesign needs. This document lists each gap as a discrete ticket the agent can knock out one by one.

---

## 1. Conventions for every fix below

When you implement any of the sections in this doc:

1. **API client file** lives at `features/<domain>/api/<domain>-api.ts`. If the domain doesn't exist yet (e.g. `reactions`, `daily-wahala`, `camp-chat`, `notifications`), **create the folder**: `features/<domain>/{api,hooks,index.ts}`. Mirror the pattern of `features/betting/`.
2. **Money is always a string** (kobo). Never `number`. The existing axios client does not auto-parse; just keep the types as `string`.
3. **Query keys** go through `lib/api/query-keys.ts`. Add a new factory there for every new resource (`reactionKeys`, `roomKeys`, `campChatKeys`, `dailyWahalaKeys`, `activityKeys`).
4. **Hooks**: read = `useQuery`, write = `useMutation`. Invalidate on success via `queryClient.invalidateQueries({ queryKey: <factory>.all })`. Pattern: see `features/betting/hooks/use-place-bet.ts`.
5. **Realtime updates**: when SSE / WS lands (§5), use `queryClient.setQueryData` to splice events into the relevant query cache. Do NOT trigger a refetch on every push — patch in place.
6. **Redux** is *only* for cross-screen UI state that must survive remounts (auth, deposit session, withdrawal selection). **Do not add new redux slices for server state — server state belongs in TanStack Query.** This is already the pattern; preserve it.
7. **TypeScript strict.** No `any` without a `// reason:` comment.
8. **Pidgin copy** for user-visible errors and empty states.

---

## 2. Category taxonomy is hard-coded — wire `GET /categories`

**Backend ref:** [./BACKEND.md §1](./BACKEND.md).

**Current state.** `constants/colors.ts` exports `getCategoryAccent(category)` with a hard-coded palette for `politics`, `sports`, `crypto`, `culture`, `weather`, `news`, `gist`. `Market.category` is typed as a free-text `string`. There is **no `GET /categories` call** anywhere. The category list shown by `CategoryFilter` is derived from `uniqueCategories(markets)` in `utils/market.ts:195` — i.e. it's just the set of strings the API happens to return.

**Why this matters.** The redesign treats category as **identity** (colour + glow + glyph). If the backend introduces a new category (e.g. `entertainment`), the FE will render it with the default fallback colour and the chip filter will silently include it.

**Do this.**

1. Create `features/categories/api/categories-api.ts`:
   ```ts
   export type Category = { id: string; label: string; primaryColor: string; softColor: string; glowColor: string };
   export const categoriesApi = {
     list: async (): Promise<Category[]> => (await api.get<Category[]>('/categories')).data,
   };
   ```
2. Create `features/categories/hooks/use-categories.ts` with `useQuery({ queryKey: categoryKeys.list(), queryFn: categoriesApi.list, staleTime: 24 * 60 * 60_000 })`. Add `categoryKeys` to `lib/api/query-keys.ts`.
3. Replace `getCategoryAccent` with a server-driven lookup: if the API has returned categories, use the `primaryColor / softColor / glowColor` triplet; otherwise fall back to the current local table.
4. Tighten `Market.category` from `string` to the enum `'politics' | 'sports' | 'crypto' | 'culture' | 'weather' | 'news' | 'gist'`. Add a `categoryMeta` optional field in `utils/market.ts:33` for the colour triplet (BACKEND.md §1 says the server may denormalize it).
5. **Test.** Disconnect the network → category chips and HeroPulseCard still render with the local fallback colours. With network on, the colours come from `GET /categories`.

---

## 3. `Market` is missing every "alive" field

**Backend ref:** [./BACKEND.md §2](./BACKEND.md).

**Current state.** `utils/market.ts:33` defines `Market` with only the *baseline* fields. **None** of these v2 fields exist on the type or are consumed in components:

- `volatilityScore` — `PulseRail` props declare a `volatilityScore` (`components/market/pulse-rail.tsx:41`) but the host screen never passes one, so the rail always uses the default `0.5`.
- `last24hPoolDeltaKobo`, `last24hPoolDeltaPct`, `last1hPoolDeltaKobo`, `last1hPoolDeltaPct` — not in type, not displayed.
- `sparkline24h` — the `Sparkline` component (`components/home/Sparkline.tsx`) is rendered with synthesized points.
- `recentStakers` + `recentStakersCount` — `AvatarStack` is rendered with synthesized initials in `MarketCardFull.tsx`.

**Do this.**

1. Extend `Market` in `utils/market.ts` with all 6 new fields, marked optional (`?:`) so existing markets still parse.
2. Extend `MarketDetail` in `hooks/useMarket.ts` likewise (BACKEND.md §2 says both endpoints return them).
3. Wire `volatilityScore` from `Market` → `HeroPulseCard` → `PulseRail`.
4. Replace the synthesized sparkline points in `Sparkline.tsx` callers with `market.sparkline24h`.
5. Replace the synthesized stakers in `AvatarStack` callers with `market.recentStakers` (+ overflow chip uses `recentStakersCount`).
6. Add a "+N% in last hour" pill on `HeroPulseCard` using `last1hPoolDeltaPct`.
7. **Defensive coding.** If a field is `undefined`, fall back to the current synthesized renderer — don't crash. The user should not see broken UI if the backend ships fields piecemeal.

---

## 4. Daily Wahala is a stand-in

**Backend ref:** [./BACKEND.md §4](./BACKEND.md).

**Current state.** `app/(tabs)/index.tsx:117` picks "the most recent featured market" as the day's curated wahala. There is no `GET /daily-wahala` call. `app/daily-wahala/preview.tsx` shows a static "Curator dey cook" placeholder. `app/daily-wahala/verdict.tsx` exists but reads from the same hand-picked featured market.

**Do this.**

1. Create `features/daily-wahala/api/daily-wahala-api.ts`:
   ```ts
   export type DailyWahala = {
     market: Market;
     dailyWahalaAt: string;
     dailyWahalaUntil: string;
     tomorrowPreview: { question: string; category: string; scheduledFor: string } | null;
   };
   export const dailyWahalaApi = {
     get: async (): Promise<DailyWahala | null> => {
       try { return (await api.get<DailyWahala>('/daily-wahala')).data; }
       catch (e) { if (axios.isAxiosError(e) && e.response?.status === 404) return null; throw e; }
     },
   };
   ```
2. Create `features/daily-wahala/hooks/use-daily-wahala.ts` with `useQuery({ staleTime: 5 * 60_000, refetchInterval: 5 * 60_000 })`.
3. Replace the `todaysWahalaMarket` fallback in `app/(tabs)/index.tsx:117` with the hook. Keep the "most-recent featured" path as a fallback for when the endpoint 404s.
4. Wire `app/daily-wahala/preview.tsx` to render `tomorrowPreview` from the hook (drop the static copy when data is present).
5. Wire `app/daily-wahala/verdict.tsx` to use the `market` from the hook so the share card is the correct daily.

---

## 5. There is NO realtime layer

**Backend ref:** [./BACKEND.md §3](./BACKEND.md). This is the single biggest gap.

**Current state.** Every animated thing — `TickFlash`, `RailBreathe`, `PoolPulse`, `StakeRipple`, `ActivityTape` — is driven by **react-query cache changes**, which only happen on the 60-second `staleTime` refetch or manually after `placeBet`. There is no SSE, no WebSocket, no EventSource. The motion library is *technically* there but **the screen never actually feels alive** because nothing pushes.

**Do this. (Pick Option B from BACKEND.md §3 — SSE per market detail + a personal `/me/stream`.)**

1. Create `lib/api/sse.ts` — a tiny SSE client. React Native does **not** ship `EventSource` natively; use [`react-native-sse`](https://github.com/binaryminds/react-native-sse) (small, maintained, RN-friendly) and wrap it. Expo-compatible (no native build step). Add `npx expo install react-native-sse`.
2. Create `features/realtime/hooks/use-market-stream.ts`:
   ```ts
   useMarketStream(slug, {
     onTick: (e) => queryClient.setQueryData(marketKeys.detail(slug), patch(e)),
     onStake: (e) => queryClient.setQueryData(activityKeys.list(slug), prependEvent(e)),
     onComment: (e) => queryClient.setQueryData(commentKeys.list(marketId), prepend(e)),
     onResolution: (e) => queryClient.setQueryData(marketKeys.detail(slug), markResolved(e)),
   });
   ```
   Open the stream when `app/market/[slug].tsx` mounts, close on unmount.
3. Create `features/realtime/hooks/use-user-stream.ts` that listens to `/me/stream` and patches `auth` slice on `wallet.update` (replacing the current "wait-for-foreground" refresh in `app/(tabs)/index.tsx:160`).
4. **Crucial.** Use `setQueryData`, **never** `invalidateQueries`, on stream events — otherwise the motion library has nothing to animate from (it diffs values).
5. **Test plan.** Open two simulators, both signed in. Stake on simulator A → simulator B sees the rail snap + `TickFlash` within ~500ms (BACKEND.md §3 acceptance).

---

## 6. Camp roster + camp-split header use synthesized data

**Backend ref:** [./BACKEND.md §5](./BACKEND.md).

**Current state.** `app/market/[slug].tsx:285` builds a deterministic roster from a fixed name list and the outcome id. Top stakers, recent stakers, and `myStakeKobo` are NOT read from the API.

**Do this.**

1. Extend `DetailOutcome` in `hooks/useMarket.ts:24` with the BACKEND.md §5.1 fields (`bettorCount`, `topStakers`, `recentStakers`, `myStakeKobo`).
2. The frontend already passes these into `CampSplitHeader`. Just replace the synthesized arrays in `app/market/[slug].tsx:285` with `outcome.topStakers ?? outcome.recentStakers ?? []`.
3. Wire the tap-through roster sheet to `GET /markets/:slug/camps/:outcomeId/members`:
   - Add `features/markets/api/camp-roster-api.ts` (the markets domain doesn't have an api folder today; create `features/markets/{api,hooks,index.ts}` and migrate `hooks/useMarket.ts` + `hooks/useMarkets.ts` into it — this is the right time to consolidate).
   - Replace the synthesized `rosterMembers` block at `app/market/[slug].tsx:292`.
4. Respect `displayMode === 'anonymous'` — render "Anonymous" for anyone who isn't the current user.

---

## 7. Activity tape is faked

**Backend ref:** [./BACKEND.md §8](./BACKEND.md).

**Current state.** `app/market/[slug].tsx:649` builds 6 deterministic fake entries from the market id.

**Do this.**

1. Add `features/markets/api/activity-api.ts` with `GET /markets/:slug/activity?limit=30&cursor=...`.
2. Add `useActivityFeed(slug)` hook with `useInfiniteQuery`. Add `activityKeys` to the keys factory.
3. Wire SSE `market.stake` and `stance.changed` events to **prepend** new entries via `setQueryData` (see §5).
4. Replace the synthesized block at `app/market/[slug].tsx:649` with the hook's data.
5. **Empty state.** If `events.length === 0`, do not render the `ActivityTape` (keep current behaviour).

---

## 8. Camp private chat tab is a dead-end

**Backend ref:** [./BACKEND.md §6](./BACKEND.md).

**Current state.** `Gist.tsx` renders the "My camp chat" tab and the unlock CTA. When the user has a stance and selects the tab, **there is no list and no composer** for camp messages. The composer in `app/market/[slug].tsx` always posts to the public `/markets/:id/comments` endpoint.

**Do this.**

1. Create `features/camp-chat/api/camp-chat-api.ts`:
   ```ts
   getMessages(marketId, outcomeId, cursor?): GET /markets/:id/camps/:outcomeId/chat
   postMessage(marketId, outcomeId, body, clientMessageId): POST /markets/:id/camps/:outcomeId/chat
   ```
2. Hooks: `useCampChat(marketId, outcomeId)` (infinite query) + `useSendCampChat(...)`.
3. Patch `app/market/[slug].tsx` so when `activeGistTab === 'camp'`:
   - Render the camp-chat list, not the public comments.
   - The composer's `onSubmit` calls `useSendCampChat` instead of `useCreateComment`.
   - Live `camp.chat.new` events arrive on the market SSE (filtered by outcomeId server-side); patch the cache with `setQueryData`.
4. **Defection invalidation.** When `POST /me/bets/:betId/switch` (§14) succeeds, also `removeQueries({ queryKey: campChatKeys.list(marketId, oldOutcomeId) })` so the user can't accidentally view the old camp's history.
5. Add a `clientMessageId` per send to dedupe double-taps (BACKEND.md §17.4).

---

## 9. Reactions exist visually, not over the wire

**Backend ref:** [./BACKEND.md §10](./BACKEND.md).

**Current state.** `components/market/ReactionConfetti.tsx` floats emoji on tap. But there is **no `POST /markets/:id/reactions` call** anywhere, and no `reaction.new` SSE handler. Tapping a reaction is purely local — other users see nothing.

**Do this.**

1. `features/reactions/api/reactions-api.ts`:
   ```ts
   post(marketId, emoji, clientReactionId): Promise<void>;
   ```
   Body: `{ emoji, clientReactionId }`. Allowed set: `🔥 😂 😱 💀 👀 🙏 💯 🇳🇬` (BACKEND.md §10).
2. `useSendReaction(marketId)` mutation. Rate-limit client-side too: throttle to 5/sec to be safe.
3. Wire SSE `reaction.new` → spawn a `ReactionConfetti` instance keyed by emoji + user. This is the *whole* point of the feature: the user sees *other users' reactions* fly up.
4. Move the allowed emoji list to a shared constant (`constants/reactions.ts`) so the picker and the server-side enum stay in lockstep.

---

## 10. Personal record (W—L / sparkline) is computed client-side

**Backend ref:** [./BACKEND.md §14](./BACKEND.md).

**Current state.** `app/(tabs)/portfolio.tsx:68` iterates over the user's bets to compute `wins / losses / streak / series`. This is wrong for two reasons:
- It paginates: `useMyBets({ status: 'lost' })` only returns the first 20 rows.
- It can't compute "all-time net profit" without every bet.

The summary endpoint `GET /me/bets/summary` currently returns only `{ activeStakeKobo, activeCount }` (`features/betting/api/betting-api.ts:80`).

**Do this.**

1. Extend the `MyBetsSummary` type in `features/betting/api/betting-api.ts:89` with `winsCount`, `lossesCount`, `winRate`, `netProfitKoboAllTime`, `netProfitSparkline` (BACKEND.md §14).
2. In `getMyBetsSummary`, read the fields with safe fallbacks (`data.winsCount ?? 0`, etc.) so an older backend doesn't break the screen.
3. Replace the client-side compute in `app/(tabs)/portfolio.tsx:68` with the summary fields. Keep the client-side compute as a `useEffect` fallback only when `winsCount === undefined`.
4. `RecordHero` already accepts `wins / losses / streak`; just feed it the new values.

---

## 11. Streak is local-only

**Backend ref:** [./BACKEND.md §11.3](./BACKEND.md).

**Current state.** `lib/streak.ts` persists `daily_streak` in SecureStore on-device. `MeResponse` (`features/auth/api/auth-api.ts:18`) does NOT include `dailyStreak` or `dailyStreakLastDay`. There is **no sync to backend**.

**Consequence.** Reinstall the app → streak resets to 0. Sign in on a second device → streak shows 0. The "12-day streak" UX is fundamentally fake right now.

**Do this.**

1. Extend `MeResponse` with `dailyStreak: number` and `dailyStreakLastDay: string | null`.
2. On `loadStreak()` boot (`lib/streak.ts:113`), compare `local.count` to `me.dailyStreak` — **server wins** unless local is strictly higher and the local `lastStanceDate === today` (covers the offline-stake case).
3. After a successful `placeBet` (`features/betting/hooks/use-place-bet.ts:115`), the next `GET /me` refresh will reconcile. No new endpoint needed if the server increments on bet receipt.
4. `resetStreak()` should also be called on logout (search `features/auth/store/auth-slice.ts` for the logout reducer and wire it).

---

## 12. Per-camp wallet breakdown is derived client-side

**Backend ref:** [./BACKEND.md §13](./BACKEND.md).

**Current state.** `components/wallet/LockedInMarkets.tsx` groups `useMyBets({ status: 'active' })` by outcome. Same pagination caveat as §10.

**Do this.**

1. Add `features/betting/api/wallet-locked-api.ts`:
   ```ts
   getLockedByCamp(): GET /me/wallet/locked-by-camp → { camps: [...], totalLockedKobo: string }
   ```
2. `useLockedByCamp()` hook with `useQuery`, `staleTime: 30_000`. Invalidate after `placeBet` success.
3. Replace the client-side group-by in `components/wallet/LockedInMarkets.tsx` with this hook. Keep the existing renderer.

---

## 13. Redux + cache concerns

`store/index.ts` is fine, but two notes for the agent:

1. **`withdrawalHistory` is whitelisted for persistence** (line 51). This means a cold start renders a stale list. That's OK *because TanStack Query overwrites it on mount* — but verify the order of operations on `app/wallet/index.tsx`: redux hydrates first, then react-query refetches. If the screen reads from redux *and* react-query, prefer react-query (the source of truth) and treat redux as a "splash" cache only.
2. **`accessToken` lives in SecureStore via `redux-persist`** (line 27). Good. Don't move it.
3. The TanStack QueryClient is *not* persisted. If you want the home feed to render instantly on cold start, add `@tanstack/query-async-storage-persister` + `persistQueryClient` against MMKV or SecureStore. **Don't** persist user-stream / SSE keyed queries. This is a P1 improvement, not blocking.

---

## 14. Stance change (defection) is decorative

**Backend ref:** [./BACKEND.md §7](./BACKEND.md).

**Current state.** `components/market/StanceChangeEvent.tsx` exists as a UI card with a gradient cross-wipe but is never rendered with real data. There is no `POST /me/bets/:betId/switch` call and no `stance.changed` SSE handler.

**Do this.**

1. Add `bettingApi.switchOutcome(betId, targetOutcomeId)` → `POST /me/bets/:betId/switch`.
2. `useSwitchOutcome()` mutation. On success: invalidate `marketKeys.detail(slug)`, `betKeys.all`, `authKeys.me()`, and `removeQueries(campChatKeys.list(marketId, oldOutcomeId))` (see §8).
3. Add a "Switch camp" CTA on `app/market/[slug].tsx` somewhere visible (BACKEND.md spec: small fee, public event).
4. Plumb the SSE `stance.changed` event into the activity feed (§7) AND into the gist as a `StanceChangeEvent` card (`components/market/Gist.tsx` or wherever the comments list renders).

---

## 15. Drama-mode late fee is not surfaced in the stake flow

**Backend ref:** [./BACKEND.md §9](./BACKEND.md).

**Current state.** `useDramaMode` is a clock-based hook. `PlaceBetResult` does NOT include `lateFeeKobo`. The `StakeSheet` does not warn the user that they're paying a late fee.

**Do this.**

1. Extend `PlaceBetResult` (`features/betting/api/betting-api.ts:15`) with `lateFeeKobo: string | null`.
2. In `features/betting/components/stake-sheet.tsx`, when `isDrama` is true, show a "Late fee: ₦X" line under the amount.
3. Extend `Market` / `MarketDetail` with `lateFeePoolKobo: string | null` and display it on the detail screen during Drama Mode (BACKEND.md §9: "₦12k late-fee pot · redistributed to early stakers").

---

## 16. Resolution overlay is optimistic

**Current state.** `app/market/[slug].tsx:315` literally has the comment *"treat the user's stance as the winning side stub"*. The frontend has no idea which outcome won.

**Do this.**

1. Extend `MarketDetail` (`hooks/useMarket.ts`) with `resolvedOutcomeId: string | null`.
2. In `app/market/[slug].tsx`, replace the "winnerLikely = !!lockedOutcomeId" stub with `resolvedOutcomeId === lockedOutcomeId` → win, otherwise loss.
3. Replace the synthesized payout with the bet's `payoutKobo` from `useMyBets({ status: 'won' })` for this market.
4. Wire the SSE `market.resolved` event (BACKEND.md §3) to patch the detail cache + fire the Lottie confetti.

---

## 17. Live audio room — Phase 1 read-only state

**Backend ref:** [./BACKEND.md §12 Phase 1](./BACKEND.md).

**Current state.** `LiveAudioRoom.tsx` is rendered with hard-coded `liveSpeakers` from `app/market/[slug].tsx:336`. Even though Phase 2 (actual WebRTC) is explicitly deferred by the user, **Phase 1 (the read-only room state endpoint) is required** so the band only shows when there's an active room — otherwise every market displays "live room" with fake speakers, which is misleading.

**Do this (minimal).**

1. `features/audio-room/api/room-api.ts`:
   ```ts
   getRoomState(marketId): GET /markets/:id/room
   joinAsListener(marketId): POST /markets/:id/room/join   // returns stub token
   leave(marketId): POST /markets/:id/room/leave
   ```
2. `useRoomState(marketId)` with `useQuery`, `staleTime: 15_000`. Listen for SSE `room.update` to patch (see §5).
3. In `app/market/[slug].tsx`, render `<LiveAudioRoom>` **only when `roomState.isActive === true`**. Drop the synthesized speakers.
4. On tap-to-join, call `joinAsListener` and show a "Audio coming soon — you're on the list" toast (BACKEND.md §12 Phase 1 acceptance). Do not attempt to play audio.
5. **Phase 2 (post-launch, deferred).** Don't touch. Leave a `// TODO: Phase 2 — wire LiveKit/Agora token here` comment.

---

## 18. Push notifications — deferred but leave the registration shape

**Backend ref:** [./BACKEND.md §11](./BACKEND.md).

**User said.** "we didnt do the push notification" — so don't ship a full implementation. But:
- `expo-notifications` is **not in `package.json`**.
- There is no `lib/notifications.ts`.
- There is no `POST /me/devices` call.

**Do this (lightweight shim).**

1. Add `expo-notifications` to deps: `npx expo install expo-notifications`.
2. Create `lib/notifications.ts` with two no-op exported functions: `registerForPushAsync()` and `unregisterDeviceAsync()`. Leave a `// TODO: implement (see BACKEND.md §11)` block. This means later wiring is one file, not a refactor.
3. In `app.json`, ensure the `notification` config block exists with `icon`, `color`, and `iosDisplayInForeground: true`. Add `expo-notifications` to the `plugins` array.
4. **Do not** add `POST /me/devices` until the agent ready to wire push lands. The user explicitly deferred this.

---

## 19. Moderation reports endpoint

**Backend ref:** [./BACKEND.md §16](./BACKEND.md).

**Current state.** No `POST /reports`. Long-press on a comment / chat message does nothing.

**Do this (post-camp-chat).**

1. `features/moderation/api/reports-api.ts` with `report({ targetType, targetId, reason })`.
2. Wire a long-press / overflow menu on `CommentRow` and (future) camp-chat row → opens a small sheet with reason chips.
3. Throttle client-side to 20/day per user to match the server-side rate limit (BACKEND.md §17.3).

---

## 20. `app.json` and config

**Currently verify.**

- Deep-link scheme: does `app.json` declare `"scheme": "wahala"`? It must, because `BACKEND.md §11.2` says the daily push deep link is `wahala://market/<slug>`.
- `expo-router` typed routes are on. After adding new routes (e.g. `app/audio-room/[id].tsx`), regenerate types: just run `npm start` once.
- `notification` block (when §18 lands).

---

## 21. Suggested ordering for the implementing agent

A single agent, in roughly 1-day increments:

1. **Day 1 — Data plumbing.** §2 (categories), §3 (market alive-fields), §10 (personal record), §12 (per-camp wallet). All are simple "extend type + read field" tickets and unblock visual realism.
2. **Day 2 — Realtime.** §5 (SSE) end-to-end. Once this lands, every animation the redesign promised actually fires.
3. **Day 3 — Camps + activity + reactions.** §6, §7, §9. The arena finally feels social.
4. **Day 4 — Camp chat + stance change + late fee + resolution.** §8, §14, §15, §16. Drama Mode + defection are the headline v2 features.
5. **Day 5 — Daily Wahala + streak + audio room state.** §4, §11, §17. The daily ritual.
6. **Day 6 — Reports + notifications shim + config.** §19, §18, §20.

**Push notifications (real) and live audio (real WebRTC) are deliberately left for a later sprint.** The user is aware.

---

## 22. Acceptance — how to know this is "done"

For each section above, the section is **done** when:

- A real network call hits the corresponding `BACKEND.md` endpoint (verify in Flipper / proxy).
- The synthesized / hard-coded fallback in the UI is **only used when the server omits the field** — not as the default.
- TanStack Query keys live in the factory, not inline arrays.
- The SSE handler patches the cache, not invalidates.
- The `npm run lint` passes.
- The screen still works offline (i.e. the fallback path doesn't crash).

Once §2–§17 are done, the redesign is **actually wired**. §18 (push) and §17 Phase 2 (real audio) are the final two pieces and they belong to a future agent.

---

## 23. Files this agent will touch (cheat-sheet)

Create:

- `features/categories/{api,hooks,index.ts}`
- `features/daily-wahala/{api,hooks,index.ts}`
- `features/realtime/{hooks,index.ts}` (no api — uses raw SSE)
- `features/markets/{api,hooks,index.ts}` (consolidate `hooks/useMarket.ts` + `hooks/useMarkets.ts` here)
- `features/camp-chat/{api,hooks,index.ts}`
- `features/reactions/{api,hooks,index.ts}`
- `features/audio-room/{api,hooks,index.ts}`
- `features/moderation/{api,hooks,index.ts}`
- `lib/api/sse.ts`
- `lib/notifications.ts`
- `constants/reactions.ts`

Extend:

- `lib/api/query-keys.ts` — `categoryKeys`, `dailyWahalaKeys`, `activityKeys`, `campChatKeys`, `reactionKeys`, `roomKeys`, `reportKeys`.
- `features/auth/api/auth-api.ts` — `MeResponse.dailyStreak`, `dailyStreakLastDay`.
- `features/betting/api/betting-api.ts` — `PlaceBetResult.lateFeeKobo`, `MyBetsSummary` (W—L + sparkline), `switchOutcome`.
- `hooks/useMarket.ts` — alive-fields, camp roster fields, `resolvedOutcomeId`, `lateFeePoolKobo`.
- `utils/market.ts` — `Market` alive-fields + `categoryMeta`.

Replace synthesized blocks in:

- `app/(tabs)/index.tsx` — Today's Wahala source.
- `app/(tabs)/portfolio.tsx` — record stats source.
- `app/market/[slug].tsx` — rosterMembers, activityEntries, liveSpeakers, resolutionVariant.
- `components/wallet/LockedInMarkets.tsx` — locked-by-camp source.
- `components/home/AvatarStack.tsx` callers — recent stakers source.
- `components/home/Sparkline.tsx` callers — sparkline source.

That's the whole list. Knock them out top-to-bottom and the redesign will *actually* be wired to the backend the spec describes.
