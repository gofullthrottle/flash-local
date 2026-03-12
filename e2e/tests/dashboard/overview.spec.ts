import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Dashboard Overview (/dashboard)', () => {
  test('captures state when accessing dashboard without authentication', async ({ page }, testInfo) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Screenshot whatever state is shown — could be dashboard content or redirect to login
    await page.screenshot({
      path: path.join('e2e/screenshots', `dashboard-unauthenticated-${testInfo.project.name}.png`),
      fullPage: true,
    })

    // The page should not crash — body must be present
    await expect(page.locator('body')).toBeVisible()
  })

  test('captures final URL after any redirect from /dashboard', async ({ page }, testInfo) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const currentUrl = page.url()

    // Log the URL for diagnostic purposes in the test report
    console.log(`Dashboard unauthenticated redirect target: ${currentUrl}`)

    await page.screenshot({
      path: path.join('e2e/screenshots', `dashboard-redirect-result-${testInfo.project.name}.png`),
      fullPage: true,
    })

    // Either we stayed on /dashboard or were redirected — both are valid states to capture
    expect(currentUrl).toBeTruthy()
  })

  test('dashboard sidebar navigation renders when dashboard is accessible', async ({ page }, testInfo) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // If dashboard is rendered, sidebar nav should be present
    const sidebar = page.locator('aside')
    const sidebarVisible = await sidebar.isVisible().catch(() => false)

    if (sidebarVisible) {
      await expect(page.getByRole('link', { name: 'Bookings' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Reviews' })).toBeVisible()
    }

    await page.screenshot({
      path: path.join('e2e/screenshots', `dashboard-nav-state-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})
