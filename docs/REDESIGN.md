# Wahala — Visual & Interaction Redesign Doc

> **Scope.** A non-code redesign brief for six surfaces: **Home**, **Market Card** (Full + Compact), **Market Detail**, **The Gist** (comments section inside Market Detail), **Wallet** (Deposit/Withdraw), and **Portfolio**.
> The goal is to move the app from "competently minimal" to **alive, opinionated, and habit-forming** — the difference between a screen that a junior dev shipped in one sitting and a screen that a real product team obsessed over for three weeks.

---

## 1. Why the current screens feel "AI-looking"

A deep audit of the current code (`app/(tabs)/index.tsx`, `components/home/MarketCardFull.tsx`, `app/market/[slug].tsx`, `app/(tabs)/portfolio.tsx`) reveals a consistent pattern: **every screen is built from the same primitives, in the same proportions, with the same density**. The reader cannot tell them apart at a glance.

Concretely, the symptoms are:

1. **Uniform card chrome.** Every container is `#161616`, `borderRadius 16`, `padding 16`. Home cards, portfolio rows, leaderboard cards — all the same box. No card has earned the right to look different from another.
2. **Monotone information hierarchy.** One title size, one body size, one muted grey (`#5A5A5A`). The eye has nothing to fall on first. Polymarket and Kalshi by contrast use **3–4 weights of contrast** (giant number → mid label → micro meta → ghost meta) so the page guides the gaze.
3. **Decorative emptiness instead of charged emptiness.** Big black backgrounds with a 16pt question floating in them. Real prediction-market apps fill that air with **movement** — a sparkline behind the question, a live "↑ 4% in last hour" pill, a price flash on update.
4. **Static probabilities.** Numbers like `64%` are rendered as plain text. They never animate when they change. There is no flash, no tick, no ghost of the previous value. This is the single biggest "addiction killer" — there is nothing to come back for.
5. **No social proof in the feed.** Cards show pool size and bettor count as small grey numerals. They never show **who** is betting (avatars), **how loudly** (volume spike), or **why now** (a comment quote, a news pill).
6. **No identity language beyond colour.** Markets do not feel different from each other. A politics market looks like a sports market looks like a meme market.
7. **Wallet/portfolio is a list, not a story.** The portfolio page leads with a flat naira number and a "Deposit" pill. A Robinhood-style portfolio leads with a **moving chart** and a **daily delta** — "you're up ₦340 today" — because that is the dopamine hook the user opens the app for.

The fix is **not** "more components". The fix is **stronger contrast, motion, social signal, and a clear primary moment per screen**.

---

## 2. Design principles (the spine of every decision below)

These six principles drive every spec in this doc. When in doubt, defer to them.

1. **One hero per screen.** Every screen has exactly one element that the eye lands on first. Home → the trending market. Detail → the probability rail. Portfolio → the P&L number. Wallet → the balance. Everything else is in service of that hero.
2. **Numbers must move.** Every probability, balance, and pool size animates on change. Tick up, flash, ghost-trail. A static number is a dead number.
3. **Social proof in the chrome.** The interface itself shows that other humans are in there with you — avatar stacks, "+12 in last hour", typing dots in the gist, "Ada just staked ₦5k on YES".
4. **Earned identity per market.** Each market carries a category accent (politics = brand orange, sports = electric blue, crypto = neon green, culture = magenta, weather = sky). The accent shows up in the rail, the dot, the pill, and a subtle category glyph in the card corner — not just text.
5. **Pidgin voice, not corporate voice.** Empty states, CTAs, and confirmations should sound like Wahala, not like Stripe. "Wetin you bet on go show here" is good. "No active positions" is bad. This costs nothing and it is half the personality.
6. **Density goes up, then back down.** Use a **3-tier density model** — the feed is medium, the detail page is dense (charts + book + comments), the wallet is airy. Same app, different rooms.

---

## 3. Foundations to add before screen redesigns

These are not screens, they are the **tokens that let the redesign feel coherent**. Add these first; the screen specs below assume them.

### 3.1 Category palette (extend `constants/colors.ts`)

Today there is only one accent (`brand: #FF6500`) plus generic surfaces. Add a `category` namespace so every category has a **primary, soft, and glow** triplet:

| Category   | Primary   | Soft (8% over base) | Glow (radial, 20% alpha) |
|------------|-----------|---------------------|--------------------------|
| Politics   | `#FF6500` | `#FF65001A`         | `#FF650033`              |
| Sports     | `#3B82F6` | `#3B82F61A`         | `#3B82F633`              |
| Crypto     | `#10E0A0` | `#10E0A01A`         | `#10E0A033`              |
| Culture    | `#E879F9` | `#E879F91A`         | `#E879F933`              |
| Weather    | `#7DD3FC` | `#7DD3FC1A`         | `#7DD3FC33`              |
| News       | `#FBBF24` | `#FBBF241A`         | `#FBBF2433`              |
| Gist (default) | `#A78BFA` | `#A78BFA1A`     | `#A78BFA33`              |

