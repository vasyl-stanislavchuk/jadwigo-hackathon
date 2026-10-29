/** The bank package's one read of the environment. */
import { BANK_PROFILES, type BankProfile } from "./profiles.ts";

/**
 * The profile `JADWIGO_BANK` names, or undefined when it is unset or blank. `local` and `remote`
 * are not built here: the Python service in `jadwigo-bank` serves them, so naming one is an error
 * that says so rather than a quiet fall back to the fixture.
 */
export function bankProfile(): BankProfile | undefined {
  const value = process.env["JADWIGO_BANK"]?.trim();
  if (!value) return undefined;
  if ((BANK_PROFILES as readonly string[]).includes(value)) return value as BankProfile;
  throw new Error(
    `JADWIGO_BANK=${value} is not a profile here: use ${BANK_PROFILES.join(" or ")} (local and remote are jadwigo-bank's)`,
  );
}
