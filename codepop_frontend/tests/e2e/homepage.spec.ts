import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Check if the page loads (basic smoke test)
    // The page might show loading states or errors, but it should load
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have basic page structure', async ({ page }) => {
    await page.goto('/');

    // Check for common elements that should exist
    // This is a basic structure test - adjust selectors based on your actual components
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
  /*
  test('should open customize modal', async ({ page }) => {
    await page.goto('/');

    // Wait for drinks to load
    await page.waitForSelector('[data-testid="drink-card"]');

    // Click on the first drink card
    await page.locator('[data-testid="drink-card"]').first().click();

    // Check if modal opens
    await expect(page.locator('[data-testid="customize-modal"]')).toBeVisible();
  });
  */

  // Comment out tests that require backend until backend is available
  /*
  test('should allow category filtering', async ({ page }) => {
    await page.goto('/');

    // Wait for drinks to load
    await page.waitForSelector('[data-testid="drink-card"]');

    // Click on a category filter (adjust selector based on your CategoryFilter component)
    await page.click('[data-testid="category-trending"]');

    // Verify that the URL or some state changes
    //await expect(page).toHaveURL(/.*trending.*/ // Adjust based on your routing
});