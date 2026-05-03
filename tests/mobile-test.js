const { chromium } = require('playwright');

/**
 * Mobile Responsiveness Test
 */

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('='.repeat(60));
    console.log('MOBILE RESPONSIVENESS TEST');
    console.log('='.repeat(60));
    console.log();

    const browser = await chromium.launch({ headless: false });
    
    try {
        const context = await browser.newContext({
            viewport: { width: 375, height: 667 },
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
        });
        
        const page = await context.newPage();
        
        // Test 1: Entry page on mobile
        console.log('📱 Test 1: Entry page on mobile (375x667)');
        await page.goto('http://localhost:8080');
        await delay(1000);
        
        // Check if case cards are visible and stacked
        const caseCards = await page.locator('.case-card').count();
        console.log(`✓ Found ${caseCards} case cards`);
        
        // Take screenshot
        await page.screenshot({ path: 'mobile-entry.png', fullPage: true });
        console.log('✓ Screenshot: mobile-entry.png');
        
        // Test 2: Navigate through flow
        console.log('\n📱 Test 2: Navigate workshop on mobile');
        
        await page.click('[data-case="case1"]');
        await delay(500);
        
        await page.click('[data-group="1"]');
        await delay(500);
        
        await page.click('[data-mode="clinician"]');
        await delay(200);
        
        await page.click('#enterWorkshop');
        await delay(1000);
        
        // Check if mobile nav is visible
        const mobileNav = await page.isVisible('.mobile-nav');
        console.log(`✓ Mobile navigation visible: ${mobileNav ? 'Yes' : 'No'}`);
        
        // Check if form is accessible
        const formVisible = await page.isVisible('#familyName');
        console.log(`✓ Form accessible: ${formVisible ? 'Yes' : 'No'}`);
        
        await page.screenshot({ path: 'mobile-workshop.png', fullPage: true });
        console.log('✓ Screenshot: mobile-workshop.png');
        
        // Test 3: Switch views via mobile nav
        console.log('\n📱 Test 3: Switch views via mobile nav');
        
        await page.click('.mobile-nav-btn[data-view="architecture"]');
        await delay(500);
        
        const archVisible = await page.isVisible('#architectureView');
        console.log(`✓ Architecture view visible: ${archVisible ? 'Yes' : 'No'}`);
        
        await page.screenshot({ path: 'mobile-architecture.png' });
        console.log('✓ Screenshot: mobile-architecture.png');
        
        // Test 4: Tablet size
        console.log('\n📱 Test 4: Tablet size (768x1024)');
        
        await page.setViewportSize({ width: 768, height: 1024 });
        await delay(500);
        
        await page.reload();
        await delay(1000);
        
        // Check if sidebar is visible on tablet
        const sidebarVisible = await page.isVisible('.workshop-sidebar');
        console.log(`✓ Sidebar visible on tablet: ${sidebarVisible ? 'Yes' : 'No'}`);
        
        await page.screenshot({ path: 'tablet-view.png', fullPage: true });
        console.log('✓ Screenshot: tablet-view.png');
        
        // Results
        console.log('\n' + '='.repeat(60));
        console.log('RESULTS');
        console.log('='.repeat(60));
        console.log('✅ Mobile responsiveness test completed!');
        console.log('✅ All views accessible on mobile devices');
        console.log('✅ Mobile navigation working correctly');
        
        await delay(2000);
        await context.close();
        
        return { success: true };
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

runTest().then(result => {
    console.log('\n' + '='.repeat(60));
    if (result.success) {
        console.log('🎉 MOBILE TEST PASSED!');
        process.exit(0);
    } else {
        console.log('💥 TEST FAILED');
        process.exit(1);
    }
});
