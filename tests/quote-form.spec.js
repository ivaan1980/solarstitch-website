const { test, expect } = require('@playwright/test');

test.describe('Quote Form', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('file:///Users/ivaandejager/Documents/solarstitch-website/index.html');
    });

    test('can navigate through all steps of quote form', async ({ page }) => {
        // Navigate to quote page
        await page.click('text=Get Quote');
        await expect(page.locator('text=Step 1 of 10')).toBeVisible();

        // Step 1: Address
        console.log('Testing Step 1 (Address)...');
        await page.fill('input[placeholder="Enter your full address"]', '123 Test Street, Cape Town');
        await page.click('button:has-text("Continue")');

        // Step 2: Property details
        console.log('Testing Step 2 (Property)...');
        await expect(page.locator('text=Step 2 of 10')).toBeVisible();
        await page.click('text=Tiles');
        await page.click('text=Single Story');
        await page.click('button:has-text("Continue")');

        // Step 3: Energy goals
        console.log('Testing Step 3 (Goals)...');
        await expect(page.locator('text=Step 3 of 10')).toBeVisible();
        await page.fill('input[placeholder="e.g. 2500"]', '3500');
        await page.click('text=Reduce electricity costs');
        await page.click('button:has-text("Continue")');

        // Step 4: Technical specs
        console.log('Testing Step 4 (Technical)...');
        await expect(page.locator('text=Step 4 of 10')).toBeVisible();
        await page.click('label:has-text("Single Phase")');
        await page.click('label:has-text("Electric")');

        // Wait for state to update
        await page.waitForTimeout(500);

        // Check if continue button is enabled
        const continueBtn = page.locator('button:has-text("Continue")');
        await expect(continueBtn).toBeEnabled({ timeout: 5000 });
        await continueBtn.click();

        // Step 5: Installation distance
        console.log('Testing Step 5 (Installation distance)...');
        await expect(page.locator('text=Step 5 of 10')).toBeVisible();
        await page.fill('input[placeholder="e.g. 15"]', '10');
        await page.click('button:has-text("Continue")');

        // Step 6: Budget
        console.log('Testing Step 6 (Budget)...');
        await expect(page.locator('text=Step 6 of 10')).toBeVisible();
        await page.click('text=R80,000 - R120,000');
        await page.click('button:has-text("Continue")');

        // Step 7: Financing
        console.log('Testing Step 7 (Financing)...');
        await expect(page.locator('text=Step 7 of 10')).toBeVisible();
        await page.click('text=No, I prefer to pay cash');
        await page.click('button:has-text("Continue")');

        // Step 8: Timeline
        console.log('Testing Step 8 (Timeline)...');
        await expect(page.locator('text=Step 8 of 10')).toBeVisible();
        await page.click('text=Within 1-3 months');
        await page.click('button:has-text("Continue")');

        // Step 9: Additional requirements
        console.log('Testing Step 9 (Additional)...');
        await expect(page.locator('text=Step 9 of 10')).toBeVisible();
        await page.click('button:has-text("Continue")');

        // Step 10: Contact details
        console.log('Testing Step 10 (Contact)...');
        await expect(page.locator('text=Step 10 of 10')).toBeVisible();
        await page.fill('input[placeholder="Full Name *"]', 'Test User');
        await page.fill('input[placeholder="Phone Number *"]', '0821234567');
        await page.fill('input[placeholder="Email Address *"]', 'test@example.com');

        // Check submit button is enabled
        const submitBtn = page.locator('button:has-text("Submit Request")');
        await expect(submitBtn).toBeEnabled();

        console.log('All steps completed successfully!');
    });

    test('Contact page loads and displays correct info', async ({ page }) => {
        await page.click('text=Contact');
        await expect(page.locator('h1:has-text("Contact Us")')).toBeVisible();
        await expect(page.locator('main >> text=+27 82 573 9565')).toBeVisible();
        await expect(page.locator('main >> text=admin@solarstitch.co.za')).toBeVisible();
        await expect(page.locator('main >> text=Cape Town')).toBeVisible();
        await expect(page.locator('main >> text=Bloemfontein')).toBeVisible();
        await expect(page.locator('text=We respond within 24 hours')).toBeVisible();
    });

    test('can navigate back through steps', async ({ page }) => {
        await page.click('text=Get Quote');

        // Go to step 2
        await page.fill('input[placeholder="Enter your full address"]', '123 Test Street');
        await page.click('button:has-text("Continue")');
        await expect(page.locator('text=Step 2 of 10')).toBeVisible();

        // Go back to step 1
        await page.click('button:has-text("Back")');
        await expect(page.locator('text=Step 1 of 10')).toBeVisible();

        // Check address is still filled
        const addressInput = page.locator('input[placeholder="Enter your full address"]');
        await expect(addressInput).toHaveValue('123 Test Street');
    });
});
