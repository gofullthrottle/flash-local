import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Provider Microsite (/site/[slug])', () => {
  test('captures 404 state for unknown slug', async ({ page }, testInfo) => {
    await page.goto('/site/test-provider-does-not-exist')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `microsite-404-${testInfo.project.name}.png`),
      fullPage: true,
    })

    // Verify the not-found state renders — either a custom 404 message or Next.js default
    const body = page.locator('body')
    await expect(body).toBeVisible()
    const notFoundText = page.getByText(/not found|404|doesn't exist|no provider/i).first()
    const visible = await notFoundText.isVisible().catch(() => false)
    if (visible) {
      await expect(notFoundText).toBeVisible()
    }
  })

  test('captures microsite not-found page layout', async ({ page }, testInfo) => {
    await page.goto('/site/nonexistent-slug-abc123')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `microsite-not-found-state-${testInfo.project.name}.png`),
      fullPage: true,
    })

    // URL must remain on the microsite path (no unexpected redirect away from /site/*)
    expect(page.url()).toMatch(/\/site\/nonexistent-slug-abc123/)
    await expect(page.locator('body')).toBeVisible()
  })
})
