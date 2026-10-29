/** Where a search goes: made-up sets in memory, or the bank through the `/api/v1` route. */
export const BANK_PROFILES = ["fixture", "api"] as const;
export type BankProfile = (typeof BANK_PROFILES)[number];
