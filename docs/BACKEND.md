# Wahala Redesign — Backend Handoff

> **Audience.** Backend agent / engineer. This doc lists **every backend change required** by the mobile redesign so frontend (Bundles 0–6 in [./HANDOFF.md](./HANDOFF.md)) does not block on it.
>
> **Context docs (skim, in this order):**
> 1. [./REDESIGN_v2.md](./REDESIGN_v2.md) — the strategic frame (Camps, Daily Wahala, Drama Mode, Live Gist Rooms). Most new endpoints below trace back to a pillar in v2.
> 2. [./REDESIGN.md](./REDESIGN.md) — visual primitives (where you'll see *which fields* the mobile UI wants).
> 3. [./HANDOFF.md](./HANDOFF.md) — the mobile bundle sequencing (so you know which backend pieces unblock which mobile bundle).
>
> **Format.** Every section declares: **Used by** (mobile bundle), **Endpoint(s)**, **Schema**, **Edge cases**, **Priority** (P0 = required for that bundle; P1 = nice-to-have, can be stubbed; P2 = post-launch).
>
> **Kobo discipline.** Money fields are always strings (preserves bigint precision client-side). Never serialize as JS Number. The frontend already obeys this — keep it.

---

## 0. What we already have (reference)

Audited from `features/*/api/*.ts`, `hooks/use*.ts`, and `lib/api/query-keys.ts`. The list below is what the backend already exposes; the rest of the doc is purely additive unless explicitly marked **"extend"**.

| Domain        | Endpoints                                                                                  |
|---------------|---------------------------------------------------------------------------------------------|
| Auth          | `POST /auth/signup/request-otp`, `POST /auth/signup/complete`, `POST /auth/login`, `GET /me`, `PATCH /me` |
| Markets       | `GET /markets`, `GET /markets/:slug`                                                        |
| Comments      | `GET /markets/:id/comments`, `POST /markets/:id/comments`, `POST /comments/:id/like`         |
| Bets          | `POST /bets`, `GET /me/bets?status=...`, `GET /me/bets/summary`                              |
| Deposits      | `POST /deposits/initiate`, `GET /deposits/:sessionId` (Stripe)                              |
| Withdrawals   | `GET /banks`, `GET/POST /me/bank-accounts`, `GET/POST /me/kyc/bvn`, `POST /withdrawals`, `GET /withdrawals`, `GET /withdrawals/:id` |
| Leaderboard   | `GET /leaderboard?limit=...` (paginated)                                                    |

`Market` shape today: `{ id, slug, question, category (free-text), status, totalPoolKobo, bettorCount, commentCount, closesAt, featured, outcomes[], lastComment, imageUrl }`.

`User` (`/me`) shape today: `{ userId, phoneNumber, username, displayName, leaderboardOptIn, wallet: { availableKobo, lockedKobo } }`.

`Comment` shape today: `{ id, body, createdAt, author, bet, likeCount, replyCount, hasLiked, isOwn, isDeleted, moderationStatus }`.

The whole redesign builds *on top of* this. We do not break any existing endpoint.

---

## 1. Category taxonomy (P0 — Bundle 1)

**Why.** Current `Market.category` is a free-text string. The redesign needs **7 fixed categories** that drive colour, glyph, glow, and chip filters: `politics`, `sports`, `crypto`, `culture`, `weather`, `news`, `gist`.

**Used by.** Bundle 1 (Home + Market Card category accents, chip filter), Bundle 2 (Detail screen accents).

### Changes

- **Schema.** Add a `categories` table with `{ id (slug), label, primaryColor, softColor, glowColor }`. Pre-seed the 7 above.
- **Market.** `markets.category_id` becomes a FK. Free-text legacy values are migrated by admin tool; new markets must pick from the enum.
- **API.**
  - `GET /categories` → `{ id, label, primaryColor, softColor, glowColor }[]` (cached client-side; 24h TTL ok).
  - `GET /markets` keeps `category` but the value is now constrained. Optionally add `categoryMeta: { primaryColor, softColor, glowColor }` denormalized on each Market to spare a join client-side.
- **Filter.** `GET /markets?category=politics` (existing param now constrained to enum).

### Acceptance

- [ ] Existing markets all migrated.
- [ ] Creating a market with an unknown category returns 400.
- [ ] `GET /categories` is publicly cacheable.

---

## 2. Live-pulse fields on the Market resource (P0 — Bundle 1)

**Why.** The hero pulse card, market cards, and detail rail all need data that does not yet exist: **24h pool delta**, **24h sparkline**, **recent stakers** (for avatar stack), and **volatility score** (for `RailBreathe` amplitude).

**Used by.** Bundle 1 (feed cards + hero), Bundle 2 (detail rail).

### Changes

Extend the `Market` payload (both `GET /markets` and `GET /markets/:slug`) with:

```jsonc
{
  // existing fields...
  "volatilityScore": 0.42,                 // 0..1, last 24h std-dev of pool ratio
  "last24hPoolDeltaKobo": "210000000",     // pool growth in last 24h
  "last24hPoolDeltaPct": 18.4,             // percent equivalent for "+18% in last hour" pill
  "last1hPoolDeltaKobo": "32000000",
  "last1hPoolDeltaPct": 4.1,
  "sparkline24h": [120, 122, 121, ...],    // array of 24 pool-ratio percent points (one per hour)
  "recentStakers": [                       // last 5 unique stakers, newest first
    { "userId": "uuid", "displayName": "Ada", "username": "ada_l", "avatarColor": "#E040FB" }
  ],
  "recentStakersCount": 412                // total unique stakers in last hour, drives "+12" overflow chip
}
```

- **Cost control.** Sparkline + deltas should be denormalized (cached on the row, refreshed by a 5-minute cron + on stake) — do NOT compute on every read.
- **Recent stakers.** Respect `displayMode='anonymous'` from `bets` — anonymous stakers are excluded from `recentStakers` (counted in `recentStakersCount` only).

### Acceptance

- [ ] `GET /markets` p95 latency stays under 200ms with these fields populated.
- [ ] Sparkline array is exactly 24 elements (or zero-padded if market is younger than 24h).
- [ ] Anonymous bets never appear in `recentStakers`.

---

## 3. Live updates — WebSocket / SSE (P0 for "alive" feel — Bundle 1/2)

**Why.** The motion library (`TickFlash`, `RailBreathe`, `PoolPulse`, `StakeRipple`, `ActivityTape`) is **wasted** without push. Polling every 30s is what makes the current app feel dead. We need server push for: probability changes, pool size, bettor count, and new stake events.

**Used by.** Bundle 1 (feed + hero ticks), Bundle 2 (rail + activity tape + camp counts), Bundle 3 (live gist comments + reactions).

### Changes

Pick **one** of the two:

#### Option A — WebSocket (`/ws`)

- Single endpoint, auth via the same bearer token as REST.
- Subscribe model: client sends `{ "subscribe": ["market:slug", "user:userId"] }`.
- Server pushes events:

```jsonc
// Market tick — fired on every stake or admin pool adjustment
{ "type": "market.tick", "marketId": "uuid", "totalPoolKobo": "...", "bettorCount": 12, "outcomes": [{ "id": "...", "totalStakedKobo": "...", "percent": 64 }] }

// Activity tape entry
{ "type": "market.stake", "marketId": "uuid", "userId": "uuid", "displayName": "Ada", "outcomeId": "uuid", "stakeKobo": "500000", "createdAt": "..." }

// New comment (replaces / supplements current Gist polling)
{ "type": "comment.new", "marketId": "uuid", "comment": { ... } }

// Reaction confetti event (see §10)
{ "type": "reaction.new", "marketId": "uuid", "userId": "uuid", "emoji": "🔥", "outcomeId": "uuid" }

// Resolution event
{ "type": "market.resolved", "marketId": "uuid", "winningOutcomeId": "uuid", "payouts": { "uuid-of-bet": "..." } }

// Personal wallet update (private — only sent to the user channel)
{ "type": "wallet.update", "userId": "uuid", "availableKobo": "...", "lockedKobo": "..." }
```

#### Option B — Server-Sent Events (`GET /markets/:slug/stream`)

- Cheaper to operate, no upstream WS infra needed.
- One stream per market (the user is *on the detail screen* anyway).
- Same event types as above but only the market scope.
- For wallet/personal events, use a separate `GET /me/stream` SSE.

> **Recommendation.** Start with **SSE for market detail + user stream** (P0), upgrade to WS only when the home feed needs ambient ticks (currently polled via react-query refetch). SSE unblocks Bundle 2/3; the home feed can stay on a 15s react-query `refetchInterval` for v1.

### Acceptance

- [ ] Mobile receives a `market.tick` within 500ms of a stake landing.
- [ ] Reconnect on background → foreground is automatic.
- [ ] Auth is enforced — closing a user's session terminates their stream.

---

## 4. Daily Wahala (P0 for v2 Pillar 1 — Bundle 1 visual, Bundle 6 full ritual)

**Why.** The single most strategically important feature in v2. One curated market everyone debates at the same time. Frontend needs it for the home "Today's Wahala" band.

### Changes

#### 4.1 Schema

- Add to `markets`:
  - `is_daily_wahala BOOLEAN DEFAULT FALSE`
  - `daily_wahala_at TIMESTAMP NULL` — the moment the band activates
  - `daily_wahala_until TIMESTAMP NULL` — when the daily window closes (`daily_wahala_at + 4h` typically)
- Add `dailies` table to track historical Daily Wahalas: `{ id, marketId, scheduledFor (date), curatedBy (userId), status }`.
- Enforce: at most one `is_daily_wahala=true` per UTC day.

#### 4.2 Endpoints

- `GET /daily-wahala` → returns the current (or next upcoming) daily, or `404` if none. Public, cached 60s.
  ```jsonc
  {
    "market": { ...full Market shape... },
    "dailyWahalaAt": "2026-05-17T18:00:00Z",
    "dailyWahalaUntil": "2026-05-17T22:00:00Z",
    "tomorrowPreview": { "question": "Will Davido drop the album?", "category": "culture", "scheduledFor": "2026-05-18" }
  }
  ```
- **Admin only.** `POST /admin/daily-wahala` — set a market as the daily for a given date. Body: `{ marketId, scheduledFor }`.
- **Bundle 6 only.** Push notification job — see §11.

### Acceptance

- [ ] Only one daily per day enforced at DB level.
- [ ] Frontend can poll `/daily-wahala` every 5 minutes safely (cache headers respected).

---

## 5. Camps — outcome rosters + per-camp stats (P0 — Bundle 2)

**Why.** v2 renames `outcome` → `camp`. The detail screen replaces dual side panels with a **camp-split header** that needs per-camp roster + stats.

### Changes

#### 5.1 Extend Outcome payload (on `GET /markets/:slug`)

```jsonc
{
  "id": "...",
  "label": "YES",
  "totalStakedKobo": "...",
  // NEW
  "bettorCount": 3214,                 // distinct stakers in this camp
  "topStakers": [                      // top 5 by stake size
    { "userId": "...", "displayName": "Ada", "stakeKobo": "1500000", "avatarColor": "..." }
  ],
  "recentStakers": [                   // last 5 to join
    { "userId": "...", "displayName": "Ola", "stakeKobo": "30000", "avatarColor": "...", "joinedAt": "..." }
  ],
  "myStakeKobo": "50000"               // null if user is not in this camp; auth-only
}
```

#### 5.2 Camp roster endpoint (paginated, for the tap-through view)

- `GET /markets/:slug/camps/:outcomeId/members?sort=stake|joined&limit=50&offset=0`
- Response: `{ members: [{ userId, displayName, username, stakeKobo, joinedAt, avatarColor, role: 'whale'|'standard' }], total }`
- `role: 'whale'` is denormalized — top 10% by stake.

### Acceptance

- [ ] `myStakeKobo` only ever leaks to the authenticated user.
- [ ] Anonymous stakers respect `displayMode` — they appear in roster only to themselves and as `"Anonymous"` to others (count still includes them).

---

## 6. Camp private chat (P0 for v2 Pillar 2 — Bundle 3)

**Why.** The killer feature of v2 Pillar 2. A camp-scoped chat that the other side cannot read.

### Changes

- New table `camp_chat_messages`: `{ id, marketId, outcomeId, authorUserId, body, createdAt, isDeleted, moderationStatus }`.
- **Authorization.** Read + write require the user to currently hold an active bet on that outcome. Defectors lose read access immediately (see §7).

#### Endpoints

- `GET /markets/:id/camps/:outcomeId/chat?limit=50&before=<cursor>` — paginated, newest first.
- `POST /markets/:id/camps/:outcomeId/chat` — `{ body }`. Returns the created message.
- WS / SSE: `camp.chat.new` events on the user's subscribed streams (only to users in that camp).
- `DELETE /camps/chat/:messageId` — author-only or moderator.

#### Edge cases

- Active stance check is *eventually consistent* but enforced at write time (you cannot post into a camp you've defected from).
- Market resolved → chat becomes read-only but stays accessible (it's now history).

### Acceptance

- [ ] A user with no stake on outcome X gets 403 on `/camps/X/chat`.
- [ ] WS events for camp chat only fan out to members of that camp.

---

## 7. Stance change / camp defection (P1 — Bundle 3)

**Why.** v2 explicitly calls out defection as a *public, dramatic event*. The frontend needs an API + a public event card.

### Changes

- `POST /me/bets/:betId/switch` — `{ targetOutcomeId }`.
- Server-side: charges a small fee (e.g. 2% of stake), moves the user from one camp to another, emits a `stance.changed` event to the market stream:
  ```jsonc
  { "type": "stance.changed", "marketId": "...", "userId": "...", "displayName": "Ada", "fromOutcomeId": "...", "fromLabel": "YES", "toOutcomeId": "...", "toLabel": "NO", "atKobo": "50000", "createdAt": "..." }
  ```
- Returns updated wallet + bet.
- Listed inline in `GET /markets/:slug/activity` (see §8) so it renders as a stance-change event card in the gist.

### Acceptance

- [ ] Cannot defect after `closesAt`.
- [ ] Fee is configurable per market or globally.
- [ ] Camp chat membership flips: old camp's chat returns 403 immediately after.

---

## 8. Activity tape feed (P0 — Bundle 2)

**Why.** The horizontally scrolling ticker of recent stakes ("ActivityTape") needs a feed endpoint.

### Changes

- `GET /markets/:slug/activity?limit=30&cursor=...` — returns chronological stream of: stakes, stance changes, large-pool milestones, resolution. One unified `events` array:
  ```jsonc
  {
    "events": [
      { "type": "stake", "userId": "...", "displayName": "Ada", "outcomeLabel": "YES", "stakeKobo": "500000", "createdAt": "..." },
      { "type": "stance_change", ... },
      { "type": "milestone", "kind": "pool_crossed_1m", "createdAt": "..." }
    ],
    "nextCursor": "..."
  }
  ```
- WS/SSE pushes new events as they happen.

### Acceptance

- [ ] Anonymous stakes appear as `displayName: "Anonymous"`.
- [ ] Ordered by `createdAt DESC`, cursor-paginated.

---

## 9. Drama Mode + late-fee mechanic (P1 — Bundle 2)

**Why.** v2 Pillar 3. Final hour stakes pay a late fee redistributed to early stakers. Backend computes this; frontend just renders.

### Changes

- Stake placed within `closesAt - 1h` is recorded with `lateFeeKobo` (e.g. 5% of stake, configurable per market).
- The fee is added to a `lateFeePoolKobo` field on the market, redistributed pro-rata to early stakers on the winning side at resolution.
- Extend `Market` payload with `lateFeePoolKobo` so the detail screen can show "₦12k late-fee pot · redistributed to early stakers on win".
- Extend `PlaceBetResult` (existing `POST /bets`) with `lateFeeKobo: string | null` so the StakeSheet can show the cost.

### Acceptance

- [ ] Existing stakes (pre-Drama-Mode) carry `lateFeeKobo: null`.
- [ ] Resolution math accounts for the late-fee pot.

---

## 10. Reactions (P0 for confetti — Bundle 3)

**Why.** Tap → animated emoji floats up the screen, in your camp colour. Backend needs to fan out reaction events so other viewers see them in real time.

### Changes

- New table `market_reactions`: `{ id, marketId, userId, emoji, outcomeId (nullable, derived from user's active bet), createdAt }`.
- `POST /markets/:id/reactions` — `{ emoji }`. Rate-limited to ~10/sec/user. Returns 204.
- WS/SSE: `reaction.new` event broadcast to the market stream (see §3).
- **No storage of long history** — table is rolling, prune > 24h. Frontend just shows them as ephemeral confetti.

### Allowed emoji set

Hardcode a small set: `🔥 😂 😱 💀 👀 🙏 💯 🇳🇬`. Anything else → 400. Keeps moderation trivial.

### Acceptance

- [ ] Rate-limit returns 429 with `Retry-After`.
- [ ] Reactions visible to all viewers within 500ms (matches §3 SSE/WS).

---

## 11. Daily Wahala push notifications (P1 — Bundle 6)

**Why.** The daily ritual is the BeReal hook of the app. Single push at the chosen time tells the user *"Today's Wahala is live"*.

### Changes

#### 11.1 Device registration

- `POST /me/devices` — `{ expoPushToken, platform: 'ios'|'android', appVersion }`. Idempotent.
- `DELETE /me/devices/:token` — on logout / token rotation.

#### 11.2 Scheduled push job

- Backend cron at ~7pm WAT (configurable). For each user opted in:
  - Skip if user already placed a stance on today's Daily Wahala.
  - Send Expo push: `{ title: "⚡ Today's Wahala is live", body: "<question>", data: { marketSlug, deepLink: 'wahala://market/<slug>' } }`.
- Plus: Drama-Mode-imminent push at `closesAt - 1h` for users with active stances ("Drama Mode incoming — your camp needs you").
- Plus: Resolution push ("You called it. +₦5,420").

#### 11.3 Streak

- Add to `users`: `daily_streak INT DEFAULT 0`, `daily_streak_last_day DATE NULL`.
- Streak increments when user places a stance on a Daily Wahala. Resets if a day passes with no stance.
- Surface via `GET /me`: `{ ..., dailyStreak: 12, dailyStreakLastDay: '2026-05-15' }`.

### Acceptance

- [ ] No double-push for the same user on the same day.
- [ ] Streak resets correctly across timezones — anchor to user's `phoneNumber` country prefix or UTC by default.

---

## 12. Live Gist Rooms — audio (P2, can stub initially — Bundle 3)

**Why.** v2 Pillar 4. Twitter-Spaces-style audio rooms during Drama Mode. **This is the hardest backend piece.** Mobile Bundle 3 ships UI with stub data; real audio plumbing is a separate engineering project.

### Changes (minimum viable, can be split into two phases)

#### Phase 1 — Room state only (P1, ships with Bundle 3)

- `GET /markets/:id/room` → `{ isActive, listenerCount, speakers: [{ userId, displayName, avatarColor, isMuted }], scheduledFor (nullable) }`.
- `POST /markets/:id/room/join` (as listener) → returns a stub token.
- `POST /markets/:id/room/leave`.
- WS event `room.update` fires when speaker list / listener count changes.
- No actual audio yet. UI shows speakers + a "coming soon" toast on tap.

#### Phase 2 — Actual audio (P2, post-launch)

- Integrate LiveKit / Agora / Daily.co for WebRTC SFU. Backend issues short-lived access tokens.
- Recording: store room audio for 24h ephemeral replay (`GET /markets/:id/room/replay` → signed URL).

### Acceptance for Phase 1

- [ ] `GET /markets/:id/room` returns `isActive: false` for all markets initially — fine.
- [ ] Frontend renders the band only when `isActive: true`.

---

## 13. Per-camp wallet breakdown (P1 — Bundle 4)

**Why.** v2 Wallet redesign shows "Locked in markets" broken down by camp.

### Changes

- Extend `GET /me/bets?status=active` response (no breaking change — additive):
  - Add `camp: { outcomeId, outcomeLabel, color }` to each bet (already partially there via `outcomeLabel`).
- New endpoint (optional convenience): `GET /me/wallet/locked-by-camp` →
  ```jsonc
  {
    "camps": [
      { "marketSlug": "...", "marketQuestion": "...", "outcomeLabel": "YES", "color": "#14B8A6", "lockedKobo": "1200000", "expectedPayoutKobo": "1900000" }
    ],
    "totalLockedKobo": "..."
  }
  ```

### Acceptance

- [ ] Sum matches existing `wallet.lockedKobo`.

---

## 14. Personal record + sparkline (P1 — Bundle 5)

**Why.** Portfolio "trophy room" needs W—L counts, all-time P&L sparkline, and streak.

### Changes

- Extend `GET /me/bets/summary`:
  ```jsonc
  {
    // existing
    "activeStakeKobo": "...",
    // NEW
    "winsCount": 18,
    "lossesCount": 6,
    "winRate": 0.75,
    "netProfitKoboAllTime": "5400000",
    "netProfitSparkline": [0, 120, 80, 200, ...]   // daily P&L deltas, last 30 days, kobo
  }
  ```
- Compute server-side (cron or on-demand) — never have the client iterate bets.

### Acceptance

- [ ] Sparkline always 30 elements (zero-padded for new users).
- [ ] `winRate` always rendered as a fraction (`0..1`), client formats `%`.

---

## 15. Verdict cards (P2 — Bundle 6)

**Why.** Shareable 9:16 image after a Daily Wahala resolves. Optional backend image render.

### Two options

- **Option A (frontend renders).** Use `react-native-view-shot` to capture a JSX template. Backend only needs the data already in `Market` + the user's outcome — **no backend work**.
- **Option B (backend renders).** `POST /me/daily-wahala/:dailyId/verdict-card` returns a signed image URL (1080×1920). Useful for sharing in non-Wahala contexts (WhatsApp, IG Story).

**Recommendation:** Option A for v1 (zero backend cost). Move to Option B only if growth proves the share loop is the primary acquisition channel.

---

## 16. Moderation hardening (P0 — covers Bundle 3)

**Why.** Camp chats + reactions + gist comments need moderation primitives, especially before opening Camp Chat to Drama Mode crowds.

### Changes

- Extend existing `moderationStatus` to apply to camp chat messages.
- New endpoint: `POST /reports` — `{ targetType: 'comment'|'chat'|'user', targetId, reason }`. Throttle-limited.
- Admin: `GET /admin/reports`, `POST /admin/reports/:id/resolve`.
- Auto-hide on 3+ unique-user reports until reviewed (configurable).

---

## 17. Cross-cutting concerns

### 17.1 Backwards compatibility

- **Never remove a field** from an existing response shape during the redesign window. Add new fields freely; deprecate old ones with a 60-day notice in CHANGELOG.
- The mobile client tolerates unknown fields by design (axios + TypeScript loose-types).

### 17.2 Caching headers

- `GET /categories`, `GET /banks` → `Cache-Control: public, max-age=86400`.
- `GET /markets` → `private, max-age=15` (matches frontend react-query staleTime of 60s, plus a hard cap).
- `GET /markets/:slug` → `private, max-age=15` (replaced by SSE when on the screen).
- `GET /daily-wahala` → `public, max-age=60`.

### 17.3 Rate limits

| Endpoint                          | Limit                   |
|-----------------------------------|--------------------------|
| `POST /markets/:id/reactions`     | 10 / sec / user          |
| `POST /markets/:id/comments`      | 6 / min / user           |
| `POST /camps/.../chat`            | 30 / min / user          |
| `POST /reports`                   | 20 / day / user          |
| `POST /bets`                      | 5 / sec / user (anti-spam) |

### 17.4 Idempotency

- `POST /bets` already accepts `clientBetId` — keep that contract.
- Add the same to `POST /reactions` (`clientReactionId`) and `POST /camps/.../chat` (`clientMessageId`) so double-taps don't double-post.

### 17.5 Observability

- Emit metrics on: SSE/WS connect count, mean latency from stake → tick fan-out, daily-wahala push delivery rate, reaction rate per market.
- Mobile sends `appVersion` and `platform` on every request (already in axios interceptor); use these to slice metrics.

---

## 18. Prioritized shipping order (matches mobile bundles)

| Phase | Backend deliverable                                              | Unblocks mobile bundle |
|-------|-------------------------------------------------------------------|------------------------|
| **B-0** | §1 Categories enum + `categoryMeta`                              | Bundle 1               |
| **B-1** | §2 Live-pulse fields on Market (sparkline + deltas + recentStakers) | Bundle 1               |
| **B-2** | §3 SSE for market detail + user stream                            | Bundle 2 + 3           |
| **B-3** | §5 Camp roster + extended outcome payload                         | Bundle 2               |
| **B-4** | §8 Activity tape endpoint                                         | Bundle 2               |
| **B-5** | §6 Camp private chat                                              | Bundle 3               |
| **B-6** | §10 Reactions                                                     | Bundle 3               |
| **B-7** | §13 Per-camp wallet breakdown                                     | Bundle 4               |
| **B-8** | §14 Personal record summary                                       | Bundle 5               |
| **B-9** | §9 Drama Mode late-fee                                            | Bundle 2 polish        |
| **B-10**| §7 Stance change endpoint                                         | Bundle 3 polish        |
| **B-11**| §4 + §11 Daily Wahala + push                                      | Bundle 6               |
| **B-12**| §12 Live audio rooms (Phase 1 stub then Phase 2)                  | Bundle 3 / post-launch |
| **B-13**| §16 Moderation hardening                                          | Bundle 3               |

**Recommended sequencing.** Ship B-0 → B-1 → B-2 first — they unblock the entire mobile Bundle 1+2. B-3 through B-6 are the "v2 social arena" core and can ship in any order after B-2. Daily Wahala (B-11) and audio rooms (B-12) are the headline post-launch features.

---

## 19. What does NOT change (so backend doesn't over-scope)

- Auth flow (signup, login, OTP). No changes.
- Deposit / withdrawal flows. No changes (frontend only re-skins them).
- Leaderboard endpoint. No changes (mobile only adopts new motion library).
- Existing `POST /bets` contract. Additive fields only (`lateFeeKobo`).
- Existing comment / like endpoints. No changes (camp chat is a *new* surface, not a replacement).
- KYC / BVN. No changes.

---

## 20. Open questions for the product owner

These need a yes/no before backend can finalise schema. List them, get answers, then commit migrations.

1. **Late fee.** Flat 5% or scaling with proximity to `closesAt`? Per-market override allowed?
2. **Defection fee.** Flat 2%, or zero for the first defection per market?
3. **Daily Wahala push time.** 7pm WAT for everyone, or per-user-preference?
4. **Camp chat retention.** Indefinite, or rolling 30 days after resolution?
5. **Reaction set.** Lock the 8 emojis or open it up later?
6. **Audio rooms.** Are we comfortable taking a LiveKit/Agora dependency, or do we want self-hosted? (Cost implications.)
7. **Anonymous mode in camp chat.** Show anonymous posters by their `displayMode` or always disable anonymity inside chat (you joined the camp publicly)?

Get these answered before §6, §7, §9, §10, §11, §12 schemas get committed.
