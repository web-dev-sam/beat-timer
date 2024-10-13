import { test, expect } from "@playwright/test";

test.describe("Song Import and Export Flow", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("complete song import and export process", async ({ page }) => {
		await test.step("Verify initial page elements", async () => {
			await expect(
				page.getByRole("heading", { name: "Import your song" }),
			).toBeVisible();
			await expect(page.getByLabel("Select file")).toBeEnabled();
		});

		await test.step("Navigate to align the beat", async () => {
			await expect(page.getByRole("button", { name: "example" })).toBeVisible();
			await page.getByRole("button", { name: "example" }).click();
			await expect(
				page.getByRole("heading", { name: "Align the beat" }),
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: "seems on time" }),
			).toBeVisible();
		});

		await test.step("Proceed to export", async () => {
			await page.getByRole("button", { name: "seems on time" }).click();
			await expect(page.getByRole("button", { name: "export" })).toBeVisible();
		});

		await test.step("Export and verify file", async () => {
			const downloadPromise = page.waitForEvent("download");
			await page.getByRole("button", { name: "export" }).click();
			const download = await downloadPromise;

			expect(download.suggestedFilename().endsWith(".ogg")).toBeTruthy();
		});
	});
});
