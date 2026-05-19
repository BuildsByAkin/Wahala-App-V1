# Wahala — Animation Specification

> Companion to [./REDESIGN.md](./REDESIGN.md) and [./REDESIGN_v2.md](./REDESIGN_v2.md).
> This doc is the **single source of truth** for every motion in the app. Every named motion below has: a *trigger*, a *target property*, a *spec* (duration / easing / spring config), a *haptic*, and a *Reanimated 3 implementation hint*.
> Stack assumption: **`react-native-reanimated` v3**, **`expo-haptics`**, **`react-native-gesture-handler` v2**, optional `lottie-react-native` for one specific use (resolution celebration). No new dependencies otherwise.

---

## 0. Why animation matters for Wahala

The original team feedback was *"the screens look too basic and AI-generated"*. Eight out of ten times that complaint is really about **motion**, not pixels. Static screens with no feedback feel like wireframes; the same layout with one good spring on the button and one number that ticks on update feels *expensive*.

Three principles drive every spec below:

1. **Spring over timing for anything the user touches.** Buttons, sheets, cards, gesture-driven motion. Springs feel physical; timing curves feel mechanical. (Apple uses `UISpringTimingParameters` everywhere for the same reason.)
2. **Timing over spring for anything driven by data.** Number ticks, probability shifts, count-ups. Data motion must be *predictable* so the eye can track the delta.
3. **Always pair motion with haptic on user-initiated events.** A button bounce without a `Haptics.selectionAsync()` is half the experience. A success animation without `Haptics.notificationAsync(Success)` reads as fake.

---

## 1. The motion vocabulary (named, reusable)

The doc divides motion into two groups: **System motions** (re-used across screens, name them once, use everywhere) and **Local motions** (one-off scene moments). System motions go in `lib/motion/` as small reusable hooks. Local motions live next to their screen.

### 1.1 System springs — three presets, no more

All springs in the app come from one of these three presets. Naming them prevents 14 different "feels".

| Preset name      | Use case                                | `damping` | `stiffness` | `mass` | Feel                        |
|------------------|------------------------------------------|-----------|-------------|--------|-----------------------------|
| **`spring/snappy`** | Buttons, pills, chips, taps         | 18        | 320         | 0.7    | tight, no overshoot         |
| **`spring/bouncy`** | Sheets, modals, success moments     | 12        | 180         | 0.9    | visible overshoot, playful  |
| **`spring/gentle`** | Card mount, rail breathe, hero band | 22        | 140         | 1.0    | slow, settled, "premium"    |

> Reanimated hint: export as `withSpring(value, springs.snappy)` etc. from `lib/motion/springs.ts`. The 3 presets are the only spring configs that should appear anywhere in the app — code review should reject inline spring configs.

### 1.2 System timings — four presets

| Preset name        | Duration | Easing                            | Use case                          |
|--------------------|----------|-----------------------------------|------------------------------------|
| **`time/fast`**    | 120ms    | `Easing.out(Easing.quad)`          | hover-equivalents, dot pulses     |
| **`time/standard`**| 220ms    | `Easing.bezier(0.2, 0.0, 0.0, 1)`  | opacity fades, cross-fades         |
| **`time/emphasis`**| 360ms    | `Easing.bezier(0.16, 1, 0.3, 1)`   | data ticks, rail transitions       |
| **`time/slow`**    | 600ms    | `Easing.inOut(Easing.cubic)`       | colour washes, decay fades         |

> Bezier `(0.16, 1, 0.3, 1)` is the iOS *easeOutExpo*-feeling curve; numbers landing with it feel weighted, like they "set down".

### 1.3 Haptic library

| Token name                    | `expo-haptics` call                                              | Use                                  |
|-------------------------------|------------------------------------------------------------------|--------------------------------------|
| **`haptic.tap`**              | `Haptics.selectionAsync()`                                       | every button press                   |
| **`haptic.soft`**             | `Haptics.impactAsync(ImpactFeedbackStyle.Light)`                 | sheet open, chip toggle              |
| **`haptic.medium`**           | `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`                | stake confirm, camp join             |
| **`haptic.heavy`**            | `Haptics.impactAsync(ImpactFeedbackStyle.Heavy)`                 | Drama Mode tick into final 60s       |
| **`haptic.success`**          | `Haptics.notificationAsync(NotificationFeedbackType.Success)`    | won bet, deposit cleared             |
| **`haptic.warn`**             | `Haptics.notificationAsync(NotificationFeedbackType.Warning)`    | locked-side notice                   |
| **`haptic.error`**            | `Haptics.notificationAsync(NotificationFeedbackType.Error)`      | deposit failed, stake rejected       |

