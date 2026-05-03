const { test, expect } = require('@playwright/test');

test('debug create patient workflow', async ({ page }) => {
    // Capture console logs
    const logs = [];
    page.on('console', msg => {
        logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Capture errors
    const errors = [];
    page.on('pageerror', error => {
        errors.push(error.message);
    });
    
    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/01-initial.png' });
    
    // Click Case 1
    await page.click('.case-card[data-case="case1"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/02-group-selection.png' });
    
    // Click Group 1
    await page.click('.group-card[data-group="1"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/03-view-selection.png' });
    
    // Select clinician view
    await page.click('[data-mode="clinician"]');
    await page.waitForTimeout(200);
    
    // Enter workshop
    await page.click('#enterWorkshop');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/04-clinician-view.png' });
    
    // Check if execute button exists
    const executeBtn = await page.$('#executeTaskBtn');
    console.log('Execute button exists:', !!executeBtn);
    
    if (executeBtn) {
        // Click without filling form (should show validation error)
        await executeBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/05-validation-error.png' });
        
        // Check for toast
        const toast = await page.$('.toast');
        console.log('Toast exists:', !!toast);
        if (toast) {
            const text = await toast.textContent();
            console.log('Toast text:', text);
        }
        
        // Now fill the form
        await page.selectOption('#gender', 'male');
        await page.fill('#birthDate', '1992-03-15');
        await page.fill('#familyName', 'DelaCruzTest');
        await page.fill('#givenName', 'RicoTest');
        
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/06-form-filled.png' });
        
        // Click create again
        await executeBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/07-after-create.png' });
        
        // Check response area
        const responseContainer = await page.$('#responseContainer');
        if (responseContainer) {
            const text = await responseContainer.textContent();
            console.log('Response text:', text.substring(0, 200));
        }
    }
    
    // Print all logs
    console.log('\n=== Console Logs ===');
    logs.forEach(log => console.log(log));
    
    if (errors.length > 0) {
        console.log('\n=== Page Errors ===');
        errors.forEach(err => console.log(err));
    }
});