Brand orange remains the **action** colour exclusively (CTAs, the active stake pill). Categories are **identity** colour. This separation is what stops the UI from looking like one big orange smear.

### 3.2 Surface elevation (3 levels, not 1)

Today every card uses `#161616`. Define:

- `surface/00` — page background — `#070707` (slightly deeper than current `#0A0A0A`, lets cards lift).
- `surface/01` — feed card — `#121212` with a 1px `#1C1C1C` hairline.
- `surface/02` — featured / hero card — `#161616` with a 1px `#262626` hairline and an inner `#FFFFFF08` top stroke (false-light bevel).
- `surface/03` — sheet / modal — `#1A1A1A` with `#2C2C2C` hairline.

Three steps of elevation makes hierarchy readable without shadows.

### 3.3 Motion vocabulary

Define a tiny library of **named motions** and reuse them everywhere:

- **TickFlash** — number changes: ghost-of-old slides up 8dp and fades (180ms), new value lands with a 6% green/red color wash that decays over 600ms.
- **PoolPulse** — pool size on update: scale 1.0 → 1.04 → 1.0 over 220ms.
- **RailBreathe** — the probability rail breathes ±0.5% on every WebSocket tick. Always alive.
- **StakeRipple** — when YOU stake, a 1-second concentric ring expands from the side panel and the rail snaps to the new ratio.
- **CardEnter** — feed items mount with a 12dp translate-up and 0 → 1 opacity over 220ms, staggered 30ms per card. Below the fold they enter as you scroll.

These five named motions, used consistently, are what separate a "working app" from a "premium app".

### 3.4 Typography contrast (extend `Fonts`)

Add a **display** size for hero numbers — 44–56sp, tracking -1.5. Use it for: Portfolio total, Detail leading probability, Deposit final amount. Currently the app caps body type around 22sp; the absence of large display type is why screens feel "flat".

---

## 4. HOME SCREEN — Redesign Spec

**Current state.** Topbar + greeting + "Hot gist 🔥" + category chips + flat feed of identical cards. Greeting is the loudest thing on the screen; it shouldn't be.

**Design intent.** The home screen is a **markets newsroom**. The first thing you see is *what the crowd is buzzing about right now*, not "Good evening, friend".

### 4.1 New top-down structure

```
┌────────────────────────────────────────────┐
│  WAHALA          🔔 (3)        💰 ₦12,400  │  ← persistent header (56dp)
├────────────────────────────────────────────┤
│                                            │
│  HERO PULSE CARD  ← 1 trending market      │  (220–260dp tall)
│  • Big question, image bleed-right         │
│  • Live probability rail (animated)        │
│  • "412 staking now · ₦2.1m pool"          │
│  • Two side-by-side stake buttons inline   │
│                                            │
├────────────────────────────────────────────┤
│  ⚡ Live now                                │  ← section label
│  ┌──────┐ ┌──────┐ ┌──────┐ →             │  horizontal scroll
│  │mini  │ │mini  │ │mini  │  micro-cards   │  (160×160 each)
│  └──────┘ └──────┘ └──────┘                │
├────────────────────────────────────────────┤
│  Categories  All Politics Sports Crypto … │  ← sticky on scroll
├────────────────────────────────────────────┤
│  Feed (medium-density market cards)        │
│  • Each card has category glyph + accent   │
│  • Each card has a 24h sparkline           │
│  • Each card has avatar stack of recent    │
│    stakers                                 │
└────────────────────────────────────────────┘
```

### 4.2 Persistent header (replaces the greeting block)

- **Logo** left, **balance pill** right, **bell** in between.
- The balance pill is a small but ever-present hook — tapping it opens Wallet. It uses `TickFlash` whenever the wallet number changes (won a bet, deposit cleared). This single element makes the wallet feel "alive" from anywhere in the app.
- The greeting (`Good evening, Ada`) moves to the **second row, smaller**. It's still warm, but it stops dominating the page. Beneath it: a one-liner system message — *"3 of your markets resolve tonight"*, *"Naija pool just crossed ₦100m today"* — algorithmic, never empty.

### 4.3 The Hero Pulse Card

This replaces the current generic first card with a **purpose-built showpiece**:

