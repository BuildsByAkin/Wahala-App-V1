# Wahala Redesign — Implementation Handoff

> **You are the implementing agent.** This doc tells you *what to build, in what order, with what dependencies, and how we will know it's done.* Everything else is reference.
>
> **Reference docs (read in this order):**
> 1. [./REDESIGN.md](./REDESIGN.md) — visual primitives (palette, surfaces, typography). Treat as the **design system source**.
> 2. [./REDESIGN_v2.md](./REDESIGN_v2.md) — strategic reframe (Wahala = arena, Camps, Daily Wahala, Drama Mode, Live Gist Rooms). Treat as the **structural source** — when v1 and v2 disagree, **v2 wins**.
> 3. [./ANIMATIONS.md](./ANIMATIONS.md) — every motion in the app with concrete Reanimated 3 specs. Treat as the **motion source**.
>
> Stack: Expo + React Native, Expo Router, TypeScript strict, `react-native-reanimated` v3, `@shopify/flash-list`, `expo-image`, `expo-haptics`. **No new runtime deps without explicit approval** — except `lottie-react-native` (Resolution confetti only) and `react-native-gesture-handler` v2 (already a transitive Expo dep, just confirm).

---

## 0. How this handoff works

The work is broken into **6 bundles**. Each bundle is **two screens** (or screen-equivalents). One agent works one bundle at a time, end-to-end, and then a different agent picks up the next bundle.

**Why pairs?** Two screens is enough work to justify shared primitives but small enough that the agent owns the entire context. It also matches how QA naturally groups review — Home + Market Card is one flow; Wallet + Portfolio is another.

**Bundle anatomy.** Every bundle declares:

- **Goal** — what the user can do after this ships.
- **Prerequisites** — foundation tokens / shared components that MUST already exist (built in Bundle 0). Do not start a bundle if a prereq is missing — go build it first.
- **Files to edit / create** — every path the agent will touch.
- **Animations** — pulled from [./ANIMATIONS.md](./ANIMATIONS.md), listed by name.
- **Acceptance criteria** — a checklist the agent must self-verify before declaring "done".
- **Out of scope** — to prevent scope creep into adjacent bundles.

**Done means done.** Each bundle ends with the agent running `npm run lint` clean, manually running through every acceptance row, and pushing a commit titled `feat(bundle-N): <screens>`.

---

## Bundle 0 — Foundations (do this FIRST, before any screen)

This bundle is non-negotiable. Every later bundle assumes these tokens and primitives exist. If you start Bundle 1 without Bundle 0, you will rewrite half of it later.

### Goal

Every design token from [./REDESIGN.md §3](./REDESIGN.md) and every reusable motion primitive from [./ANIMATIONS.md §5](./ANIMATIONS.md) exists, is type-safe, and is consumable from any screen.

### Prerequisites

None. This is the foundation.

### Files to create / edit

