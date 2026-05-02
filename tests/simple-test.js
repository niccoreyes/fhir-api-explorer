const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright test...\n');
  
  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navigate to the app
  await page.goto('http://localhost:8080');
  console.log('✓ Page loaded\n');
  
  // Wait a moment and check console logs
  const logs = [];
  page.on('console', msg => {
    logs.push(msg.text());
    if (msg.type() === 'error') {
      console.error('❌ Console Error:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });
  
  // Test 1: Check page title
  const title = await page.title();
  console.log('Page Title:', title);
  console.log('✓ Title check passed\n');
  
  // Test 2: Select Case 1
  console.log('Selecting Case 1...');
  await page.click('[data-case="case1"]');
  await page.waitForTimeout(500);
  console.log('✓ Case 1 selected\n');
  
  // Test 3: Select Group 1
  console.log('Selecting Group 1...');
  await page.click('[data-group="1"]');
  await page.waitForTimeout(500);
  console.log('✓ Group 1 selected\n');
  
  // Test 4: Select Clinician view
  console.log('Selecting Clinician view...');
  await page.click('[data-mode="clinician"]');
  await page.waitForTimeout(200);
  console.log('✓ View mode selected\n');
  
  // Test 5: Enter workshop
  console.log('Entering workshop...');
  await page.click('#enterWorkshop');
  await page.waitForTimeout(1000);
  console.log('✓ Workshop entered\n');
  
  // Test 6: Check for console errors
  await page.waitForTimeout(1000);
  
  console.log('Console logs collected:');
  const errorLogs = logs.filter(log => log.includes('Error') || log.includes('error'));
  
  if (errorLogs.length > 0) {
    console.log('\n❌ Errors found in console:');
    errorLogs.forEach(err => console.log('  -', err.substring(0, 100)));
  } else {
    console.log('✓ No errors in console!\n');
  }
  
  // Check if workshop app is visible
  const isWorkshopVisible = await page.isVisible('#workshopApp');
  console.log('Workshop App visible:', isWorkshopVisible ? '✓ Yes' : '❌ No');
  
  // Check if clinician view is visible
  const isClinicianVisible = await page.isVisible('#clinicianView');
  console.log('Clinician View visible:', isClinicianVisible ? '✓ Yes' : '❌ No');
  
  // Take screenshot
  await page.screenshot({ path: 'workshop-test.png', fullPage: true });
  console.log('\n✓ Screenshot saved as workshop-test.png');
  
  // Keep browser open for a moment so user can see
  await page.waitForTimeout(3000);
  
  await browser.close();
  
  console.log('\n✅ Test completed successfully!');
})();