- **Height:** ~250dp. Takes the full content width minus 16dp side gutters.
- **Background:** `surface/02` with a soft radial glow in the category colour bleeding from the top-right corner (15% alpha, 200dp radius). This is the single most "premium" pixel on the screen.
- **Top-row meta:** category pill (filled with the category soft), `· LIVE`, `· closes in 4h`. The LIVE dot is a 6dp circle in category primary that fades 0.4 ↔ 1.0 every 1.6s.
- **Question:** 22sp bold, max 3 lines, hard-truncate. To the right of it (40% width), a **bleed image** clipped on three sides with a soft gradient mask on the left edge so it feels embedded into the card, not pasted onto it.
- **Probability rail:** Spans full width. Two-segment bar 12dp tall with **rounded inner caps** (segments touch at a soft white 2dp seam). Both ends carry the percent in large numerals (28sp bold), the side label below in 11sp tracked-out caps. The rail **always breathes** (RailBreathe motion). When a tick arrives, both numbers do TickFlash.
- **Volume crumb:** below the rail, a single line — `412 staking now · ₦2.1m pool · 🔥 +18% in last hour`. The "+18%" pill uses category primary on category soft.
- **Inline stake buttons:** Two large 56dp pill buttons side-by-side at the bottom of the card. Left = leading outcome in its colour at 18% fill; right = trailing outcome similarly. Label format: `Stake YES · 1.6x`. Tapping opens the StakeSheet directly — no detour through the detail page. **This single change is the biggest engagement multiplier in this entire doc.** Today, to stake you must (1) tap card, (2) wait for detail load, (3) tap side, (4) tap stake. New flow is 1 tap.

### 4.4 "Live now" horizontal rail

A second-level surface between the hero and the feed. Five to seven horizontally scrolling **micro-cards** (160×160). Each shows:

- Category glyph top-left, "LIVE" dot top-right.
- Question (12sp semibold, 2 lines, ellipsis).
- One-side mini-rail (just the leader): `YES 71%` huge, `NO 29%` faint below.
- Tiny "+₦340k in 1h" delta in category accent.

This rail is **the discovery surface** — markets that are heating up *right now* that aren't yet in the user's filtered feed. Manifold, Polymarket, and Kalshi all have an equivalent. We don't.

### 4.5 Feed cards (medium density)

See §5 — Market Card spec.

### 4.6 Empty / loading states

- **Skeleton:** instead of three identical grey rectangles, draw a skeleton **shaped like the new cards** — meta strip on top, big question rectangle, two-segment rail, meta strip bottom. The skeleton then *becomes* the card. This is the difference between "loading" and "anticipation".
- **Empty (filter has no markets):** A short Pidgin line — *"E quiet for this category. Try another, abeg."* — with a chip row to switch.
- **Funding banner:** Keep the orange band, but rewrite as a **conversational hook**: *"Your wallet still dey empty. Drop ₦1k and let the gist begin."* Use the same TickFlash on the wallet pill the moment the deposit lands so the connection between deposit and balance is *visible*.

### 4.7 Pull-to-refresh

Today: stock iOS spinner in brand orange. Replace with a **custom Wahala spinner**: the W logo rotates and the dot above the i pulses. Two-line copy mid-pull — *"Pulling fresh gist…"*. Same energy as Twitter's bouncing bird. Cheap, memorable.

---

## 5. MARKET CARD — Redesign Spec

The feed card is the most-rendered surface in the app. It deserves the most love.

### 5.1 The full card (replaces `MarketCardFull.tsx`)

**Structure (top to bottom):**

```
┌──────────────────────────────────────────┐
│ ▮ POLITICS · TRENDING        🕒 closes 4h│  ← meta strip (with category bar)
│                                          │
│ Will Tinubu sign the new minimum  ┌────┐│
│ wage bill before May 31?          │img │ │
│                                   └────┘ │
│                                          │
│ ▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱  68%/32%          │  ← rail with embedded %
│   ╲╱╲ sparkline 24h           ╱╲╱        │  ← micro-sparkline under rail
│                                          │
│ ●●●●● +12        ₦2.1m pool   💬 84      │  ← avatar stack + crumbs
│                                          │
│ [  Stake YES 1.6x  ] [  Stake NO 2.9x  ] │  ← dual inline CTAs
└──────────────────────────────────────────┘
```

**Key changes vs today:**

