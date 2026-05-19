# Wahala — Redesign v2: The Arena

> **What changed since v1.** Re-reading v1 honestly, it is a polished *clone* of Polymarket + Kalshi with a Pidgin voice on top. It will work. It will also be the eighth-best app in the category. This v2 argues that we should stop benchmarking western prediction-market apps and instead build the **first social arena** — a category we can own.
> Read v1 ([./docs/REDESIGN.md](./docs/REDESIGN.md)) for the screen-level visual primitives (palette, motion, surfaces). Keep that work. **This doc is the new mental model that sits on top.**

---

## 1. Honest critique of v1

What v1 got right:
- The foundations are correct (category palette, surface elevation, named motion library, display typography). Keep them all.
- The cross-cutting habits in §10 — TickFlash, breathing rails, Pidgin voice — are non-negotiable. Keep them.
- The shipping sequence is reasonable as an *execution* order.

What v1 got wrong:
1. **It re-skins a Polymarket clone.** Hero card → probability rail → side panels → activity tape → comments. That is literally the Polymarket layout. We will lose the "who copied who" argument.
2. **It treats markets as financial instruments.** Probabilities, multipliers, pool sizes, mark-to-market. Western markets-app vocabulary. Our user is not a trader; our user is a 21-year-old in Lagos who wants to be *right loudly*.
3. **It is a passive feed app.** Open → scroll → tap → stake → leave. There is no *reason to come back at a specific moment*. BeReal, Duolingo, BBNaija live shows all have a "you must be here now" hook. We don't.
4. **It is solitary.** Each user trades alone. The gist is an afterthought. But Wahala's whole edge is the **gist** — the public stance, the drama, the camp.
5. **It doesn't have a soul-of-app moment.** Robinhood has the daily P&L. Duolingo has the streak. BeReal has the 2-minute window. Polymarket has the live chart. What is Wahala's *one moment*? v1 doesn't answer.

The reframe that follows fixes all five.

---

## 2. The reframe: Wahala is a public arena, not a market

**Old mental model (v1).** Wahala is a Nigerian Polymarket. Users browse markets, place stakes, watch probabilities, settle.

**New mental model (v2).** Wahala is a **public arena for opinions with money on them**. Every bet is a *public stance*. Every market is a *small reality show* with two camps, a crowd, a countdown, and a verdict. The product is not the transaction — it is the *spectacle*.

Three vocabulary swaps make this concrete:

| Old word           | New word          | Why                                                            |
|--------------------|-------------------|----------------------------------------------------------------|
| Market             | **Wahala**        | The thing itself is the brand. "Drop a Wahala", "today's Wahala". |
| Outcome / position | **Camp**          | You don't take a position; you join a camp. Camps have colour, chat, roster. |
| Bet                | **Stance**        | A bet is a public statement of belief, backed by money.        |
| Comments           | **The Gist**      | Already there. Keep it. Elevate it from sidebar to centrepiece. |
| Stake              | **Plant flag**    | Visual metaphor — your flag is planted in your camp.           |

This is not "rename and ship". This is the *frame that decides every product question*. When you ask "should we add an order book?" — order books don't belong in an arena. When you ask "should we add streaks?" — yes, because arenas have rituals.

---

## 3. The four pillars of the arena (each one is something Polymarket/Kalshi cannot copy without breaking themselves)

These are the four things v2 commits to that no incumbent has. We don't ship one of them — we ship all four, because together they constitute the new category.

### 3.1 Pillar 1 — The Daily Wahala (the BeReal moment)

Every day, at a moment chosen by the algorithm based on engagement peaks (~7pm WAT for Nigerian users), the app fires a **single push notification**:

> **"⚡ Today's Wahala is live. You get 4 hours. Pick your camp."**

For 4 hours, one curated market is the **main event**. The home screen rearranges itself to put it front-and-centre. Resolution happens within 24h. After it closes:
- Your daily streak ticks up by one if you placed a stance.
- You get a personal "verdict card" you can share to WhatsApp / IG / X — a vertical 9:16 image with the question, your camp, and what happened.
- You get the **next day's preview**: *"Tomorrow: Will Davido drop the album he promised? Get ready."*

**Why this matters.**
- It gives users a *time of day* to open the app. That's how BeReal, Wordle, Duolingo, and BBNaija all became habits.
- It creates a **shared experience** — every user is debating the same thing at the same time. Polymarket users are scattered across thousands of niche markets; nobody is in the same room. Wahala users are.
- It generates a **shareable, viral artifact** every day. Wordle's score grid was 95% of its growth.
- It naturally seeds the gist with traffic — when one market is everyone's market, the gist explodes.

