/** Where questions come from. The bank itself is never in git (tools/check-no-bank.ts). */
export const BANK_SOURCES = ["fixture", "local", "remote"] as const;
export type BankSource = (typeof BANK_SOURCES)[number];

export function isBankSource(value: string): value is BankSource {
  return (BANK_SOURCES as readonly string[]).includes(value);
}
