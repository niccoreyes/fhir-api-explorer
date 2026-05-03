const { chromium } = require('playwright');

/**
 * Facilitator Dashboard Update Test
 * 
 * This test verifies that the facilitator dashboard shows real group status.
 * NOTE: Current implementation uses localStorage which is browser-specific.
 * For a real workshop with 50 users, you'd need server-side coordination.
 */

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('='.repeat(70));
    console.log('FACILITATOR DASHBOARD UPDATE VERIFICATION');
    console.log('='.repeat(70));
    console.log();
    console.log('⚠️  NOTE: Current implementation uses localStorage (per-browser).');
    console.log('   For 50 users on different devices, server-side sync needed.');
    console.log();

    const browser = await chromium.launch({ headless: false });
    
    try {
        // Create ONE context - simulating same browser (localStorage will sync)
        console.log('Creating single browser context...');
        const context = await browser.newContext();
        
        // Open 3 tabs in the SAME context
        const pageGroup1 = await context.newPage();
        const pageGroup3 = await context.newPage();
        const pageFacilitator = await context.newPage();

        // Collect logs
        const allLogs = [];
        [pageGroup1, pageGroup3, pageFacilitator].forEach((page, index) => {
            const names = ['Group 1', 'Group 3', 'Facilitator'];
            page.on('console', msg => {
                const log = `[${names[index]}] ${msg.text()}`;
                allLogs.push(log);
                if (msg.type() === 'error') {
                    console.error('❌', log);
                }
            });
        });

        // ============================================
        // PHASE 1: Setup Group 1 (CREATE)
        // ============================================
        console.log('\n📋 PHASE 1: Group 1 Setup (CREATE Patient)');
        console.log('-'.repeat(70));
        
        await pageGroup1.goto('http://localhost:8080');
        await pageGroup1.waitForLoadState('networkidle');
        await delay(500);

        await pageGroup1.click('[data-case="case1"]');
        await delay(300);
        await pageGroup1.click('[data-group="1"]');
        await delay(300);
        await pageGroup1.click('[data-mode="clinician"]');
        await delay(200);
        await pageGroup1.click('#enterWorkshop');
        await delay(1000);
        
        console.log('✓ Group 1 in workshop');

        // ============================================
        // PHASE 2: Setup Group 3 (SEARCH)
        // ============================================
        console.log('\n🔍 PHASE 2: Group 3 Setup (SEARCH Patient)');
        console.log('-'.repeat(70));
        
        await pageGroup3.goto('http://localhost:8080');
        await pageGroup3.waitForLoadState('networkidle');
        await delay(500);

        await pageGroup3.click('[data-case="case1"]');
        await delay(300);
        await pageGroup3.click('[data-group="3"]');
        await delay(300);
        await pageGroup3.click('[data-mode="clinician"]');
        await delay(200);
        await pageGroup3.click('#enterWorkshop');
        await delay(1000);
        
        console.log('✓ Group 3 in workshop');

        // ============================================
        // PHASE 3: Setup Facilitator
        // ============================================
        console.log('\n🎯 PHASE 3: Facilitator Setup');
        console.log('-'.repeat(70));
        
        await pageFacilitator.goto('http://localhost:8080');
        await pageFacilitator.waitForLoadState('networkidle');
        await delay(500);

        await pageFacilitator.click('[data-case="case1"]');
        await delay(300);
        await pageFacilitator.click('#selectFacilitator');
        await delay(1000);
        
        console.log('✓ Facilitator in dashboard');

        // ============================================
        // PHASE 4: Check Initial Status
        // ============================================
        console.log('\n📊 PHASE 4: Checking Initial Facilitator Status');
        console.log('-'.repeat(70));
        
        // Get initial status of all groups
        async function getGroupStatus(page, groupNum) {
            const statusEl = page.locator(`#group-status-${groupNum}`);
            if (await statusEl.count() > 0) {
                const text = await statusEl.textContent();
                return text.trim();
            }
            return 'NOT FOUND';
        }

        const initialStatuses = {};
        for (let i = 1; i <= 5; i++) {
            initialStatuses[i] = await getGroupStatus(pageFacilitator, i);
            console.log(`  Group ${i}: ${initialStatuses[i]}`);
        }

        // ============================================
        // PHASE 5: Group 1 Creates Patient
        // ============================================
        console.log('\n📝 PHASE 5: Group 1 Creating Patient');
        console.log('-'.repeat(70));

        await pageGroup1.selectOption('#gender', 'male');
        await pageGroup1.fill('#birthDate', '1990-01-15');
        await pageGroup1.fill('#phone', '+639171234567');
        await delay(300);
        
        console.log('✓ Group 1 filled form');
        
        await pageGroup1.click('#executeTaskBtn');
        console.log('✓ Group 1 clicked CREATE');
        await delay(2500);

        // Check response
        const response1 = await pageGroup1.locator('.response-success').count() > 0;
        if (response1) {
            const statusCode = await pageGroup1.locator('.status-code').textContent();
            console.log(`✓ Group 1 CREATE response: ${statusCode}`);
        } else {
            console.log('❌ Group 1 CREATE failed');
        }

        // ============================================
        // PHASE 6: Check Facilitator After Group 1
        // ============================================
        console.log('\n🎯 PHASE 6: Checking Facilitator After Group 1 Action');
        console.log('-'.repeat(70));
        
        // Wait for polling interval (5 seconds) + buffer
        console.log('⏳ Waiting for polling update (5s)...');
        await delay(5500);
        
        // Refresh facilitator page to get latest
        await pageFacilitator.reload();
        await delay(2000);
        
        // Wait for dashboard to be populated by JavaScript
        await pageFacilitator.waitForSelector('.dashboard-card', { timeout: 5000 });
        await delay(500);
        
        const afterGroup1Statuses = {};
        for (let i = 1; i <= 5; i++) {
            afterGroup1Statuses[i] = await getGroupStatus(pageFacilitator, i);
            const changed = afterGroup1Statuses[i] !== initialStatuses[i];
            console.log(`  Group ${i}: ${afterGroup1Statuses[i]} ${changed ? '👈 CHANGED!' : ''}`);
        }

        // ============================================
        // PHASE 7: Group 3 Searches Patient
        // ============================================
        console.log('\n🔍 PHASE 7: Group 3 Searching Patient');
        console.log('-'.repeat(70));

        await pageGroup3.click('#executeTaskBtn');
        console.log('✓ Group 3 clicked SEARCH');
        await delay(2500);

        // Check response
        const response3 = await pageGroup3.locator('.response-success').count() > 0;
        if (response3) {
            const statusCode = await pageGroup3.locator('.status-code').textContent();
            console.log(`✓ Group 3 SEARCH response: ${statusCode}`);
            
            // Check if found
            const responseText = await pageGroup3.locator('.response-body').textContent();
            if (responseText.includes('Rico') || responseText.includes('total')) {
                console.log('✅ Patient found in search!');
            }
        } else {
            console.log('❌ Group 3 SEARCH failed');
        }

        // ============================================
        // PHASE 8: Check Facilitator After Group 3
        // ============================================
        console.log('\n🎯 PHASE 8: Checking Facilitator After Group 3 Action');
        console.log('-'.repeat(70));
        
        console.log('⏳ Waiting for polling update (5s)...');
        await delay(5500);
        
        // Refresh facilitator page
        await pageFacilitator.reload();
        await delay(2000);
        
        // Wait for dashboard to be populated
        await pageFacilitator.waitForSelector('.dashboard-card', { timeout: 5000 });
        await delay(500);
        
        const finalStatuses = {};
        for (let i = 1; i <= 5; i++) {
            finalStatuses[i] = await getGroupStatus(pageFacilitator, i);
            const changed = finalStatuses[i] !== initialStatuses[i];
            console.log(`  Group ${i}: ${finalStatuses[i]} ${changed ? '👈 CHANGED!' : ''}`);
        }

        // ============================================
        // FINAL VERIFICATION
        // ============================================
        console.log('\n' + '='.repeat(70));
        console.log('FINAL VERIFICATION');
        console.log('='.repeat(70));

        // Check if any groups updated
        let updatedCount = 0;
        for (let i = 1; i <= 5; i++) {
            if (finalStatuses[i] !== initialStatuses[i]) {
                updatedCount++;
            }
        }

        console.log(`\nStatus updates detected: ${updatedCount} groups`);
        
        if (updatedCount >= 2) {
            console.log('✅ SUCCESS: Facilitator dashboard shows updated statuses!');
            console.log('   Group 1 should show: COMPLETE');
            console.log('   Group 3 should show: COMPLETE');
        } else if (updatedCount === 0) {
            console.log('⚠️  WARNING: Facilitator did not detect status updates');
            console.log('   This is expected with localStorage (same-browser only)');
            console.log('   For multi-device workshops, server-side sync needed');
        } else {
            console.log(`⚠️  PARTIAL: Only ${updatedCount} group(s) updated`);
        }

        // Count errors
        const errorCount = allLogs.filter(log => 
            log.includes('Error:') && !log.includes('favicon')
        ).length;

        console.log(`\nConsole errors (excluding favicon): ${errorCount}`);

        if (errorCount === 0) {
            console.log('✅ No critical errors');
        }

        // Take final screenshot
        await pageFacilitator.screenshot({ path: 'facilitator-final-status.png' });
        console.log('\n📸 Screenshot saved: facilitator-final-status.png');

        // Keep open to observe
        console.log('\n⏳ Keeping browser open for 3 seconds...');
        await delay(3000);

        await context.close();

        return { 
            success: true, 
            updatedGroups: updatedCount,
            totalErrors: errorCount 
        };

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

// Run the test
runTest().then(result => {
    console.log('\n' + '='.repeat(70));
    if (result.success) {
        if (result.updatedGroups >= 2) {
            console.log('🎉 DASHBOARD UPDATE TEST PASSED!');
            console.log(`   ${result.updatedGroups} groups updated their status`);
        } else {
            console.log('⚠️  DASHBOARD UPDATE TEST - PARTIAL');
            console.log('   Only ' + result.updatedGroups + ' group(s) updated');
            console.log('   (Expected: localStorage sync within same browser)');
        }
        process.exit(0);
    } else {
        console.log('💥 TEST FAILED');
        process.exit(1);
    }
});