**Risk.** Picking a bad daily Wahala. We invest in human curation early; algorithmic later.

### 3.2 Pillar 2 — Camps, not Outcomes (the tribal layer)

The moment you stake, you are *enrolled* in a camp. Camp UX:

- **Camp colour.** YES is teal, NO is purple (or category-derived). It is *yours* now. Your avatar gets a thin ring in your camp colour wherever it appears (gist, leaderboard, profile).
- **Camp roster.** Open a market → tap your camp → see every other person in it. Sorted by stake size. Whales at the top, you in your slot, the crowd below.
- **Camp chat (private).** A WhatsApp-style group chat *just for your camp*. Plan your defence, share evidence, hype each other up. NO can't see YES's chat. **This is the killer feature.** It manufactures tribal loyalty.
- **Camp leaderboard.** Each camp has a collective P&L. Top contributing whales get badges. "Top YES advocate this week" is a real, claimable status.
- **Defection.** You can switch camps mid-market, but: (1) it costs a small fee, (2) it is announced publicly in the gist with a special "🏃 Ada switched to NO" event card. Defection is rare, public, and dramatic — exactly the kind of moment that fuels the gist.

**Why this matters.**
- It reframes "betting" as "joining". Joining is social; betting is solo.
- The private camp chat is something you cannot get on Polymarket. Once a user is in one, they are sticky in a way no chart can make them sticky.
- It turns the gist from a comment section into a *debate stage* — two camps that already coalesce internally then face each other publicly.

### 3.3 Pillar 3 — Drama Mode (the final hour)

Every Wahala has a final-hour state called **Drama Mode**. When `now > closesAt - 1h`:

- The market detail screen takes over the entire viewport. Top bar disappears. The countdown becomes the hero — 96sp display, ticking every second, in category accent.
- The probability rail thickens to 24dp and starts oscillating visibly on every micro-tick.
- The gist switches to **"Live takes"** — comments stream in real-time without manual refresh, like Twitch chat. Each new comment slides in from the bottom.
- A **Live Audio Room** opens at the top of the gist (see Pillar 4). Voices replace text.
- Last-minute stances cost more (a tiny `+5% late fee` is added to the pool, redistributed to early-stakers on win). This is **economically meaningful and dramatic** — the late-comer pays a premium, the early-comer is rewarded for conviction.
- The "plant flag" CTA pulses. Haptic gets stronger. The whole screen feels like the last 60 seconds of an auction.
- At T-0, Drama Mode plays a 3-2-1 freeze animation, then the resolution waits. Stakers stay in the room. When the resolution lands, **camps that won get a confetti burst in their colour**, camps that lost get a quiet "Better luck next Wahala" overlay. **Empathy on loss; spectacle on win.**

**Why this matters.**
- It manufactures a *peak emotional moment* every market has. Sports games have the final whistle. Reality shows have the eviction. Trading apps have nothing equivalent — markets just… close. Wahala has Drama Mode.
- Drama Mode is the single most shareable scene in the app. Screen-recordings of Drama Mode are the marketing.
- The late-fee mechanic is **gameable in a fun way** — bold late stances become heroic; FOMO becomes literally expensive.

### 3.4 Pillar 4 — Live Gist Rooms (audio + reactions, not just text)

The gist today is a comment list. v2 turns it into a **multi-modal room** that activates at certain triggers (Drama Mode, major news breaks, organiser-scheduled events).

- **Voice.** Like Twitter Spaces — anyone in the market with an active stance can request the mic, the camp's top whales are speakers by default. Bottom-bar UI shows a wave-form for whoever is talking, with their camp ring around the avatar.
- **Reaction confetti.** Tap a button → animated emoji floats up the screen. Coloured by your camp. (Twitch / TikTok Live pattern.)
- **Live polls inside the room.** A whale can fire off a 30-second mini-poll *inside* a market — "Is anyone seeing the news from Aso Rock?" — turning the room into the place where information *arrives*.
- **Recording.** Rooms are auto-recorded and become a "Gist replay" — 24h ephemeral audio clips users can scrub through after the market resolves (Snapchat Stories pattern).

**Why this matters.**
- Audio is **the most under-served channel in prediction markets**. The Athletic, theScore, and HomeCrowd have all proven sports audiences want it; Polymarket has zero audio.
- In Nigeria, voice notes are the dominant social-media artefact (WhatsApp culture). Audio is more native than text.
- Audio rooms compound the camp identity — your voice is on a public record defending YES.

