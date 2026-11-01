import type { Page } from "@playwright/test";

/**
 * Agrees on the AI's consent screen (dl-z5ja.32) whenever it shows: a new pod is asked once after
 * sign-in, and the agreement is kept on the pod, so a reload or a second sign-in is not asked again.
 * The specs that sign a parent in against the api register it before their first step.
 */
export async function agreeToAi(page: Page): Promise<void> {
  await page.addLocatorHandler(page.locator("[data-consent]"), async () => {
    await page.locator("[data-consent-agree]").click();
    await page.locator("[data-consent]").waitFor({ state: "hidden" });
  });
}
