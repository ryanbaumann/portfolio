import { test, expect } from '@playwright/test';

test.describe('Strava 3D Explorer E2E Smoke Tests', () => {
  test('App boots without console errors', async ({ page }) => {
    const jsErrors = [];
    const consoleErrors = [];

    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.stack || err.message}`);
      jsErrors.push(err.message);
    });

    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore Google Maps api/development warnings and resource 404s
        if (!text.includes('Google Maps') && !text.includes('status of 404')) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto('/');

    // Let the page boot and do initial rendering
    await page.waitForTimeout(2000);

    expect(jsErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Unauthenticated state shows Connect and Demo buttons', async ({ page }) => {
    await page.goto('/');

    // Check that Connect button exists
    const connectBtn = page.locator('#strava-connect-button');
    await expect(connectBtn).toBeVisible();

    // Check that Demo button exists
    const demoBtn = page.locator('#demo-button');
    await expect(demoBtn).toBeVisible();
    await expect(demoBtn).toHaveText(/Try the demo/);
  });

  test('Clicking Demo button loads activity select, stats, elevation SVG, and play button', async ({ page }) => {
    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.stack || err.message}`);
    });

    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/');

    // Click the Demo button (Playwright will automatically wait until it is enabled/actionable)
    const demoBtn = page.locator('#demo-button');
    await demoBtn.click();

    // Verify activity filter/select is visible
    const activitySelect = page.locator('#select_lst');
    await expect(activitySelect).toBeVisible();

    // The dropdown should contain the two demo options plus the default
    const options = activitySelect.locator('option');
    await expect(options).toHaveCount(3); // "Select an Activity...", "Alpine Ride 🚴", "Coastal Run 🏃"

    // Wait for the stats to populate for the auto-selected first activity (Alpine Ride)
    const activityName = page.locator('#activity-name');
    await expect(activityName).toHaveText('Alpine Ride 🚴');

    // Check stats values (e.g. distance, time, elevation)
    const distanceVal = page.locator('#activity-distance');
    await expect(distanceVal).not.toBeEmpty();
    await expect(distanceVal).toContainText('mi');

    const elevationVal = page.locator('#activity-elevation');
    await expect(elevationVal).not.toBeEmpty();
    await expect(elevationVal).toContainText('ft');

    // Elevation SVG should render a path
    const elevationPath = page.locator('#elevation-svg path#elevation-area');
    await expect(elevationPath).toBeVisible();
    const dAttribute = await elevationPath.getAttribute('d');
    expect(dAttribute).not.toBeNull();
    expect(dAttribute.length).toBeGreaterThan(0);

    // Tour play button is enabled
    const tourPlayBtn = page.locator('#tour-play-btn');
    await expect(tourPlayBtn).toBeVisible();
    await expect(tourPlayBtn).toBeEnabled();
  });
});
