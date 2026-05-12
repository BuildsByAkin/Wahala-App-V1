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