- **Category bar** — a 3dp tall, 24dp wide bar in the top-left corner in category primary. Replaces the all-caps category text colour change. Faster to scan.
- **Image bleed** — image is 64×64, rounded 14, sits flush to the right edge with a 12dp soft gutter. Today the image is a bordered thumb floating in space.
- **Combined rail** — replace the two side-by-side rectangles with one continuous **two-segment bar**. The percent on each side is inside the bar in white at 28sp. This is the **single most recognisable Polymarket pattern** and it works because the eye can compare the two segments at a glance.
- **24h sparkline** — a 24-tick mini line chart sitting *behind* the rail at 30% opacity. Shows where the market has moved in the last day. This is the "alive" signal that nothing in the current design has.
- **Social proof row** — overlapping avatars (5 max, then `+N`). Avatars are the recent stakers; tapping the stack opens the gist. This is the Sleeper / Discord pattern.
- **Dual CTA** — both stake buttons live in the card. The user does not have to leave the feed to bet. CTAs use the side's category-derived colour at 18% fill with a 1px stroke at 50%, white text. The multiplier is part of the button label.
- **No "View market" CTA.** The entire card is tappable to open detail; the explicit "View" link disappears. Removes a redundant tap target.

### 5.2 The compact card

Used for non-trending / older markets in the feed. Same DNA as full card but:

- No image.
- Sparkline is omitted.
- CTA is a single right-aligned chevron + "Stake" pill (small, 32dp).
- Avatar stack collapses to a count: `👥 124 stakers`.

The compact card is **75% of feed scroll volume** — it should feel light, not negotiable. Tighter padding (12 not 16), 14sp question.

### 5.3 State variants

- **Closing soon (<2h)** — clock icon and time string animate every 5s (subtle 1.05 scale pulse), border picks up a 1px category-primary stroke. Creates real urgency.
- **Just-staked (you bet here in last 5min)** — a small `✓ Your bet · ₦5k on YES` chip sits above the CTA row in the category soft. Stays for 24h. This is the **recall hook** — the user opens the feed and sees their footprint.
- **Resolving today** — the closing timer is replaced by `⚡ Resolves today` in category accent.
- **Resolved** — entire card desaturates to greyscale, winner side carries a thin green left border, your P&L is shown inline (`✓ Won ₦8.4k` or `✗ Lost ₦1k`). Card stays in feed for 7 days then archives.

### 5.4 Micro-card (used in the "Live now" rail)

160×160 square. Top: category glyph + LIVE dot. Middle: 2-line question. Bottom: leading-side big percent + tiny trailing percent below. Single tap → detail. No CTA — it's a discovery card, not a stake card.

---

## 6. MARKET DETAIL — Redesign Spec

The current detail page (`app/market/[slug].tsx`) is competent but quiet. It treats the market as a static document. Kalshi and Polymarket treat the market as a **live trading floor**. We should too.

### 6.1 Page structure (top to bottom)

```
┌─────────────────────────────────────────┐
│ ← BACK     POLITICS · LIVE · closes 4h  │  ← compact header (44dp)
├─────────────────────────────────────────┤
│                                         │
│  Question (24sp bold, max 3 lines)      │  ← hero block
│  Source: Reuters · Resolves on Apr 30   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      PROBABILITY CHART            │  │  ← 200dp tall
│  │   ─────────────╱─╲ ──────         │  │  area chart
│  │  ────────────╱   ╲                │  │  with hover scrubber
│  │  YES 68%       NO 32%             │  │
│  │  1H · 24H · 7D · ALL              │  │  ← time-range tabs
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─────────────┐ ┌─────────────┐        │  ← side panels (dual)
│  │   YES       │ │     NO      │        │
│  │   68%       │ │     32%     │        │
│  │   1.6x      │ │     2.9x    │        │
│  │ [Stake YES] │ │  [Stake NO] │        │
│  └─────────────┘ └─────────────┘        │
│                                         │
│  Activity tape ────────────────────     │  ← scrolling ticker
│  • Ada staked ₦5k on YES 12s ago        │
│  • Tunde staked ₦12k on NO 31s ago      │
│  • Pool +₦80k in last 5min              │
│                                         │
│  Stats strip                            │  ← cool grey
│  ₦2.1m pool · 412 stakers · ₦100 min    │
│                                         │
│  ─────  THE GIST  ─────                 │  ← divider + label
│                                         │
│  Hot takes · New · Top                  │  ← gist filter tabs
│                                         │
│  [comment thread...]                    │
│                                         │
└─────────────────────────────────────────┘
[ input bar pinned to bottom — see Gist ]
```

### 6.2 Hero block

- **Question.** 24sp, max 3 lines, hard truncate with "…show more" expand. No image floating here — the image (if any) becomes a 4dp tall blurred banner at the very top of the page behind the back chevron, giving the page a colour identity without stealing space.
- **Resolution meta.** Single line, 12sp, muted: `Source: Reuters · Resolves on Apr 30 at 8pm WAT`. This single line is the most important credibility signal in a prediction market app and we currently bury it. Tapping it opens a sheet with the full resolution criteria. **Trust is the moat — show it.**