Every motion in §3 references one of these.

---

## 2. The five v1 motions, re-specified

These were named in v1 but specified loosely. Here they are with concrete Reanimated 3 specs.

### 2.1 `TickFlash` — when a number changes

**Trigger.** Any displayed number (probability %, pool size, wallet balance, P&L) receives a new value via props or WebSocket push.

**Visual.**
1. The *old* numeral translates up by `8dp` and fades opacity `1 → 0` over `time/standard`.
2. The *new* numeral mounts at `translateY: 8dp, opacity: 0` and animates to `0, 1` over `time/emphasis`.
3. The numeral's `color` washes to `status.win` (up) or `status.loss` (down) at `time/standard`, then decays back to `text.primary` over `time/slow`.

**Haptic.** None for ambient data (would be exhausting). `haptic.tap` only when *your own* stake / wallet causes the tick.

**Implementation hint.** Two stacked `Animated.Text` nodes inside an `overflow: hidden` box, swapped by a small `useTickFlash(value)` hook. The colour decay is a single `useSharedValue<number>` interpolated with `interpolateColor`.

### 2.2 `PoolPulse` — when pool size grows

**Trigger.** `pool` prop increases.

**Visual.** Scale `1.0 → 1.04 → 1.0`. Total duration ~220ms. Use `withSequence(withTiming(1.04, time/fast), withSpring(1.0, spring/snappy))`. The slight asymmetric ease — fast push, springy settle — reads as "money landed".

**Haptic.** `haptic.soft` only if the user is staring at the detail screen (active focus). Skip otherwise.

### 2.3 `RailBreathe` — the probability rail is alive

**Trigger.** Mount; persists for screen lifetime.

**Visual.** The two-segment rail's two flex weights oscillate `±0.5%` around their true value on a 1600ms sine. Implemented via `useSharedValue` driven by `withRepeat(withTiming(1, { duration: 1600 }), -1, true)` and interpolated into the segment widths.

**Hidden detail.** The breath amplitude scales with `volatilityScore` from the API (0–1). High-volatility markets breathe `±1.2%`; locked markets breathe 0.

**Haptic.** Never.

### 2.4 `StakeRipple` — when YOU stake

**Trigger.** Stake mutation `onSuccess`.

**Visual.** Three concurrent layers, all started in one `runOnUI`:
1. **Ring.** A 1dp stroke circle in the camp colour expands from the stake button origin to `radius: 240dp` over 900ms, opacity `0.8 → 0` on `time/slow`.
2. **Rail snap.** The probability rail jumps to the new ratio via `spring/bouncy` (visible overshoot — it feels like the market *reacted*).
3. **Number tick.** Both percentages do a `TickFlash`.

**Haptic.** `haptic.medium` at frame 0, then `haptic.tap` 220ms later when the rail settles. This double-tap pattern is the iOS "confirmed transaction" feel.

### 2.5 `CardEnter` — feed item mount

**Trigger.** FlashList mounts a new card row.

**Visual.** `translateY: 12dp → 0` and `opacity: 0 → 1` on `time/standard`, staggered by `30ms × index` for items above the fold. Items entering during scroll skip the stagger (they should appear *as scrolled to*, not delayed).

**Haptic.** Never.

**Implementation hint.** Reanimated's `Animated.FlatList`/`FlashList` doesn't support stagger out of the box; use `Animated.View` with `entering={FadeInUp.duration(220).delay(index * 30)}` for the initial mount, and unset the `entering` prop after first paint via a `mounted` ref so subsequent scroll-in items snap.

---

## 3. New animations to add (the gap fillers)

These are the motions the current app is *missing*. They are what separates "functional" from "alive". Group A is global (used everywhere); Group B is per-screen.

