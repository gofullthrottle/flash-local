import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Dashboard Overview (/dashboard)', () => {
  test('captures state when accessing dashboard without authentication', async ({ page }, testInfo) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `dashboard-unauthenticated-${testInfo.project.name}.png`),
      fullPage: true,
    })

    await expect(page.locator('body')).toBeVisible()
  })

  test('captures final URL after any redirect from /dashboard', async ({ page }, testInfo) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const currentUrl = page.url()
    console.log(`Dashboard unauthenticated redirect target: ${currentUrl}`)

    await page.screenshot({
      path: path.join('e2e/screenshots', `dashboard-redirect-result-${testInfo.project.name}.png`),
      fullPage: true,
    })

    expect(currentUrl).toBeTruthy()
  })

  test('captures dashboard layout state', async ({ page }, testInfo) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `dashboard-nav-state-${testInfo.project.name}.png`),
      fullPage: true,
    })

    await expect(page.locator('body')).toBeVisible()
  })
})
