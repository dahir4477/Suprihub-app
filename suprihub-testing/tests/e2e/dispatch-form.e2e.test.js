import { expect, test } from "@playwright/test";

test("user submits a dispatch request through the browser UI", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /dispatch request form/i })).toBeVisible();

  await page.getByLabel(/name/i).fill("E2E Tester");
  await page.getByLabel(/email/i).fill(`e2e.${Date.now()}@example.com`);
  await page.getByLabel(/message/i).fill("Verify frontend, nginx proxy, backend, and database.");
  await page.getByRole("button", { name: /submit/i }).click();

  await expect(page.getByRole("status")).toHaveText("Dispatch request submitted successfully.");
  await expect(page.getByLabel(/name/i)).toHaveValue("");
  await expect(page.getByLabel(/email/i)).toHaveValue("");
  await expect(page.getByLabel(/message/i)).toHaveValue("");
});

test("user sees a validation message when the backend rejects a request", async ({ page }) => {
  await page.route("**/api/submit", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "email is invalid" })
    });
  });

  await page.goto("/");

  await page.getByLabel(/name/i).fill("Invalid User");
  await page.getByLabel(/email/i).fill("invalid@example.com");
  await page.getByLabel(/message/i).fill("Force a backend validation response.");
  await page.getByRole("button", { name: /submit/i }).click();

  await expect(page.getByRole("status")).toHaveText("email is invalid");
});