### Group A — Global micro-interactions

#### 3.A.1 `ButtonPress` — every tappable

**Trigger.** `onPressIn` / `onPressOut` on any Pressable that acts as a button (CTAs, chips, pills, list rows, tab items).

**Visual.**
- `onPressIn`: `scale: 1 → 0.96`, `opacity: 1 → 0.85`, both via `spring/snappy`.
- `onPressOut`: `scale → 1`, `opacity → 1`, same spring.
- For *primary* CTAs (the brand-orange ones): also bump `shadowOpacity 0.0 → 0.18` so it "lifts off the page" briefly.

**Haptic.** `haptic.tap` on `onPressIn`. (Fire on press *in*, not out — feels more responsive.)

**Implementation hint.** Build once as `<Pressable.Spring>` wrapper or as `useButtonPress()` hook returning `{ animatedStyle, onPressIn, onPressOut }`. Every CTA in the redesigned app consumes this — never an ad-hoc `onPress` without it.

#### 3.A.2 `ChipToggle` — category filter, camp chooser

**Trigger.** A chip is tapped.

**Visual.**
- Selected chip: background `transparent → category.soft` via `time/standard`, text colour ticks to `category.primary`, scale pulses `1 → 1.06 → 1` on `spring/bouncy`.
- Deselected chips: opacity dims to `0.6` on `time/fast`.

**Haptic.** `haptic.soft`.

#### 3.A.3 `SheetPresent` — every bottom sheet (Stake, Composer, LockedNotice)

**Trigger.** Sheet opens.

**Visual.**
- Backdrop: opacity `0 → 0.6` over 220ms.
- Sheet body: `translateY: screenH → finalY` via `spring/bouncy` (visible bounce — *the sheet arrives*).
- Sheet content fades in `opacity 0 → 1` from 100ms after the sheet starts moving (staggered for layering depth).
- Optional `originY` (already supported in `StakeSheet`): when present, the sheet briefly scales from `0.94 → 1` so it feels like it grew *from the button you tapped*.

**Dismiss.** Reverse, but on `spring/snappy` (no bounce on exit). Backdrop fades 180ms.

**Haptic.** `haptic.soft` on open, none on dismiss.

#### 3.A.4 `PageTransition` — Expo Router stack push

**Trigger.** `router.push()` to any detail screen.