- `constants/colors.ts` — **extend** with `category` namespace (Politics/Sports/Crypto/Culture/Weather/News/Gist), `surface/00..03` triplet, named `glow` tokens. Keep `brand: #FF6500` strictly as the *action* colour.
- `constants/typography.ts` — add `display` sizes (44/56sp, tracking -1.5).
- `lib/motion/springs.ts` — export `springs.snappy | bouncy | gentle`.
- `lib/motion/timings.ts` — export `time.fast | standard | emphasis | slow`.
- `lib/motion/haptics.ts` — typed wrappers for the 7 haptic tokens.
- `components/motion/PressableSpring.tsx` — universal Pressable with `ButtonPress` baked in. Props: `onPress`, `variant: 'primary'|'secondary'|'ghost'`, `haptic?: HapticToken`, children.
- `components/motion/TickFlash.tsx` — `<TickFlash value={number} format={(n)=>string}>`.
- `components/motion/RollingNumber.tsx` — odometer-style digit roll.
- `components/motion/SkeletonShimmer.tsx` — gradient shimmer overlay component.
- `components/motion/SheetBase.tsx` — bottom-sheet primitive (refactor existing sheets onto this in later bundles, don't migrate now).
- `components/motion/WahalaSpinner.tsx` — pull-to-refresh component (custom RefreshControl replacement).
- `components/motion/Toast.tsx` + `hooks/useToast.tsx` — global toast provider + imperative API.
- `app/_layout.tsx` — wrap root in `<ToastProvider>` and `<GestureHandlerRootView>` (verify).
- `hooks/useReducedMotion.ts` — wraps `AccessibilityInfo`, returns a boolean shared value. All motion primitives consume it.

### Animations introduced

- `ButtonPress`, `TickFlash`, `WalletNumberRoll` (via RollingNumber), `SkeletonShimmer`, `SheetPresent` (via SheetBase), `PullToRefresh` (via WahalaSpinner), `Toast`.

### Acceptance criteria

- [ ] `npm run lint` passes.
- [ ] An ad-hoc demo screen (can be temporary, in `app-example/`) renders one of every primitive and they each animate correctly on iOS + Android.
- [ ] Tapping `PressableSpring` always fires the configured haptic.
- [ ] `TickFlash` flashes green on up, red on down, no colour on equal.
- [ ] `RollingNumber` rolls digits visibly (Robinhood-style) for any numeric change.
- [ ] `useReducedMotion()` returning `true` collapses every spring to a 120ms timing and freezes loops.
- [ ] No screen file imports `withSpring` or `withTiming` directly — only through `lib/motion/*` or `components/motion/*`.

### Out of scope

- Touching any of the six target screens.
- Lottie integration (only needed in Bundle 3).
- Shared element transitions (Bundle 1 introduces them).

---

## Bundle 1 — Home + Market Card

The user's first impression. The market card is the most-rendered surface in the app, so it deserves the most love.

### Goal

A user opening the app sees the redesigned home (persistent header with balance + streak, Today's Wahala band, hero pulse card, vertical-swipe arena feed, category chips, redesigned feed cards). Every card animates on mount, on tick, on press. One-tap stake from the feed works.

### Prerequisites

- Bundle 0 complete.

### Files to edit / create

- `app/(tabs)/index.tsx` — full rewrite per [./REDESIGN.md §4](./REDESIGN.md) + [./REDESIGN_v2.md §4.1](./REDESIGN_v2.md).
- `components/home/HeaderBar.tsx` — *new*. Persistent header: logo, streak flame, balance pill (TickFlash), bell.
- `components/home/TodaysWahalaBand.tsx` — *new*. v2 daily band with countdown + two camp doors.
- `components/home/HeroPulseCard.tsx` — *new*. The 250dp showpiece card with radial glow, embedded rail (RailBreathe), inline stake buttons.
- `components/home/ArenaVerticalFeed.tsx` — *new*. TikTok-style vertical pager built on `FlashList` with `pagingEnabled`. Each page is one `ArenaFullCard`. Double-tap to plant flag, swipe right to open detail.
- `components/home/ArenaFullCard.tsx` — *new*. Full-screen card design (image bg, gradient, 32sp question, two camp doors).
- `components/home/MarketCardFull.tsx` — refactor per [./REDESIGN.md §5.1](./REDESIGN.md): category bar, image bleed, combined two-segment rail, 24h sparkline, avatar stack, dual inline CTAs.
- `components/home/MarketCardCompact.tsx` — refactor per §5.2.
- `components/home/CategoryFilter.tsx` — adopt `ChipToggle` motion.
- `components/home/AvatarStack.tsx` — *new*. Overlapping avatars + `+N` overflow.
- `components/home/Sparkline.tsx` — *new*. 24-tick SVG line drawn behind the rail at 30% opacity. Reanimated `strokeDashoffset` reveal on mount.
- `utils/market.ts` — extend `getCardSchemeColors` to use the new category palette.

### Animations to wire

`CardEnter` (feed) · `RailBreathe` (hero + each card) · `TickFlash` (pool sizes, %) · `PoolPulse` (hero pool on update) · `ChipToggle` · `ButtonPress` (every CTA) · `PageTransition` shared element on `market-image-${id}` · `SkeletonShimmer` · `PullToRefresh` (WahalaSpinner) · `DoubleTapStake` (arena card) · `CampDoorTap` (Today's Wahala doors) · `StreakFlame` (header).

### Acceptance criteria

- [ ] Header persists across scroll; balance pill flashes when wallet updates.
- [ ] Today's Wahala band visible at top with live countdown (use `setInterval` + `useDerivedValue`); both doors animate per `CampDoorTap` on tap.
- [ ] Hero card has a category-coloured radial glow bleeding from top-right.
- [ ] Hero rail breathes continuously; both percentages do `TickFlash` on push.
- [ ] Pull-to-refresh shows the custom Wahala spinner (W logo rotates).
- [ ] Skeleton uses `SkeletonShimmer`, not flat opacity pulse.
- [ ] Tapping a card image navigates to detail with a shared element transition (image animates).
- [ ] Tapping an inline stake button on any feed card opens `StakeSheet` directly (no detour through detail).
- [ ] Vertical-swipe arena feed: double-tap plants flag on leading camp + spawns a 96dp flag emoji that fades; swipe up loads next; swipe right opens detail.
- [ ] Empty state copy is in Pidgin ("E quiet for this category…").
- [ ] Funding banner copy is rewritten as in v1 §4.6.
- [ ] Category chips animate per `ChipToggle`.
- [ ] Lint clean. No regressions in deposit/withdraw or auth flows.

### Out of scope

- Market detail screen (Bundle 2).
- Live audio room (Bundle 3).
- Wallet/portfolio (Bundle 4/5).
- Camp private chat (Bundle 3).

---

## Bundle 2 — Market Detail + Market Card (state variants)

Market detail is where the user spends real time. The market card already shipped in Bundle 1 — here we add its *state variants* (closing-soon, just-staked, resolving-today, resolved) because Bundle 2 introduces the data that drives them.

### Goal

Tapping any market shows a fully alive detail screen: camp-split header (replaces dual side panels), live rail, activity tape, comments. Drama Mode kicks in within the final hour. Market cards now reflect the user's footprint and lifecycle state.

### Prerequisites

- Bundle 0 + Bundle 1 complete.
- Existing `StakeSheet`, `LockedNoticeSheet`, `CommentComposerSheet` continue to work (we refactor them to use `SheetBase` here).

### Files to edit / create

- `app/market/[slug].tsx` — restructure per [./REDESIGN.md §6](./REDESIGN.md) + [./REDESIGN_v2.md §4.3](./REDESIGN_v2.md).
- `components/market/CampSplitHeader.tsx` — *new*. Two-half seam header replacing the dual `SidePanel` components. Each half = camp colour, count, ₦ staked, avatar stack, Plant Flag button.
- `components/market/PulseRail.tsx` — extend with `RailBreathe` + `StakeRipple` on staking.
- `components/market/ActivityTape.tsx` — *new*. A horizontally scrolling ticker of recent stakes; each new entry slides in from the right.
- `components/market/DramaMode.tsx` — *new*. Wrapper that takes over the viewport when `now > closesAt - 1h`. Hosts 96sp `CountdownTick` and the live audio room slot.
- `components/market/CountdownClock.tsx` — *new*. Display-sized countdown with `CountdownTick` motion.
- `components/market/StakeSheet` — refactor to consume `SheetBase` (don't change behaviour, just the motion + container).
- `components/home/MarketCardFull.tsx` — add state-variant chips per [./REDESIGN.md §5.3](./REDESIGN.md): closing-soon, just-staked, resolving-today, resolved.
- `components/home/MarketCardCompact.tsx` — same state variants.
- `hooks/useDramaMode.ts` — *new*. Returns `{ isDrama, secondsLeft }`.

### Animations to wire

`CardEnter` (already shipped) · `RailBreathe` + `StakeRipple` · `TickFlash` (camp counts, pool) · `ButtonPress` · `SheetPresent` (StakeSheet refactor) · activity tape `entering={SlideInRight}` · `CountdownTick` · screen-level cross-fade into Drama Mode · card state-variant `closing-soon` clock pulse loop.

### Acceptance criteria

- [ ] Detail page hero image animates from the card via shared element transition (continues Bundle 1 work).
- [ ] `CampSplitHeader` replaces the previous dual `SidePanel` layout. Two halves, joined at vertical seam.
- [ ] Rail breathes; staking triggers `StakeRipple` (ring expands, rail snaps with overshoot, % flashes).
- [ ] Activity tape ticker streams in new stakes from the right.
- [ ] When `now > closesAt - 1h`, `DramaMode` takes over the viewport: 96sp countdown, oscillating rail, heavier haptics in final minute.
- [ ] State-variant chips render on `MarketCardFull` and `MarketCardCompact`: "just-staked" chip visible for 24h after user staked; "closing-soon" border + clock pulse when `<2h`; "resolving-today" + "resolved" desaturation.
- [ ] All sheets (`StakeSheet`, `LockedNoticeSheet`, `CommentComposerSheet`) now present via `SheetBase` — they bounce in.
- [ ] Lint clean.

### Out of scope

- The Gist redesign (Bundle 3).
- Live audio room implementation (Bundle 3).
- Camp private chat (Bundle 3).
- Resolution confetti (Bundle 3 — needs Lottie).

---

## Bundle 3 — The Gist + Live Gist Rooms

Reframes the gist from "comment section" to "arena chatter" — the primary social surface. Adds the audio room (v2 Pillar 4) and the camp-only private chat tab (v2 Pillar 2).

### Goal

The gist is the most-engaging part of the market detail. Users can voice-note, react with floating emoji, see stance-change events as special cards, enter live audio rooms during Drama Mode, and chat privately with their camp.

### Prerequisites

- Bundle 0 + Bundle 1 + Bundle 2 complete.
- Add `lottie-react-native` to package.json (Resolution celebration confetti).

### Files to edit / create

- `app/market/[slug].tsx` — wire the new gist component into the existing layout.
- `components/market/Gist.tsx` — *new*. Container with tabs `Public gist` / `My camp chat`, indicator animated via `LinearTransition.springify()`.
- `components/market/CommentRow.tsx` — extract from current `app/market/[slug].tsx`. Add like-heart spring animation.
- `components/market/StanceChangeEvent.tsx` — *new*. Special event card with old→new camp gradient cross-wipe.
- `components/market/CommentComposer.tsx` — refactor existing `CommentComposerSheet` to grow inline via `GistComposerExpand`.
- `components/market/LiveAudioRoom.tsx` — *new*. 60dp band → tap → expands to 280dp half-sheet (`RoomEnter`). Speaker avatars, waveform, listener count. Phase-1: UI only; audio plumbing can be a stub until a real WebRTC layer lands.
- `components/market/ReactionConfetti.tsx` — *new*. Tap reaction button → emoji floats up 220dp, opacity 1→0, 1400ms.
- `components/market/Resolution.tsx` — *new*. Win/loss reveal overlay; win uses Lottie confetti in camp colour.
- `components/market/CampRoster.tsx` — *new*. Reachable from `CampSplitHeader` tap; lists members sorted by stake.
- `assets/lottie/confetti-teal.json`, `assets/lottie/confetti-purple.json` — confetti assets in the two default camp colours (use Lottiefiles or design a simple one).

### Animations to wire

`GistComposerExpand` · like heart spring · `entering={SlideInUp.springify()}` for live comments · gradient cross-wipe for stance-change · reaction confetti float · `RoomEnter` · `Resolution` (win + loss variants) · camp roster row stagger.

### Acceptance criteria

- [ ] Gist has two tabs (`Public gist` / `My camp chat`); tab indicator animates with spring.
- [ ] My camp chat tab requires an active stance; locked CTA otherwise.
- [ ] Tapping the composer expands inline (height spring), not as a sheet.
- [ ] Like heart on comments scales + colours per spec, with `haptic.tap`.
- [ ] When a market is in Drama Mode and a room is active, the audio room band shows above the gist; tap → expands per `RoomEnter`.
- [ ] When a market resolves while the user is viewing: win → Lottie confetti in camp colour + toast + balance `TickFlash`; loss → dim + slide-up message.
- [ ] Stance-change events appear as distinct cards with gradient transitions.
- [ ] Reaction confetti floats up on tap and disappears.
- [ ] Lint clean; bundle size growth < 250KB despite Lottie.

### Out of scope

- Real audio backend (we stub with placeholder data — Phase 2 hooks up WebRTC).
- Wallet/portfolio (Bundle 4/5).

---

## Bundle 4 — Wallet + Deposit/Withdraw

Reframes the wallet from "payment form" to "war chest". Keeps the existing five-pane state machine in `app/wallet/deposit.tsx` (it works) but upgrades the visuals and adds the per-camp breakdown.

### Goal

The wallet is alive: balance rolls in via odometer, deposits feel celebratory, locked-in-markets is broken down by camp.

### Prerequisites

- Bundle 0 complete. (Strictly speaking, can run in parallel with Bundles 1–3 — no shared screen surfaces.)

### Files to edit / create

- `app/wallet/index.tsx` — restructure per [./REDESIGN.md §9](./REDESIGN.md) + [./REDESIGN_v2.md §4.5](./REDESIGN_v2.md). Hero balance uses `RollingNumber`. Add "Today's earnings" row with sparkline.
- `app/wallet/deposit.tsx` — replace stock animations with: `SheetPresent` style state transitions; `DepositSuccess` motion (SVG check-mark draw + glow); failure pane uses X-draw + `haptic.error`; quick-amount chips use `ChipToggle`; final amount uses `RollingNumber`.
- `app/wallet/withdraw.tsx` — same motion treatment (mirror of deposit).
- `components/wallet/BalanceHero.tsx` — *new*. ₦ + `RollingNumber` in display size.
- `components/wallet/LockedInMarkets.tsx` — *new*. Per-camp breakdown. Each row has a 4dp coloured camp ribbon that animates `width: 0 → 4dp` on mount.
- `components/wallet/TodaysEarnings.tsx` — *new*. Robinhood-style sparkline + delta.
- `components/wallet/QuickAmountChip.tsx` — *new*. Use `ChipToggle`.
- `components/wallet/CheckMarkDraw.tsx` — *new*. SVG with `strokeDashoffset` shared value.

### Animations to wire

`WalletNumberRoll` (every numeric) · `ChipToggle` (quick amounts) · `ButtonPress` (primary on Continue) · `SheetPresent` (pane transitions) · `DepositSuccess` (check-draw + glow + RollingNumber + success haptic) · failure pane X-draw + error haptic + Toast · `CardEnter` stagger on locked-in-markets list · ribbon `width: 0 → 4dp` mount.

### Acceptance criteria

- [ ] Wallet hero balance odometer-rolls into place on mount and on update.
- [ ] Today's Earnings row visible with a per-day sparkline.
- [ ] Locked-in-markets list shows per-camp breakdown with coloured ribbons.
- [ ] Deposit flow: chips animate on tap, continue button has `ButtonPress`, success pane plays check-draw + RollingNumber + `haptic.success` + Toast.
- [ ] Deposit fail pane: X-draw + `haptic.error` + Toast.
- [ ] Withdraw mirrors deposit motion.
- [ ] No regression in existing state-machine logic (resume from background still works).
- [ ] Lint clean.

### Out of scope

- Portfolio (Bundle 5).
- Bank account onboarding flow (existing).

---

## Bundle 5 — Portfolio + Leaderboard polish

Portfolio becomes a **trophy room**. Leaderboard already shipped its podium (in `app/(tabs)/leaderboard.tsx`); here we make sure it consumes the new motion library and add the streak/record hooks v2 introduces.

### Goal

Portfolio leads with personal record (W/L, streak, all-time P&L sparkline). Active/Won/Lost tabs. Leaderboard remains as-is structurally but adopts the new system motions.

### Prerequisites

- Bundle 0 complete.
- Ideally Bundle 1 (so the streak flame component is shared between header and portfolio).

### Files to edit / create

- `app/(tabs)/portfolio.tsx` — restructure per [./REDESIGN.md §10](./REDESIGN.md) + [./REDESIGN_v2.md §4.6](./REDESIGN_v2.md). Replace top "Portfolio" + balance + stats row with a **Record** hero (W—L, win %, streak, all-time sparkline).
- `components/portfolio/RecordHero.tsx` — *new*. Big W—L counter with `RollingNumber`, percentage, streak flame.
- `components/portfolio/AllTimeSparkline.tsx` — *new*. SVG `strokeDashoffset` reveal over 900ms.
- `components/portfolio/PositionRow.tsx` — refactor existing `PositionRow` to use `PressableSpring`, `CardEnter`, and category-ribbon camp colour on the left edge.
- `components/portfolio/HistoryRow.tsx` — same treatment.
- `components/portfolio/TabBar.tsx` — three-tab (Active / Won / Lost) with `LinearTransition.springify()` indicator + cross-fade content.
- `app/(tabs)/leaderboard.tsx` — replace ad-hoc `withSpring`/`withTiming` with the system presets from `lib/motion/*`. Adopt `PressableSpring` for rank rows. Keep the existing podium structure and halo pulse.

### Animations to wire

`RollingNumber` (record stats, P&L) · `StreakFlame` · sparkline `strokeDashoffset` reveal · tab `LinearTransition.springify()` + cross-fade · `CardEnter` (position rows) · `ButtonPress` (row tap) → `PageTransition` shared element · ribbon `width: 0 → 4dp` mount · leaderboard rank rows: `PressableSpring`.

### Acceptance criteria

- [ ] Portfolio top reads **18W — 6L (75%)** with `RollingNumber` digits and a streak flame next to it.
- [ ] All-time sparkline draws on mount.
- [ ] Three tabs: Active / Won / Lost. Indicator springs between them, content cross-fades.
- [ ] Position rows: 4dp camp ribbon on left, `CardEnter` stagger, `PressableSpring` on tap.
- [ ] Leaderboard rank rows use `PressableSpring`, winner halo continues to pulse, no inline spring configs remain.
- [ ] Lint clean.

### Out of scope

- Profile screen.
- Friend system.

---

## Bundle 6 (optional, post-launch) — Daily Wahala system + push notifications

The v2 Pillar 1 cannot ship from a single screen — it spans backend curation, a push notification job, a verdict-card export, a streak tracker, and home-screen prominence. Pull this out of the home-screen bundle because it is its own product.

### Goal

Every user gets the same Today's Wahala at the same time. Daily streak survives backgrounding. Resolution generates a shareable verdict card.

### Prerequisites

- All previous bundles.
- Backend: an `is_daily_wahala` boolean on markets + a curation tool.
- Backend: a scheduled push job (Expo push, ~7pm WAT).

### Files to edit / create

- `app/daily-wahala/verdict.tsx` — *new*. The shareable 9:16 verdict card, exported via `react-native-view-shot`.
- `app/daily-wahala/preview.tsx` — *new*. Tomorrow's preview screen accessed after resolution.
- `lib/streak.ts` — *new*. Tracks daily streak in local storage + syncs to backend.
- `lib/notifications.ts` — wire Expo push registration + the daily handler.
- `components/home/TodaysWahalaBand.tsx` — extend with shareable verdict button after resolution.

### Acceptance criteria

- [ ] Daily push fires at the configured time; tapping opens the home directly to the Today's Wahala card.
- [ ] Streak increments when user takes a stance; resets on a missed day.
- [ ] Verdict screen renders + can be exported to camera roll or shared via the OS sheet.
- [ ] Tomorrow's preview shows after resolution.

### Out of scope

- Anything that requires backend changes you don't have schema for. Coordinate with backend before starting.

---

## Sequencing summary (read at a glance)

| Bundle | Screens / Surfaces                      | Depends on        | Reasonable parallel work |
|--------|------------------------------------------|--------------------|--------------------------|
| **0**  | Foundations (tokens + motion primitives) | —                  | nothing                  |
| **1**  | Home + Market Card                       | 0                  | —                        |
| **2**  | Market Detail + Card state variants      | 0, 1               | Bundle 4 (no overlap)    |
| **3**  | The Gist + Live Audio Room               | 0, 1, 2            | —                        |
| **4**  | Wallet (Home + Deposit + Withdraw)       | 0                  | can parallel 1/2/3       |
| **5**  | Portfolio + Leaderboard polish           | 0 (ideally 1)      | can parallel 2/3/4       |
| **6**  | Daily Wahala + push notifications        | all                | post-launch              |

**Recommended human assignment.** Bundle 0 to your most senior agent — the foundations are what every other bundle leans on. Bundles 1+2 to the same agent (they share market-card surface). Bundles 4 and 5 can go to a different agent in parallel. Bundle 3 last because it's the riskiest (audio, Lottie, gradient transitions).

---

## What "done" means for the whole redesign

Done is not "the visuals match the doc". Done is:

1. **A first-time user can stake from the home feed in 1 tap.** (Bundle 1.)
2. **A returning user feels their footprint everywhere.** (Bundle 2 just-staked chips; Bundle 5 record hero; Bundle 4 per-camp ribbons.)
3. **Numbers move when they change.** (Bundles 0/1/2/4/5 — every numeric is `TickFlash` or `RollingNumber`.)
4. **Drama Mode plays.** (Bundle 2 + 3.)
5. **The gist has reaction confetti + live audio rooms + camp chat.** (Bundle 3.)
6. **The daily ritual exists.** (Bundle 6.)

If those six are true, we shipped the redesign. If five of those six are true, we shipped a polished v1.5 — still a win.

---

## Process notes for the implementing agent(s)

- **One bundle, one commit series, one PR.** Don't mix bundles.
- **Always start the bundle by re-reading the three reference docs in the order at the top.** They are the contract.
- **Run `npm run lint` before declaring done.** No exceptions.
- **If you discover a missing primitive mid-bundle**, stop, go back to Bundle 0, add it, then resume. Do not inline a one-off.
- **If v1 and v2 disagree**, v2 wins. If v2 and ANIMATIONS disagree on a motion, ANIMATIONS wins (it's the most specific).
- **Voice the Pidgin.** Empty states, error toasts, locked CTAs. This is the half of the personality that costs nothing.
- **Never invent tokens.** All colours come from `constants/colors.ts`, all fonts from `constants/fonts.ts`, all motion from `lib/motion/*`. If a needed token is missing, add it there *and* update REDESIGN.md.
