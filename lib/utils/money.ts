// lib/utils/money.ts
// Wallet balances arrive from the API as bigint strings in kobo.
// Never convert them to JS Number — use BigInt arithmetic and format as naira.

export function formatKoboAsNaira(koboString: string | null | undefined): string {
  if (!koboString) return '0';
  let kobo: bigint;
  try {
    kobo = BigInt(koboString);
  } catch {
    return '0';
  }
  // Drop the kobo (sub-naira) digits for the headline display.
  const naira = kobo / 100n;
  // Insert thousands separators.
  return naira.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Compact naira display for tight UI surfaces (e.g. tab bar).
// Below 1,000 → exact integer ("0", "999").
// 1,000+ → 1k, 12k, 200k, 1m, 1.5m, 1b, etc.
// Drops trailing ".0" and clamps to one decimal so it stays narrow.
export function formatKoboAsCompactNaira(
  koboString: string | null | undefined
): string {
  if (!koboString) return '0';
  let kobo: bigint;
  try {
    kobo = BigInt(koboString);
  } catch {
    return '0';
  }
  const naira = kobo / 100n;
  const negative = naira < 0n;
  const abs = negative ? -naira : naira;

  const tiers: Array<{ threshold: bigint; suffix: string }> = [
    { threshold: 1_000_000_000_000n, suffix: 't' },
    { threshold: 1_000_000_000n, suffix: 'b' },
    { threshold: 1_000_000n, suffix: 'm' },
    { threshold: 1_000n, suffix: 'k' },
  ];

  let body: string;
  const tier = tiers.find((t) => abs >= t.threshold);
  if (!tier) {
    body = abs.toString();
  } else {
    // Compute one decimal of precision via BigInt to avoid Number overflow.
    const scaled = (abs * 10n) / tier.threshold; // tenths
    const whole = scaled / 10n;
    const tenth = scaled % 10n;
    body = tenth === 0n ? `${whole.toString()}${tier.suffix}` : `${whole.toString()}.${tenth.toString()}${tier.suffix}`;
  }
  return negative ? `-${body}` : body;
}