### 6.3 Probability chart (NEW)

This is the **single biggest missing piece** in the current detail page. Polymarket and Kalshi both lead with the chart; we lead with the rail. The rail tells you *where we are*; the chart tells you *where we've been*, which is the harder, more interesting question.

Spec:

- 200dp tall, full width minus 16dp gutters.
- **Area chart** of the leading-side probability over time. Fill is category primary at 15%, line is category primary at 1.5px.
- **Time-range tabs** above the chart: `1H · 24H · 7D · ALL`. Default 24H. Active tab has a 2dp underline in category primary.
- **Scrubber.** Long-press and drag to scrub the line; a vertical hairline shows the value at that moment, and the top-left corner of the chart shows `Apr 12, 3:21pm — YES 64%`. The current probability values above the side panels update live to match the scrubber position (with a subtle "(scrubbing)" label).
- **Event annotations.** Small dots on the line at moments where the probability moved >5% in 10min, captioned in a tiny pill — `Tinubu speech +12%`. These are the moments of narrative; surface them.
- **Empty state (new market with no history):** show a "Waiting for first trades…" placeholder with a soft horizontal scanning line motion. Don't show a flat 50/50 line — that's a lie.

### 6.4 Side panels (Stake decision)

Keep the dual-panel pattern, but elevate:

- 1:1 square panels, full bleed colour wash (category soft) with a 1px stroke in category primary.
- Inside, in this order, top to bottom:
  - **Side label** (`YES` / `NO` or full label for n-ary), 13sp tracked caps.
  - **Big percent**, 36sp bold display, with TickFlash on update.
  - **Multiplier**, 13sp regular below: `1.6x payout`.
  - **"Your stake" inline chip** if user has one: `✓ ₦5,000 staked`, in white-on-category-primary, 11sp.
  - **CTA button** at the bottom: filled category primary, white text — `Stake YES` (or `Add to stake` if already in).
- **Selected/origin animation**: when the user taps Stake, the panel inflates 2% scale and the StakeSheet opens with a `Shared Element`-style transition originating from the panel's centre.
- **N-ary (>2 outcomes):** stack vertically using OutcomeRow but **add a tiny line chart** to the right of each row showing that outcome's 24h trend — same idea as the home card sparkline.

### 6.5 Activity tape (NEW)

A horizontally scrolling ticker between the side panels and the stats strip. 28dp tall. Updates via WebSocket. Format:

`• Ada staked ₦5k on YES (12s)   • Tunde staked ₦12k on NO (31s)   • Pool +₦80k in last 5m   …`

The ticker scrolls right-to-left at ~30dp/s, pauses on touch. This is **the single highest "alive" signal** we can ship — it makes the page feel like a populated room rather than an archive. Use category accents to colour each entry's amount.

### 6.6 Stats strip

Already present (`components/market/stats-strip.tsx`). Two changes:

1. Render in a `surface/02` capsule with rounded ends, not as bare text on the page. Gives the strip a tactile feel.
2. Add **one micro-stat**: `Avg stake ₦1,200` — answers the implicit question "is this whale-heavy or crowd-heavy?".

### 6.7 Locked / Resolved states

- **Locked:** dim the chart and side panels to 60%, freeze the rail breathe, replace CTAs with a single `⏳ Awaiting resolution` strip. Don't hide the chart — let users keep reading the history.
- **Resolved (you won):** confetti burst (one-shot, capped at 1.2s, particles use category accent + gold), winner panel keeps full colour and gets a green `✓ WON` badge, your P&L displayed in 36sp display green. Loser panel goes greyscale.
- **Resolved (you lost):** *no* confetti, *no* red flash. Quiet acknowledgment — winner panel still highlighted, your row shows `-₦1,000` in `status.loss` colour (`#D88A8A`). Empathy over punishment. (Kalshi and Polymarket both make a point of not punishing the loss visually; we should too.)

---

## 7. THE GIST — Redesign Spec

The Gist is the comments section in the market detail. Today it's a flat list of `CommentRow`s — a serviceable Reddit-lite. It can be the **soul of the app** because of the bet-pill mechanic: every commenter's side is visible. That is genuinely novel and we under-use it.

### 7.1 Gist header & filter tabs

Above the first comment:

- `─── THE GIST · 84 takes ───` (keep the current divider, add count).
- Three filter chips below it: **`Hot 🔥` · `New` · `Top week`**.
  - **Hot** = engagement velocity (likes + replies per hour), default tab.
  - **New** = chronological reverse.
  - **Top week** = highest-liked over the last 7 days.
