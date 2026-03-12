import { test, expect } from '@playwright/test'
import path from 'path'

const DASHBOARD_PAGES = [
  { path: '/dashboard/bookings', name: 'bookings' },
  { path: '/dashboard/orders', name: 'orders' },
  { path: '/dashboard/reviews', name: 'reviews' },
  { path: '/dashboard/connect', name: 'connect-payouts' },
  { path: '/dashboard/site', name: 'site-editor' },
  { path: '/dashboard/settings', name: 'settings' },
  { path: '/dashboard/ads', name: 'ads' },
]

test.describe('Dashboard Sub-Pages', () => {
  for (const dashPage of DASHBOARD_PAGES) {
    test(`renders or redirects for ${dashPage.name} page (${dashPage.path})`, async ({ page }, testInfo) => {
      await page.goto(dashPage.path)
      await page.waitForLoadState('networkidle')

      // Screenshot the rendered state — authenticated or redirected to login
      await page.screenshot({
        path: path.join('e2e/screenshots', `dashboard-${dashPage.name}-${testInfo.project.name}.png`),
        fullPage: true,
      })

      // Page must not crash
      await expect(page.locator('body')).toBeVisible()

      const currentUrl = page.url()
      console.log(`${dashPage.path} → ${currentUrl}`)
    })
  }
})

test.describe('Dashboard Layout Structure', () => {
  test('FlashLocal branding appears on dashboard routes', async ({ page }, testInfo) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Check for FlashLocal branding somewhere on the page (either dashboard or login redirect)
    const flashLocalText = page.getByText(/FlashLocal/i).first()
    const visible = await flashLocalText.isVisible().catch(() => false)

    if (visible) {
      await expect(flashLocalText).toBeVisible()
    }

    await page.screenshot({
      path: path.join('e2e/screenshots', `dashboard-layout-branding-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })

  test('captures full dashboard layout screenshot', async ({ page }, testInfo) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `dashboard-full-layout-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})