---

## 4. How the four pillars re-shape the six screens

The v1 doc covers each screen surface-by-surface. v2 keeps all those visual specs but re-orders the *priority* of what each screen does. Below is a *delta* from v1 — not a full rewrite.

### 4.1 Home (was: news-feed of markets → becomes: today's arena)

The home screen has **three tiers**, not a flat feed:

```
┌─────────────────────────────────────────┐
│  STREAK FLAME 🔥 12   AVATAR  ₦12,400   │  persistent
├─────────────────────────────────────────┤
│  ⚡ TODAY'S WAHALA · 03h 12m left        │  hero band
│                                         │
│  "Will Tinubu sign the wage bill?"      │  the daily
│  ╱ JOIN YES (3.2k) ╲  ╱ JOIN NO (5.1k) ╲│  two big camp doors
│  84% are in. 412 talking now.           │
├─────────────────────────────────────────┤
│  🏟  Open arenas  (vertical-swipe feed) │  ← TikTok-style cards
│  ┌─────────────────────────────────────┐│
│  │  one full-screen Wahala card        ││
│  │  swipe up for next, double-tap to   ││
│  │  plant flag                         ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  📖 Your camps                          │
│  4 active wahalas · 2 in Drama Mode now │
└─────────────────────────────────────────┘
```

- **Persistent strip.** The streak flame replaces the bell. Streak is the single most-protected number in any habit app; we put it where the eye lands first. (Loss aversion = retention.)
- **Today's Wahala band.** Always visible. Counts down. Two huge "Join YES" / "Join NO" doors. **Stake is one tap from home.**
- **Vertical-swipe arena feed.** Below the band, the feed is **not** a vertical list of cards — it's a TikTok-style vertical pager. One full-screen Wahala per page; swipe up for next; **double-tap to plant flag on the leading camp**. Single tap for camp chooser. This is the discovery layer; it is built for *passive scrolling, decisive action*. (Polymarket has nothing like this. Polyswipe — the Tinder-style Polymarket prototype — proves the appetite.)
- **Your camps strip.** Pinned at the bottom. Shows your active markets. If any are in Drama Mode, the chip pulses red.

### 4.2 Market Card (was: feed item → becomes: arena ticket)

Two formats now:

- **Full-screen card** (used in the home vertical-swipe feed): bleeds edge to edge, image is the background with a 70% dark gradient, question is in 32sp display. Two big camp doors at the bottom, each taking 50% width — `JOIN YES (3.2k)` / `JOIN NO (5.1k)`. Double-tap → joins the leading camp with a default stake. Swipe up → next card. Swipe right → open detail. Swipe left → dismiss/hide.
- **List card** (used in Your Camps, Watching, History): keeps v1's compact card design, but **adds the camp ribbon** — a 4dp coloured ribbon along the left edge in your camp's colour, and a single emoji at the top-right: 🔥 (Drama Mode), 🏁 (resolved win), 😔 (resolved loss), ⏳ (active), 👀 (watching).

The full-screen card pattern is the **single most important UI change** in v2. It transforms how users encounter markets: from "scrolling a feed" to "swiping through an arena". TikTok proved this is the highest-engagement consumption pattern on mobile.

### 4.3 Market Detail (was: trading floor → becomes: arena room)

Keep v1's probability chart and activity tape. **Add three things and reorder:**

