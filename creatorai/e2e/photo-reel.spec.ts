import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Uses the resized demo copies (names p1…p18) so no original photos are needed. Dropped in shuffled order.
const dir = path.join(__dirname, "..", "public", "demo", "photo-reel", "photos");
const order = [7, 3, 18, 1, 12, 5, 16, 9, 2, 14, 10, 6, 17, 4, 13, 8, 15, 11];

test("photo dump → reel, end to end", async ({ page }) => {
  // hardcoded demo sign-in (see lib/auth.ts)
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@creatorai.app");
  await page.getByLabel("Password", { exact: true }).fill("Demo@1234");
  await page.locator("form").getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/home");

  await page.goto("/short-videos");
  await page.locator("input[type=file]").first().setInputFiles(
    order.map((n) => ({ name: `p${n}.jpg`, mimeType: "image/jpeg", buffer: fs.readFileSync(path.join(dir, `p${n}.jpg`)) })),
  );
  await expect(page.getByText("Reading 18 photos")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Edit in Studio" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("From 18 photos")).toBeVisible();

  await page.getByRole("button", { name: "Edit in Studio" }).click();
  await page.waitForURL("**/studio/**");
  await expect(page.getByText("Text on video")).toBeVisible();

  await page.locator("#trim-out").fill("10");
  await expect(page.getByText("10.0 sec of")).toBeVisible();

  await page.getByRole("button", { name: "Captions" }).click();
  await page.getByRole("button", { name: "Use this" }).first().click();

  await page.getByRole("button", { name: /^Thumbnail/ }).click();
  await expect(page.getByText("Recommended")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Use this thumbnail" }).click();

  await page.getByRole("button", { name: /^Done/ }).click();
  await page.waitForURL("**/review/**");
  await expect(page.getByText("The video carries its own sound")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Publish", exact: true }).click();

  await page.goto("/studio");
  await expect(page.getByText("Photo dump reel").locator("xpath=ancestor::*[self::li or self::tr or self::div][1]")).toContainText("Published");
});