- A **side filter** to the right of the tabs: `All · YES · NO`. Tap to filter takes by which side the commenter is on. This is the killer feature — readers can see *only the YES camp's takes* or *only the NO camp's*, turning the gist into a literal debate.

### 7.2 Comment row redesign

Today each row is a flat avatar + name + bet-pill + body + meta. Improve:

- **Stake-weight indicator.** Behind the avatar, draw a thin ring whose thickness reflects the commenter's stake size (₦1k = 1px, ₦100k = 4px). The ring is in their side's category accent. Subtle, but it lets readers weight opinions by skin-in-the-game.
- **Whale badge.** If the commenter's stake is in the top 5% for the market, show a small `🐋` glyph after their name. (Polymarket does this; it creates aspiration and credibility.)
- **Inline reply preview.** Each comment shows the first reply inline (collapsed to 1 line) with `+5 more replies` if there are more. Tapping expands inline (no navigation). Limit nesting depth to **1** — flat-with-context, not tree. This is the Reddit-mobile pattern that works.
- **Reactions, not just hearts.** Today: heart only. Add `🔥 🤔 💀 🎯` as a long-press menu (Apple Messages-style). Each reaction adds to a per-comment counter row. This is the dopamine multiplier; one button = one signal, four buttons = four signals.
- **Comment with bet-change.** If a commenter *also* changed their stake while posting, render a small inline event: `↑ Added ₦2k to YES` between the body and the meta. This makes the gist a living trade journal.

### 7.3 Composer (input bar)

Today: tappable placeholder that opens a sheet. Improve:

- The placeholder rotates between Pidgin prompts: *"Drop your take…"*, *"Wetin you think?"*, *"Talk am, no shy."*
- To the left of the placeholder, show a tiny pill of the user's current side: `● YES 1.6x` (their side colour). This reminds the user what camp they're commenting from before they speak.
- If user has no position: the bar is dimmed and says *"Stake first to join the gist"*. Tapping it bounces gently and shows a small toast pointing to the side panels above.

### 7.4 Typing indicator

When ≥1 other user is composing a comment on this market right now, show a dim chip above the input bar: `● Ada is typing…` (max one name, otherwise `2 people typing…`). Same WebSocket as activity tape. This is the cheapest, highest-impact "alive" signal in the whole app.

### 7.5 Empty state

Today: *"Nobody don talk yet"*. Good copy, weak visual. Add:

- A subtle illustration: a chat bubble outlined in category soft, with a faint `?` inside.
- A nudge below: *"Be the first to drop your take and start the gist."* Tapping it focuses the composer.

### 7.6 Pinned context

Pin the **top comment of the week** (highest reactions) to the top of the Hot tab with a small `📌 Pinned · Top take this week` badge. This rewards good takes (creators want this) and gives drive-by readers an instant headline.

---

## 8. WALLET — Redesign Spec (Deposit + Withdraw entry)

Today: bare `app/wallet/deposit.tsx` with a number input and quick-pick chips. The page assumes the user is *already convinced* to deposit. A real fintech onboards them in the same screen.

### 8.1 Wallet home (a NEW screen — currently missing)

Today, there is no `wallet/index` — `/wallet/deposit` and `/wallet/withdraw` are reached only from buttons elsewhere. Add a wallet home accessible from the persistent header balance pill. Structure:

```
┌─────────────────────────────────────┐
│ ← BACK                Wallet        │
├─────────────────────────────────────┤
│                                     │
│            AVAILABLE                │  ← 11sp tracked caps muted
│         ₦ 12,400.50                 │  ← 48sp display, TickFlash
│         +₦340 today (+2.8%)         │  ← daily delta, green/red
│                                     │
│ ┌────────────┬────────────┐         │  ← quick action grid (2x2)
│ │  ↓ Deposit │ ↑ Withdraw │         │
│ ├────────────┼────────────┤         │
│ │ 📊 P&L     │ 📜 History │         │
│ └────────────┴────────────┘         │
│                                     │
│ Locked in markets                   │
│  ₦ 4,200  · across 6 active bets    │  ← summary card, tap → portfolio
│                                     │
│ Recent activity                     │
│  ↓ Deposit · ₦5,000  · 2h ago       │
│  ✓ Won · Tinubu market · +₦3,400    │
│  ↑ Withdraw · ₦2,000 · 3d ago       │
│  …                                  │
│                                     │
└─────────────────────────────────────┘
```

This is the page that makes the wallet feel like a **portfolio**, not a payment form. The daily delta is the **single most-checked number in any trading app** — without it, there is no reason to open the wallet.

