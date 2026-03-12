import { test } from '@playwright/test'
import path from 'path'

test.describe('Provider Microsite (/site/[slug])', () => {
  test('captures 404 state for unknown slug', async ({ page }, testInfo) => {
    await page.goto('/site/test-provider-does-not-exist')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `microsite-404-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('captures microsite not-found page layout', async ({ page }, testInfo) => {
    await page.goto('/site/nonexistent-slug-abc123')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `microsite-not-found-state-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})