**Visual.** Use Reanimated 3 **Shared Element Transitions** for two specific pairs:
1. **Market card image → Market detail hero image.** `sharedTransitionTag={`market-image-${market.id}`}` on both ends. Animate via `SharedTransition.custom()` with `withSpring(spring/gentle)` on width/height/transform.
2. **Camp door (home Today's Wahala) → Camp roster header.** Same pattern with tag `camp-${marketId}-${side}`.

Pages without a shared element use stock Expo Router slide-from-right at 320ms `Easing.out(Easing.cubic)`.

**Haptic.** `haptic.tap` at navigation invocation.

#### 3.A.5 `PullToRefresh` — Wahala-branded spinner

**Trigger.** Vertical drag at scroll-top > 60dp.

**Visual.** Replace stock RefreshControl with a custom `<WahalaSpinner>`:
- Pull 0–60dp: the W logo grows `scale 0.6 → 1`, opacity ramps `0 → 1`.
- Pull > 60dp: the dot above the *i* (insert as a separate SVG node) starts pulsing `scale 0.8 ↔ 1.2` on a 600ms loop. Subtle copy fades in below: *"Pulling fresh gist…"*.
- On release: logo does a single 360° rotation in 800ms while data fetches; afterwards collapses up.

**Haptic.** `haptic.soft` at threshold cross.

**Implementation hint.** This requires a custom `RefreshControl` replacement using `react-native-gesture-handler` Pan + Scroll integration. Owning this is what separates a top-50 app from a top-5 one.

#### 3.A.6 `SkeletonShimmer` — loading states

**Trigger.** Any list/card placeholder while data loads.

**Visual.** A `LinearGradient` strip translates across the placeholder at `-100% → 100%` translateX over 1400ms, loops infinitely. Gradient colours: `transparent → #FFFFFF0E → transparent` (subtle).

Combine with v1's opacity pulse `0.4 ↔ 0.9` on `time/slow` for layered "alive" feel.

**Haptic.** Never.

#### 3.A.7 `Toast` — non-modal feedback (won, lost, deposit ok, error)

**Trigger.** Imperative `showToast(...)`.

**Visual.** A pill drops from the top safe-area edge: `translateY: -80 → safeTop+12` on `spring/bouncy`, sits for 2400ms, exits back up on `time/standard`. Border colour and leading glyph derived from `kind` (success/warn/error/info).

**Haptic.** Matches kind: `haptic.success`, `haptic.warn`, `haptic.error`.

### Group B — Scene-specific motions

#### 3.B.1 `DoubleTapStake` — full-screen card double-tap to plant flag (v2 home)

**Trigger.** Double-tap inside the full-screen home card.

**Visual.** A large camp-coloured flag emoji (96dp) appears at the tap point, `scale: 0 → 1.2 → 1.0` on `spring/bouncy`, opacity `0 → 1 → 0` over 900ms total, then auto-disappears. Simultaneously the camp door pulses `1 → 1.06 → 1`.

**Haptic.** `haptic.medium`.

**Implementation hint.** `Gesture.Tap().numberOfTaps(2)` from `react-native-gesture-handler` v2 → triggers a `useSharedValue` flow + optimistic stake mutation.

#### 3.B.2 `CountdownTick` — Drama Mode hero countdown

**Trigger.** Every second in final hour.

**Visual.** Each new second numeral does a quick `TickFlash` *without* the colour wash. At T-60s the entire countdown switches palette to `status.loss` and scale `1 → 1.04 → 1` on every tick (heart-beat). At T-10s the bg flashes `#000 → category.glow` for 80ms per tick.

**Haptic.** `haptic.tap` every 10s in the final minute. `haptic.heavy` at T-10, T-5, T-4, T-3, T-2, T-1, T-0.

#### 3.B.3 `Resolution` — win/loss reveal at T-0

**Trigger.** Market resolves.

**Visual.**
- **Win:** A short Lottie confetti burst in your camp colour fires from the centre, 1800ms. Wallet balance in the persistent header does an extended `TickFlash` lasting 1200ms. A toast drops with `"+₦5,420 · You called it."`.
- **Loss:** No confetti. The screen dims to `surface/00` over 400ms. A single text overlay slides up: *"Camp lost. ₦2,000 down. Next Wahala loads in 3."* Auto-dismisses with countdown.

**Haptic.** Win: `haptic.success`. Loss: nothing.

> Lottie justification: this is the *one* moment per market that justifies an opinionated, illustrated animation. Don't reach for Lottie elsewhere.

#### 3.B.4 `CampDoorTap` — Today's Wahala band CTA (v2 home)

**Trigger.** Tap one of the two "JOIN YES (3.2k)" / "JOIN NO (5.1k)" doors.

**Visual.** Door scales `1 → 0.94 → 1.02 → 1` on `spring/bouncy`. The two doors are joined at a vertical seam; the un-tapped door simultaneously shrinks `1 → 0.96` and dims to opacity `0.7`. This communicates "you chose a side" before the sheet even opens.

**Haptic.** `haptic.medium`.

#### 3.B.5 `RoomEnter` — Live Gist Room entry

**Trigger.** Tap "🔴 LIVE · 142 listening".

**Visual.** The room band expands from a 60dp strip to a 280dp half-sheet, springing into place. Avatars of speakers settle in one by one on `time/emphasis` with `40ms` stagger. Their wave-form starts animating as a `Skia` or SVG path bound to a `useSharedValue` (or a static fallback wave).

**Haptic.** `haptic.medium`.

#### 3.B.6 `WalletNumberRoll` — Wallet balance ticker

**Trigger.** Wallet screen mount; balance change.

**Visual.** **Odometer-style digit roll** (Robinhood pattern). Each digit is its own vertical strip; the strip translates by `-digitHeight × value` over `time/emphasis`. Negative deltas roll down; positive deltas roll up.

**Haptic.** None on mount, `haptic.tap` on user-driven changes.

**Implementation hint.** A `<RollingNumber value={...}>` component built once, used in 4 places: header pill, wallet hero, portfolio P&L, Drama Mode pool.

#### 3.B.7 `StreakFlame` — habit streak in header

**Trigger.** Mount; tick-up.

**Visual.** A small flame glyph (svg or emoji) with a continuous breathing animation: `scale 1 ↔ 1.08`, `opacity 1 ↔ 0.85`, 1400ms loop. On streak-up, a *single* burst: `scale 1 → 1.4 → 1` on `spring/bouncy`, plus a +1 numeral that floats up 24dp and fades over 700ms.

**Haptic.** Burst: `haptic.success`.

#### 3.B.8 `DepositSuccess` — wallet credit confirmed

**Trigger.** Deposit polling resolves `completed`.

**Visual.** Existing deposit screen transitions to success pane via `SheetPresent` motion. A check-mark draws itself with SVG `strokeDashoffset` over 320ms. The final amount uses `WalletNumberRoll`. A 600ms `status.win` glow expands behind the check then decays.

**Haptic.** `haptic.success`.

#### 3.B.9 `GistComposerExpand` — comment composer

**Trigger.** Tap input bar.

**Visual.** The input bar's height springs from 44dp → 180dp via `spring/bouncy`; backdrop fades in `0 → 0.6`. The avatar slides from input-row position to composer-header position via a layout animation (`layout={LinearTransition.springify()}` works for this).

**Haptic.** `haptic.soft`.

---

## 4. Per-screen motion checklists

When implementing each screen, the agent must verify *every* row in the relevant table actually animates. This is the QA gate.

### Home screen

| Element                              | Motion             |
|--------------------------------------|--------------------|
| Header balance pill                  | `TickFlash`        |
| Streak flame (v2)                    | `StreakFlame`      |
| Hero pulse card mount                | `CardEnter` (no stagger; it's first) |
| Hero rail                            | `RailBreathe` + `TickFlash` |
| Pool size in hero                    | `PoolPulse`        |
| Inline stake buttons                 | `ButtonPress`      |
| Category chips                       | `ChipToggle`       |
| Feed cards                           | `CardEnter` (staggered) |
| Card image → detail navigation       | `PageTransition` shared element |
| Pull-to-refresh                      | `PullToRefresh`    |
| Skeleton                             | `SkeletonShimmer`  |
| Today's Wahala doors (v2)            | `CampDoorTap`      |
| Vertical-swipe arena cards (v2)      | `DoubleTapStake`   |

### Market card

| Element                              | Motion             |
|--------------------------------------|--------------------|
| Mount                                | `CardEnter`        |
| Probability rail                     | `RailBreathe` + `TickFlash` on tick |
| Avatar stack mount                   | Each avatar `entering={FadeInRight.delay(i*40)}` |
| Stake buttons                        | `ButtonPress`      |
| "Closing soon" clock pulse           | scale `1↔1.05`, `time/slow`, loop |
| Card press → detail                  | `ButtonPress` + `PageTransition` |

### Market detail

| Element                              | Motion             |
|--------------------------------------|--------------------|
| Hero image → from card               | shared element     |
| Pulse rail                           | `RailBreathe`      |
| Side panels                          | `ButtonPress`      |
| Side panel rail-fill on tick         | `TickFlash` widths via `withSpring(spring/bouncy)` |
| Stake button                         | `StakeRipple` on confirm |
| Activity tape items                  | each `entering={SlideInRight.duration(220)}` |
| Comment list mount                   | `entering={FadeInUp.delay(i*30)}` |
| Like heart                           | scale `1 → 1.3 → 1` on `spring/bouncy` + colour fade, `haptic.tap` |
| Comment composer expand              | `GistComposerExpand` |
| Drama mode entrance                  | screen-level cross-fade 600ms |
| Countdown                            | `CountdownTick`    |
| Resolution                           | `Resolution`       |
| Camp roster row enter                | stagger fade-in 30ms |
| Live audio room expand               | `RoomEnter`        |

### The Gist

| Element                              | Motion             |
|--------------------------------------|--------------------|
| New comment arriving (Drama)         | `entering={SlideInUp.springify()}` |
| Tab switch (Public ↔ Camp chat)      | `LinearTransition.springify()` for indicator; cross-fade content 180ms |
| Like                                 | heart spring + haptic |
| Reaction confetti (v2)               | small emoji floats up 220dp, opacity 1→0, 1400ms |
| Stance-change event card             | `entering={FadeInUp}` + gradient cross-wipe over 1200ms |

### Wallet

| Element                              | Motion             |
|--------------------------------------|--------------------|
| Balance hero                         | `WalletNumberRoll` on mount + on update |
| Deposit success pane                 | `DepositSuccess`   |
| Deposit fail pane                    | check-mark replaced by X drawn with same SVG dash technique; `haptic.error` |
| Quick-amount chips                   | `ChipToggle`       |
| Continue CTA                         | `ButtonPress` (primary variant) |
| Locked-in-markets list rows          | `CardEnter` stagger |
| Per-camp colour ribbon (v2)          | static, but ribbon `width: 0 → 4dp` `time/emphasis` on mount |

### Portfolio

| Element                              | Motion             |
|--------------------------------------|--------------------|
| Record stats hero                    | `WalletNumberRoll` for wins/losses count + percentage |
| Total P&L number                     | `WalletNumberRoll` + colour `status.win`/`status.loss` |
| All-time sparkline                   | path `strokeDashoffset` draws over 900ms `time/emphasis` |
| Streak flame                         | `StreakFlame`      |
| Tab switch (Active/Won/Lost)         | indicator `LinearTransition.springify()`; content cross-fade 180ms |
| Position rows                        | `CardEnter`        |
| Position row tap                     | `ButtonPress` → `PageTransition` |
| Trophy claim (v2)                    | `Resolution`-style mini confetti |

---

## 5. Implementation order (build once, reuse forever)

The implementing agent should build the motion primitives **before** touching any screen. This is the foundation.

1. `lib/motion/springs.ts` — the 3 spring presets.
2. `lib/motion/timings.ts` — the 4 timing presets.
3. `lib/motion/haptics.ts` — typed wrappers around `expo-haptics` for the 7 tokens.
4. `components/motion/PressableSpring.tsx` — universal button with `ButtonPress` baked in.
5. `components/motion/TickFlash.tsx` — numeric flash component (props: `value`, `format`).
6. `components/motion/RollingNumber.tsx` — odometer digit roll.
7. `components/motion/SkeletonShimmer.tsx` — gradient shimmer wrapper.
8. `components/motion/SheetBase.tsx` — bottom-sheet primitive with `SheetPresent` motion.
9. `components/motion/WahalaSpinner.tsx` — pull-to-refresh.
10. `components/motion/Toast.tsx` + `useToast()` provider.

Only after these ten exist should screen work begin. Every screen then *consumes* these primitives — no screen reaches for `withSpring` directly.

---

## 6. Performance guardrails

- All animations must run on the UI thread. Any `useAnimatedStyle` that reads from React state instead of `useSharedValue` is a bug.
- Avoid animating `width`/`height` for `RailBreathe` and rail snaps — use `flex` weights or `scaleX` with `transform-origin: left`. Layout animations are expensive.
- Use `react-native-reanimated`'s `useDerivedValue` to compose, never recompute in JS.
- `react-native-skia` is *not* required. If we ever need GPU-grade effects (real-time waveforms, particle systems), add it then — not now.
- Lottie is allowed for *exactly one* purpose: `Resolution` confetti. Anywhere else, prefer Reanimated.
- Battery: ambient loops (`RailBreathe`, `StreakFlame`, `LIVE` dot) must pause when the screen blurs (use `useFocusEffect`).

---

## 7. Accessibility & opt-out

- Respect `AccessibilityInfo.isReduceMotionEnabled()`. When true:
  - Springs collapse to `time/fast` timing (no overshoot).
  - Loops (`RailBreathe`, `StreakFlame`, dot pulses) freeze.
  - `Resolution` Lottie is replaced by a static check + toast.
- Haptics respect the system "Reduce Motion" setting — when on, downgrade `medium`/`heavy` to `selectionAsync`.
- All decorative motion must be non-blocking — screens must still be interactive while animations play.