1. **Camp split header** replaces the dual side panels. Two halves, joined at a vertical seam:
   ```
   ┌────────────────┬────────────────┐
   │  🟢 YES CAMP   │  🟣 NO CAMP    │
   │  3,214 people  │  5,182 people  │
   │  ₦1.2m staked  │  ₦890k staked  │
   │  ◯ ◯ ◯ ◯ +12   │  ◯ ◯ ◯ ◯ +27   │  avatar stacks
   │ [ Plant flag ] │ [ Plant flag ] │
   └────────────────┴────────────────┘
   ```
   Each half is tappable to enter that camp's roster + private chat (if you're in it) or a "peek" view (if you're not).
2. **The Gist gets two tabs at its header**: `Public gist` (everyone) and `My camp chat` (your camp only, requires stance). The camp chat is structurally identical to a WhatsApp group — flat, no nesting, voice-notes supported, emoji reactions. The public gist keeps the v1 structure (Hot/New/Top, side filter).
3. **Live Audio Room slot** above The Gist when a room is active: a 60dp band showing speaker avatars in a wave-form, "🔴 LIVE · 142 listening · Tap to enter".

Drama Mode (Pillar 3) **takes over the entire screen** in the final hour. Everything else collapses to make room for the countdown + live takes + audio room.

### 4.4 The Gist (was: comments → becomes: arena chatter)

Already covered above by Pillar 4 (audio rooms) and camp-split (camp chat tab). Two additional changes:

- **Voice-note comments.** Long-press the composer → record a voice note up to 30s. Plays inline with a waveform. This is the WhatsApp-native input. **Polymarket cannot ship this** without it feeling weird; Wahala can because our audience speaks via voice notes.
- **Stance-change as a special event.** When someone in the gist changes their stake, it appears as a different visual entirely — a small "stance event card" between regular comments, with their old camp colour bleeding into their new camp colour as a gradient. Rare, dramatic, narrative.

### 4.5 Wallet (was: payment form → becomes: war chest)

Reframe: the wallet is your **war chest**. Two changes from v1's Wallet Home:

- The "Locked in markets" section gets a **per-camp breakdown**: "₦1.2k locked in 4 YES camps · ₦3.0k locked in 2 NO camps". Each camp is tappable to that market.
- Add a **"Today's earnings"** row at the top with a Robinhood-style sparkline. If you took the Daily Wahala and won, this shows the win first thing.

Keep all of v1's deposit/withdraw flow improvements. They are good.

### 4.6 Portfolio (was: positions list → becomes: trophy room)

Major reframe. The portfolio is not a list of positions — it is your **personal record**.

```
┌─────────────────────────────────────────┐
│  RECORD                                 │
│  18 W — 6 L  (75%)        🔥 12-day     │  hero stats, big
│                                         │
│  ╲╱╲    sparkline of all-time P&L  ╱─   │
│                                         │
│ ┌──────────┬──────────┬──────────┐      │
│ │ ACTIVE 6 │ WON 18   │ LOST 6   │      │  tabs
│ └──────────┴──────────┴──────────┘      │
│  ─── Active camps ───────────────       │
│  [camp row · camp row · camp row …]     │
│  ─── Trophies ───────────────────       │  ← NEW
│  🏆 First win                            │
│  🐋 First ₦100k stake                    │
│  🔥 7-day streak                         │
│  🎯 Top YES advocate (Tinubu market)     │
└─────────────────────────────────────────┘
```

Two new things vs v1:

- **Record as the hero.** `18 W — 6 L (75%)` in giant display type, with the streak flame. This is sports-scoreboard language. It is what users brag about. (Polymarket buries this; the leaderboard is separate from the portfolio. We put it together.)
- **Trophies.** Lifetime achievements. Cheap to build (we already have the events), enormous for retention. Trophies show up on profile, shareable as cards.

The mark-to-market chart from v1 stays — but it's secondary now, not the hero. The *record* leads.

---

## 5. Differentiation matrix — what we have that they don't

| Feature                         | Polymarket | Kalshi | BBNaija app | **Wahala v2** |
|---------------------------------|------------|--------|-------------|----------------|
| Probability chart               | ✅          | ✅      | ❌           | ✅              |
| Vertical-swipe market discovery | ❌          | ❌      | ❌           | ✅              |
| Daily ritual / time-boxed event | ❌          | ❌      | ✅           | ✅ **(unique combo)** |
| Camps with private chat         | ❌          | ❌      | ❌           | ✅              |
| Live audio rooms inside markets | ❌          | ❌      | ❌           | ✅              |
| Drama Mode (final hour)         | ❌          | ❌      | partial     | ✅              |
| Daily streak                    | ❌          | ❌      | ❌           | ✅              |
| Voice-note comments             | ❌          | ❌      | ❌           | ✅              |
| Shareable verdict cards         | ❌          | ❌      | ❌           | ✅              |
| Trophies / lifetime record      | partial    | ❌      | ❌           | ✅              |
| Pidgin voice                    | ❌          | ❌      | ❌           | ✅              |

Six of the eleven rows are "only Wahala". That is what category-creation looks like.

---

## 6. The one moment (the soul of the app)

If you have to point at *one moment* and say "this is Wahala", it is this:

> It is 7:01pm on a Wednesday. Your phone buzzes. *"⚡ Today's Wahala is live."* You open the app. The whole screen is a question: **"Will Davido drop the album tonight?"** Two doors. You tap YES. Your phone vibrates. You're in the YES camp. There are 3,201 other YES-stans in there with you. The camp chat is already going — voice notes, memes, hot takes. Somebody in the camp says they have inside info. The probability rail starts moving. Three hours later, Drama Mode kicks in. The countdown is enormous. Your camp's voice room is full — somebody is *actually playing* what they claim is a leaked snippet. At 11:00pm, the album drops on Spotify. Confetti in your camp colour. You're up ₦8,400. You screenshot the verdict card and post it to your status. You did not just win a bet. You **were there**.

No prediction-market app makes that moment. No reality-TV app pays you for it. We do both.

---

## 7. What this costs (the honest list)

This vision is more expensive than v1. Be clear-eyed:

1. **Curation cost.** "Today's Wahala" requires a human (initially) picking and writing one market per day. Probably one full-time editor. This is the price of being a destination, not a feed.
2. **Realtime infrastructure.** Audio rooms (WebRTC), live chat at scale, drama-mode high-frequency updates. v1 already needs WebSockets; v2 needs more.
3. **Moderation.** Camp chats and voice rooms can become toxic. We need report flows, mute, timeout, and ideally an AI-moderator on voice. Plan for this from day 1.
4. **Regulatory clarity.** Drama Mode's "late fee redistributed to early-stakers" is *technically* a market-making mechanism. Confirm it sits cleanly within the Nigerian regulatory frame before shipping.
5. **Audio is hard.** Not all users have headphones. Default to text; promote audio. Don't force.

These costs are the *moat*. They are why this is hard to copy.

---

## 8. Sequencing (revised from v1)

Same first 4 items as v1 (the foundations + tickflash). Then the order changes because we prioritise the **pillars** over polish:

1. (from v1) Category palette + 3-tier surfaces + display type.
2. (from v1) TickFlash on wallet pill + portfolio total.
3. **NEW** — Streak system + flame in persistent strip. *(Lightest, biggest retention impact.)*
4. **NEW** — Vertical-swipe arena feed on Home. *(Replaces v1's hero pulse card; bigger swing.)*
5. **NEW** — Camp colour + camp roster + camp ribbon on cards. *(Makes "joining" visible everywhere.)*
6. **NEW** — Today's Wahala curation + daily push + verdict-card share asset.
7. **NEW** — Camp chat (text-only, MVP).
8. **NEW** — Drama Mode countdown + late-fee mechanic.
9. (from v1) Probability chart on Market Detail.
10. **NEW** — Voice-note comments in the gist.
11. **NEW** — Live Audio Rooms (WebRTC). *Highest-effort, ship last.*
12. **NEW** — Trophies + lifetime record reframe of the portfolio.
13. (from v1) Wallet home + portfolio chart hero.

After items 3–8, the app is **already a different category** from Polymarket — even without the audio room.

---

## 9. What we explicitly *don't* do (kill list)

To be a new category you have to refuse to be the old one:

- ❌ **No order book.** Order books are for traders, not stans. Stick with pool-based pari-mutuel.
- ❌ **No limit orders / advanced trading UI.** Anyone who wants this can use Polymarket.
- ❌ **No financial-app branding.** Don't show candle charts as the default. Don't use "BUY" / "SELL" terminology. We are not Coinbase.
- ❌ **No infinite-scroll lazy feed.** The feed is finite (today's curated set of arenas) and swipe-based. Refusing infinite scroll is a *feature* — it makes the app finishable, which makes it returnable.
- ❌ **No private markets / DM betting between users.** Centralises drama in public arenas where the gist generates value.

---

## 10. Recommendation

- **Adopt v2 as the product direction.**
- **Keep v1's visual foundations (§§2, 3, 10 of v1).** They are the building blocks of either direction.
- **Re-sequence the roadmap** per §8 above so the four pillars get built early, before excessive screen polish.
- **Hire (or designate) a Today's Wahala curator** before launch. This role is the heartbeat.
- **Build a small, ugly prototype of the camp chat + Drama Mode** as the first concrete test. If users in a closed beta start *talking in their camp chats unprompted*, the thesis is right. If they don't, kill the camp pillar and revert to v1.

The next time someone says our screens look "AI-looking", the right answer is not "we'll add more polish". The right answer is "the screens are AI-looking because we are building an app that already exists. v2 is the app that doesn't yet."

---

*Doc owner: design + product. v2 supersedes v1's structural choices but inherits its tokens, motions, and copy voice. Treat v1 as the style guide; treat v2 as the strategy.*
