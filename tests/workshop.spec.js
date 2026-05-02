const { test, expect } = require('@playwright/test');

test.describe('FAHLA 2026 Workshop Platform', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear session storage before each test
    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
  });

  test.describe('Entry Gate', () => {
    test('should display entry gate with title', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('FAHLA 2026');
      await expect(page.locator('.subtitle')).toContainText('FHIR Interoperability Workshop');
    });

    test('should show case selection cards', async ({ page }) => {
      await expect(page.locator('.case-card')).toHaveCount(2);
      await expect(page.locator('[data-case="case1"]')).toContainText('Unique Name Success');
      await expect(page.locator('[data-case="case2"]')).toContainText('Common Name Challenge');
    });

    test('should navigate to group selection after selecting case', async ({ page }) => {
      await page.click('[data-case="case1"]');
      await expect(page.locator('#groupSelection')).toBeVisible();
      await expect(page.locator('#groupSelection h2')).toContainText('Case 1: Select Your Group');
    });

    test('should show facilitator option', async ({ page }) => {
      await page.click('[data-case="case1"]');
      await expect(page.locator('#selectFacilitator')).toBeVisible();
    });
  });

  test.describe('Group Selection', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-case="case1"]');
    });

    test('should display all 5 groups', async ({ page }) => {
      const groups = await page.locator('.group-card').count();
      expect(groups).toBe(5);
    });

    test('should show correct task for Group 1 in Case 1', async ({ page }) => {
      const group1 = page.locator('[data-group="1"]');
      await expect(group1).toContainText('Group 1');
      await expect(group1).toContainText('Create');
      await expect(group1).toContainText('Rural Health Unit');
    });

    test('should show correct task for Group 3 in Case 1', async ({ page }) => {
      const group3 = page.locator('[data-group="3"]');
      await expect(group3).toContainText('Group 3');
      await expect(group3).toContainText('Search');
      await expect(group3).toContainText('Provincial Hospital');
    });

    test('should navigate to view selection after selecting group', async ({ page }) => {
      await page.click('[data-group="1"]');
      await expect(page.locator('#viewSelection')).toBeVisible();
    });

    test('should show summary in view selection', async ({ page }) => {
      await page.click('[data-group="1"]');
      await expect(page.locator('.summary-case')).toContainText('Case 1');
      await expect(page.locator('.summary-group')).toContainText('Group 1');
      await expect(page.locator('.summary-task')).toContainText('Create Patient');
    });
  });

  test.describe('View Selection', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-case="case1"]');
      await page.click('[data-group="1"]');
    });

    test('should show all three view modes', async ({ page }) => {
      await expect(page.locator('[data-mode="clinician"]')).toBeVisible();
      await expect(page.locator('[data-mode="developer"]')).toBeVisible();
      await expect(page.locator('[data-mode="facilitator"]')).toBeVisible();
    });

    test('should enable enter button after selecting view mode', async ({ page }) => {
      const enterBtn = page.locator('#enterWorkshop');
      await expect(enterBtn).toBeDisabled();
      
      await page.click('[data-mode="clinician"]');
      await expect(enterBtn).toBeEnabled();
    });
  });

  test.describe('Workshop App - Participant View', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-case="case1"]');
      await page.click('[data-group="1"]');
      await page.click('[data-mode="clinician"]');
      await page.click('#enterWorkshop');
    });

    test('should display workshop app after entering', async ({ page }) => {
      await expect(page.locator('#workshopApp')).toBeVisible();
      await expect(page.locator('.workshop-header')).toBeVisible();
    });

    test('should show correct group information in header', async ({ page }) => {
      await expect(page.locator('#groupName')).toContainText('Group 1');
      await expect(page.locator('#taskName')).toContainText('Create Patient');
    });

    test('should show clinician view by default', async ({ page }) => {
      await expect(page.locator('#clinicianView')).toHaveClass(/active/);
    });

    test('should display patient form in clinician view', async ({ page }) => {
      await expect(page.locator('#familyName')).toHaveValue('Dela Cruz');
      await expect(page.locator('#givenName')).toHaveValue('Rico');
    });

    test('should switch to developer view', async ({ page }) => {
      await page.click('[data-view="developer"]');
      await expect(page.locator('#developerView')).toHaveClass(/active/);
      await expect(page.locator('#clinicianView')).not.toHaveClass(/active/);
    });

    test('should show JSON editor in developer view', async ({ page }) => {
      await page.click('[data-view="developer"]');
      await expect(page.locator('#devBodyEditor')).toBeVisible();
    });

    test('should switch to architecture view', async ({ page }) => {
      await page.click('[data-view="architecture"]');
      await expect(page.locator('#architectureView')).toHaveClass(/active/);
      await expect(page.locator('#architectureSvg')).toBeVisible();
    });

    test('should display SVG swimlane diagram', async ({ page }) => {
      await page.click('[data-view="architecture"]');
      await expect(page.locator('.system-node')).toHaveCount(6); // 5 groups + SHR
    });

    test('should switch to facilitator view', async ({ page }) => {
      await page.click('[data-view="facilitator"]');
      await expect(page.locator('#facilitatorView')).toHaveClass(/active/);
    });
  });

  test.describe('Bidirectional Sync', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-case="case1"]');
      await page.click('[data-group="1"]');
      await page.click('[data-mode="clinician"]');
      await page.click('#enterWorkshop');
    });

    test('should sync form changes to developer JSON', async ({ page }) => {
      // Change family name in form
      await page.fill('#familyName', 'New Family Name');
      
      // Switch to developer view
      await page.click('[data-view="developer"]');
      
      // Check JSON editor contains new value
      const jsonContent = await page.locator('#devBodyEditor').inputValue();
      expect(jsonContent).toContain('New Family Name');
    });

    test('should show sync status indicator', async ({ page }) => {
      await expect(page.locator('.sync-status')).toBeVisible();
    });
  });

  test.describe('Facilitator Mode', () => {
    test('should allow entering as facilitator', async ({ page }) => {
      await page.click('[data-case="case1"]');
      await page.click('#selectFacilitator');
      
      await expect(page.locator('#workshopApp')).toBeVisible();
      await expect(page.locator('#groupName')).toContainText('Facilitator');
    });

    test('should show all groups in facilitator dashboard', async ({ page }) => {
      await page.click('[data-case="case1"]');
      await page.click('#selectFacilitator');
      
      const dashboardCards = await page.locator('.dashboard-card').count();
      expect(dashboardCards).toBe(5);
    });
  });

  test.describe('Mobile Responsive', () => {
    test('should show mobile navigation on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('[data-case="case1"]');
      await page.click('[data-group="1"]');
      await page.click('[data-mode="clinician"]');
      await page.click('#enterWorkshop');
      
      await expect(page.locator('.mobile-nav')).toBeVisible();
    });

    test('should switch views via mobile nav', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('[data-case="case1"]');
      await page.click('[data-group="1"]');
      await page.click('[data-mode="clinician"]');
      await page.click('#enterWorkshop');
      
      await page.click('.mobile-nav-btn[data-view="architecture"]');
      await expect(page.locator('#architectureView')).toHaveClass(/active/);
    });
  });

  test.describe('Case 2 - Common Name Challenge', () => {
    test('should show correct group assignments for Case 2', async ({ page }) => {
      await page.click('[data-case="case2"]');
      
      // Group 1 should be SEARCH in Case 2 (swapped)
      const group1 = page.locator('[data-group="1"]');
      await expect(group1).toContainText('Search');
      
      // Group 3 should be CREATE in Case 2
      const group3 = page.locator('[data-group="3"]');
      await expect(group3).toContainText('Create');
    });

    test('should show Jose Dimasalang for Case 2', async ({ page }) => {
      await page.click('[data-case="case2"]');
      
      const group1 = page.locator('[data-group="1"]');
      await expect(group1).toContainText('Jose Dimasalang');
    });
  });
});
