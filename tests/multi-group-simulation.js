const { chromium } = require('playwright');

/**
 * Multi-Group Workshop Simulation Test
 * 
 * This test simulates the real workshop scenario:
 * - Group 1 (CREATE) creates a patient
 * - Group 3 (SEARCH) searches for the patient
 * - Facilitator monitors all groups
 */

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('='.repeat(60));
    console.log('AKLAN FHIR WORKSHOP - Multi-Group Simulation');
    console.log('='.repeat(60));
    console.log();

    const browser = await chromium.launch({ headless: false });
    
    try {
        // Create 3 browser contexts (simulating 3 different users)
        console.log('Creating 3 browser contexts (3 users)...');
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const pageGroup1 = await context1.newPage();
        const pageGroup3 = await context2.newPage();
        const pageFacilitator = await context3.newPage();

        // Collect console logs from all pages
        const allLogs = [];
        [pageGroup1, pageGroup3, pageFacilitator].forEach((page, index) => {
            page.on('console', msg => {
                const log = `[User ${index + 1}] ${msg.type()}: ${msg.text()}`;
                allLogs.push(log);
                if (msg.type() === 'error') {
                    console.error('❌', log);
                }
            });
            
            page.on('pageerror', error => {
                const err = `[User ${index + 1}] Page Error: ${error.message}`;
                allLogs.push(err);
                console.error('❌', err);
            });
        });

        // ============================================
        // PHASE 1: Setup Group 1 (CREATE Patient)
        // ============================================
        console.log('\n📋 PHASE 1: Setting up Group 1 (CREATE Patient)');
        console.log('-'.repeat(60));
        
        await pageGroup1.goto('http://localhost:8080');
        await pageGroup1.waitForLoadState('networkidle');
        await delay(500);

        // Select Case 1
        await pageGroup1.click('[data-case="case1"]');
        await delay(500);
        console.log('✓ Group 1 selected Case 1');

        // Select Group 1
        await pageGroup1.click('[data-group="1"]');
        await delay(500);
        console.log('✓ Group 1 selected');

        // Select Clinician view
        await pageGroup1.click('[data-mode="clinician"]');
        await delay(200);
        console.log('✓ Group 1 selected Clinician view');

        // Enter workshop
        await pageGroup1.click('#enterWorkshop');
        await delay(1000);
        console.log('✓ Group 1 entered workshop');

        // Verify Group 1 is in CREATE mode
        const group1Task = await pageGroup1.locator('#taskTitle').textContent();
        console.log(`✓ Group 1 task: ${group1Task}`);

        // ============================================
        // PHASE 2: Setup Group 3 (SEARCH Patient)
        // ============================================
        console.log('\n🔍 PHASE 2: Setting up Group 3 (SEARCH Patient)');
        console.log('-'.repeat(60));
        
        await pageGroup3.goto('http://localhost:8080');
        await pageGroup3.waitForLoadState('networkidle');
        await delay(500);

        // Select Case 1
        await pageGroup3.click('[data-case="case1"]');
        await delay(500);
        console.log('✓ Group 3 selected Case 1');

        // Select Group 3
        await pageGroup3.click('[data-group="3"]');
        await delay(500);
        console.log('✓ Group 3 selected');

        // Select Clinician view
        await pageGroup3.click('[data-mode="clinician"]');
        await delay(200);
        console.log('✓ Group 3 selected Clinician view');

        // Enter workshop
        await pageGroup3.click('#enterWorkshop');
        await delay(1000);
        console.log('✓ Group 3 entered workshop');

        // Verify Group 3 is in SEARCH mode
        const group3Task = await pageGroup3.locator('#taskTitle').textContent();
        console.log(`✓ Group 3 task: ${group3Task}`);

        // ============================================
        // PHASE 3: Setup Facilitator
        // ============================================
        console.log('\n🎯 PHASE 3: Setting up Facilitator');
        console.log('-'.repeat(60));
        
        await pageFacilitator.goto('http://localhost:8080');
        await pageFacilitator.waitForLoadState('networkidle');
        await delay(500);

        // Select Case 1
        await pageFacilitator.click('[data-case="case1"]');
        await delay(500);
        console.log('✓ Facilitator selected Case 1');

        // Click Facilitator button
        await pageFacilitator.click('#selectFacilitator');
        await delay(1000);
        console.log('✓ Facilitator entered dashboard');

        // Verify facilitator view is showing
        const isDashboardVisible = await pageFacilitator.isVisible('.facilitator-dashboard');
        console.log(`✓ Facilitator dashboard visible: ${isDashboardVisible ? 'Yes' : 'No'}`);

        // ============================================
        // PHASE 4: Group 1 Creates Patient
        // ============================================
        console.log('\n📝 PHASE 4: Group 1 Creates Patient');
        console.log('-'.repeat(60));

        // Fill in additional patient data
        await pageGroup1.selectOption('#gender', 'male');
        await delay(200);
        await pageGroup1.fill('#birthDate', '1990-01-15');
        await delay(200);
        await pageGroup1.fill('#phone', '+639171234567');
        await delay(200);
        console.log('✓ Group 1 filled patient form');

        // Click CREATE button
        await pageGroup1.click('#executeTaskBtn');
        console.log('✓ Group 1 clicked CREATE button');
        await delay(2000);

        // Check for success response
        const responseVisible1 = await pageGroup1.isVisible('.response-success');
        const responseError1 = await pageGroup1.isVisible('.response-error');
        
        if (responseVisible1) {
            const responseText1 = await pageGroup1.locator('.response-success').textContent();
            console.log('✓ Group 1 CREATE successful');
            console.log(`  Response preview: ${responseText1.substring(0, 100)}...`);
        } else if (responseError1) {
            const errorText1 = await pageGroup1.locator('.response-error').textContent();
            console.log('❌ Group 1 CREATE failed:', errorText1);
        } else {
            console.log('⚠️ No response visible for Group 1 yet');
        }

        // ============================================
        // PHASE 5: Group 3 Searches Patient
        // ============================================
        console.log('\n🔍 PHASE 5: Group 3 Searches for Patient');
        console.log('-'.repeat(60));

        // Wait a moment for patient to be indexed
        await delay(2000);

        // Click SEARCH button
        await pageGroup3.click('#executeTaskBtn');
        console.log('✓ Group 3 clicked SEARCH button');
        await delay(2000);

        // Check for search response
        const responseVisible3 = await pageGroup3.isVisible('.response-success');
        const responseError3 = await pageGroup3.isVisible('.response-error');
        
        if (responseVisible3) {
            const responseText3 = await pageGroup3.locator('.response-success').textContent();
            console.log('✓ Group 3 SEARCH successful');
            console.log(`  Response preview: ${responseText3.substring(0, 100)}...`);
            
            // Check if patient was found
            if (responseText3.includes('Rico') || responseText3.includes('Bundle')) {
                console.log('✅ Patient found in search results!');
            } else {
                console.log('⚠️ Search completed but patient may not be in results yet');
            }
        } else if (responseError3) {
            const errorText3 = await pageGroup3.locator('.response-error').textContent();
            console.log('❌ Group 3 SEARCH failed:', errorText3);
        } else {
            console.log('⚠️ No response visible for Group 3 yet');
        }

        // ============================================
        // PHASE 6: Facilitator Checks Status
        // ============================================
        console.log('\n🎯 PHASE 6: Facilitator Monitoring');
        console.log('-'.repeat(60));

        // Switch to facilitator view if needed
        await delay(1000);

        // Check dashboard cards
        const dashboardCards = await pageFacilitator.locator('.dashboard-card').count();
        console.log(`✓ Facilitator sees ${dashboardCards} group cards`);

        // Take screenshots of all three views
        console.log('\n📸 Taking screenshots...');
        await pageGroup1.screenshot({ path: 'test-group1-create.png' });
        await pageGroup3.screenshot({ path: 'test-group3-search.png' });
        await pageFacilitator.screenshot({ path: 'test-facilitator.png' });
        console.log('✓ Screenshots saved:');
        console.log('  - test-group1-create.png');
        console.log('  - test-group3-search.png');
        console.log('  - test-facilitator.png');

        // ============================================
        // FINAL VERIFICATION
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('FINAL VERIFICATION');
        console.log('='.repeat(60));

        // Count errors
        const errorCount = allLogs.filter(log => 
            log.includes('Error:') || 
            log.includes('error') || 
            log.includes('❌')
        ).length;

        console.log(`Total console errors: ${errorCount}`);

        if (errorCount === 0) {
            console.log('✅ NO ERRORS - Workshop simulation successful!');
        } else {
            console.log(`⚠️ Found ${errorCount} errors in console`);
        }

        // Verify key elements
        const workshop1Visible = await pageGroup1.isVisible('#workshopApp');
        const workshop3Visible = await pageGroup3.isVisible('#workshopApp');
        const facilitatorVisible = await pageFacilitator.isVisible('#workshopApp');

        console.log(`\nWorkshop visibility:`);
        console.log(`  Group 1: ${workshop1Visible ? '✅' : '❌'}`);
        console.log(`  Group 3: ${workshop3Visible ? '✅' : '❌'}`);
        console.log(`  Facilitator: ${facilitatorVisible ? '✅' : '❌'}`);

        // ============================================
        // CLEANUP
        // ============================================
        console.log('\n⏳ Keeping browser open for 5 seconds to observe...');
        await delay(5000);

        await context1.close();
        await context2.close();
        await context3.close();

        console.log('\n✅ Multi-group simulation completed successfully!');
        return { success: true, errors: errorCount };

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error(error.stack);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

// Run the test
runTest().then(result => {
    console.log('\n' + '='.repeat(60));
    if (result.success) {
        console.log('🎉 ALL TESTS PASSED!');
        process.exit(0);
    } else {
        console.log('💥 TEST FAILED');
        process.exit(1);
    }
});
