import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Onboarding Wizard (/start)', () => {
  test('renders the wizard with step 1 (Choose Plan)', async ({ page }, testInfo) => {
    await page.goto('/start')
    await page.waitForLoadState('networkidle')

    // Progress indicator should be visible
    await expect(page.getByText(/Step 1 of 7/i)).toBeVisible()
    await expect(page.getByText('Choose Plan')).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `onboarding-step1-plan-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('pre-selects partner plan when ?plan=rev_share is provided', async ({ page }, testInfo) => {
    await page.goto('/start?plan=rev_share')
    await page.waitForLoadState('networkidle')

    // With plan pre-selected, wizard skips to step 2 (service)
    await expect(page.getByText(/Step 2 of 7/i)).toBeVisible()
    await expect(page.getByText('Service Type')).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `onboarding-step2-service-preselected-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('pre-selects upfront plan when ?plan=upfront is provided', async ({ page }, testInfo) => {
    await page.goto('/start?plan=upfront')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/Step 2 of 7/i)).toBeVisible()
    await expect(page.getByText('Service Type')).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `onboarding-step2-service-upfront-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('progress bar is visible on wizard', async ({ page }, testInfo) => {
    await page.goto('/start')
    await page.waitForLoadState('networkidle')

    // Progress component should be rendered
    const progressBar = page.locator('[role="progressbar"]')
    await expect(progressBar).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `onboarding-progress-bar-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })

  test('start page layout renders correctly', async ({ page }, testInfo) => {
    await page.goto('/start')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `onboarding-full-layout-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})
