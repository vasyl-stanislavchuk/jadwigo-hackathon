// The lesson builder's render check end to end (dl-a38n.34, the steward's note on #320): the page
// draws a draft from JADWIGO_DRAFTS_DIR, its render rules read each drawn step and twin on the real
// DOM, the findings go to the dev server (/@builder/render), come back with the draft as
// render.json, and pin under the step or twin they are about. The "builder" project runs this
// against `vite` serve with a temp copy of e2e/drafts (playwright.config.ts); no api.
//
// The draft, e2e/drafts/e2e-render.json, is equal-groups with two faults planted: s05's say ends in
// a stray `$3 \times 4` (raw TeX), and s05's twin shows a picture the server does not serve. A
// sentence split into blocks cannot be planted from a draft any more: #316 fixed it in lesson-kit,
// and e2e/recognition-tex.spec.ts holds that.
import { expect, test } from "@playwright/test";

const TWIN_PATH = "script.parts[2].steps[0].question.help.twin";

test("render findings pin under their step and twin, through the dev server and back", async ({
  page,
}) => {
  await page.goto("/playground/lesson");
  await expect(page.getByRole("heading", { name: "Równe grupy" })).toBeVisible();
  const step = page.getByRole("region", { name: "Step s05" });
  const twin = page.getByRole("region", { name: "Twin s05t" });
  await expect(twin).toBeVisible();

  // The findings arrive only after a round trip: the page posts, the server writes, the watcher sends.
  const onStep = step.getByRole("list", { name: "Findings on s05" });
  await expect(onStep).toContainText("render-raw-tex", { timeout: 15_000 });
  const onTwin = twin.getByRole("list", { name: "Findings on s05t" });
  await expect(onTwin).toContainText("render-picture-missing", { timeout: 15_000 });
  await expect(onTwin).toContainText(TWIN_PATH);
  await expect(onStep).not.toContainText("render-picture-missing");

  // The step table counts the twin's finding on its step's row and tones it.
  await expect(page.locator("[data-row='s05']")).toHaveAttribute("data-tone", "error");
  // A step drawn right has none.
  await expect(
    page.getByRole("region", { name: "Step s02" }).getByRole("list", { name: "Findings on s02" }),
  ).toHaveCount(0);
});