### 8.2 Deposit screen

Keep the five-pane state machine (`entry / processing / success / failed / cancelled`). Redesign the **entry pane** specifically:

- **Header**: `Top up your wallet` (24sp bold) + supporting line `Add naira to start staking` (14sp muted).
- **Big amount entry.** 64sp display number, naira symbol prefixed at 32sp muted. Caret in brand orange. As the user types, the number animates (digit roll-up like a slot machine) — this is borrowed from Cash App and is half the reason their deposit feels good.
- **Quick chips.** Keep `₦1k · ₦2k · ₦5k · ₦10k`, but redesign as **filled chips that pulse on tap** rather than outlined chips. Add a smart 5th chip: `Refill last (₦5k)` if the user has a previous deposit.
- **What you'll get.** Below the amount, a live line: *"You'll have ₦17,400 to stake."* This anchors the deposit in *what it enables*, not what it costs.
- **Method strip.** Below the input, a horizontal row of payment methods (`Card · Bank transfer · USSD · Opay`) with the active one highlighted in brand. Currently this is hidden inside Stripe — surface it. People want to know.
- **Continue button.** Full-width 56dp, brand-orange, large. Below it, micro-copy: *"Powered by Stripe · Funds reflect instantly"*.

### 8.3 Processing pane

Today this is a polling spinner. Redesign as a **journey strip**:

```
●━━━━━━●━━━━━━○━━━━━━○
Paid   Verifying  Crediting wallet
```

Three dots, animated fill. Each dot is captioned. The last segment morphs into a green check + `Done` when complete. This makes the wait feel like progress, not lag.

### 8.4 Success pane

The success pane should be the **most rewarding screen in the app**. Today it's a sober confirmation.

- A **one-shot confetti burst** (brand orange + green).
- 64sp `+ ₦5,000` in green with TickFlash.
- New balance below at 24sp: `New balance ₦17,400`.
- Two CTAs: `Find a market →` (primary, brand) and `Done` (secondary, ghost).
- Auto-dismiss after 4s if no interaction → land back on Home with the balance pill flashing.

### 8.5 Withdraw

The withdrawal flow is already a 6-pane sheet (`features/withdrawals/components/panes/*`). Keep the machine. Surface improvements:

- **Show the cap visibly.** *"You can withdraw up to ₦12,400 today"* with a horizontal capacity bar.
- **Bank account chip.** Show the saved bank as a chip with bank logo. Tapping switches accounts. Eliminates re-entering details for 90% of users.
- **Pidgin reassurance.** *"Your money go land within 4 hours, max."* — sets expectation and reduces support tickets.
- **Success screen** — same celebratory pattern as Deposit success but in muted green: `↑ ₦2,000 sent · Reference WHL-12X9`.

---

## 9. PORTFOLIO — Redesign Spec

Today's portfolio (`app/(tabs)/portfolio.tsx`) is a header + tabs + list. It tells the user *what they have* but not *how they're doing*. Robinhood gets this right; we currently do not.

### 9.1 The hero (the part that makes you open the app)

Replace today's `Total / Positions / Cash` static row with a **portfolio chart hero**:

```
┌───────────────────────────────────────┐
│  PORTFOLIO VALUE                       │  ← 11sp tracked caps muted
│  ₦ 16,600.50                          │  ← 48sp display, TickFlash
│  +₦340 today (+2.1%)  · all-time +18% │  ← deltas in green or red
│                                        │
│         ╱╲      ╱─╲                    │
│    ╱─╲ ╱  ╲ ╱─╲╱   ╲      ╱─          │  ← area sparkline 120dp tall
│   ╱   ╲╱    ╲      ╲    ╱            │
│  ╱                  ╲╱╲╱              │
│                                        │
│  1D · 1W · 1M · ALL                    │  ← range tabs
│                                        │
└───────────────────────────────────────┘
```

- **Total value** = cash + sum of `(stake * current implied probability)` for all open positions. This is the mark-to-market number; it changes as markets move. **It must TickFlash on each WebSocket update.**
- **Daily delta** = today's value − value at start of day. Coloured green (`status.win`) or red (`status.loss`). If 0, muted.
- **Sparkline** = portfolio value over selected range. Tap-and-hold to scrub.
- **All-time delta** = lifetime P&L vs total deposits.

This single block changes the portfolio from a *receipt* into a *scoreboard*. **Open-rate driver #1.**

### 9.2 Stats row (reskinned)

Below the chart, a 3-up stat row in `surface/01` capsules:

- **Open positions:** `6 active`
- **Win rate:** `64%` with a tiny 1-line trend pill (`↑ 4% this week`).
- **Best streak:** `5 in a row 🔥`

Win rate and streak are gamification primitives — Duolingo, Strava, Sleeper — and free for us to add since we already track bet outcomes.

### 9.3 Tabs (Open / History) → re-think

Today: `OPEN / HISTORY` underlined tabs. Add a third tab: **`WATCHING`** (markets the user has favourited but not yet bet on). Watching is a low-commitment funnel into betting; without it, the only way to remember a market is to bet on it.

### 9.4 Position rows (Open tab)

Today: a `PositionRow` shows market name + side + stake. Add:

- **Live mark-to-market value** to the right of the stake: `₦5,000 → ₦6,800` with the new value in green (or red) and an inline `+36%` pill.
- **Mini-rail** beneath the row showing the current YES/NO split as a 4dp segmented bar.
- **Closes-in countdown** in micro-text: `closes in 3d 4h`.
- **Long-press menu**: `Add to stake · Share · Set alert` (alert = notify me if probability moves ±10%).

### 9.5 History rows

Add a **per-row P&L badge** in green/red on the right, large enough to scan a screenful of history in 2 seconds. Group history by day with sticky date headers (`Today`, `Yesterday`, `Tue Apr 9`). Day headers carry a tiny aggregate: `Today · +₦340 across 3 settled bets`.

### 9.6 Watching tab

Card list of markets favourited from anywhere. Each shows compact card + a one-tap `Stake` button. If a watched market moves >10% since favouriting, prefix the row with a `🔥` and show the delta in the corner.

### 9.7 Empty states (with personality)

- **No open positions:** illustration of an empty wallet + *"Your bets go land here. Pick a market wey sweet you."* Below: a CTA `Browse markets →`.
- **No history:** *"You never settle bet. Time fit dey."*
- **No watchlist:** *"Tap ☆ on any market to track am here."*

---

## 10. Cross-cutting habits (what to do *consistently*)

These touches, applied uniformly across all six surfaces, are the difference between a redesign and a re-skin.

1. **Every number tickflashes when it changes.** Wallet pill, portfolio total, probability percent, pool size. No exceptions.
2. **Every list mounts with a 30ms staggered fade-up.** Home feed, gist, history, watching.
3. **Every CTA gives haptic.** Stake = `selection`, Deposit success = `notification.success`, Withdraw confirm = `impact.medium`. Already partly in code — tighten and document.
4. **Every category gets its accent.** No pure-grey markets. The category accent should be the thing that lets a user say "that's my politics market" from across the room.
5. **Every WebSocket-driven element breathes.** Rails, live dots, typing indicators. A still page is a dead page.
6. **Every empty state is a sentence in Pidgin.** Never `"No data"`. The voice is the product.
7. **Every screen has exactly one primary action.** Home → Stake. Detail → Stake. Wallet → Deposit. Portfolio → (open position context menu). Don't ship two equal CTAs.

---

## 11. What to build first (sequenced)

If we redesign everything at once we ship nothing. Suggested sequence — each item is shippable independently and lifts a measurable metric:

1. **Category palette + 3-tier surfaces + display type.** *(Foundations — unblocks everything.)*
2. **Hero Pulse Card on Home.** *(One card, but it changes the entire home aesthetic.)*
3. **Inline dual-CTA on Market Card.** *(Shortens stake funnel from 4 taps to 1. Direct conversion lift.)*
4. **TickFlash on wallet pill + portfolio total.** *(Single biggest "this app feels alive" win.)*
5. **Probability chart on Market Detail.** *(Adds the missing primary content; benchmarks against Polymarket.)*
6. **Activity tape on Market Detail.** *(Cheap, dramatic alive-signal.)*
7. **Wallet home + portfolio chart hero.** *(Turns wallet/portfolio into a scoreboard.)*
8. **Gist filter tabs (side + sort) + reactions + typing dots.** *(Turns the gist into the social moat.)*
9. **Live-now horizontal rail on Home.** *(Discovery layer.)*
10. **State-rich market cards (just-staked chip, resolved card, closing-soon pulse).** *(Recall + retention.)*

After these ten, the app stops looking like a competent MVP and starts looking like Wahala.

---

## 12. Out of scope (explicitly)

- Onboarding / signup / auth screens.
- Leaderboard (already has its own bespoke design with podium).
- Profile / settings.
- Admin / market-creator surfaces.

These deserve their own pass; this doc concentrates the budget on the **six surfaces with the highest user-touch frequency**.

---

*Doc owner: design + product. Iterate freely; the principles in §2 and the cross-cutting habits in §10 are the parts that should not move.*
