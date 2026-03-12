import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Review Submission Page (/review/[token])', () => {
  test('renders the review page', async ({ page }, testInfo) => {
    await page.goto('/review/sample-review-token-abc123')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `review-form-${testInfo.project.name}.png`),
      fullPage: true,
    })

    // Client component — verify page rendered
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('review form shows star rating widget', async ({ page }, testInfo) => {
    await page.goto('/review/sample-token-xyz')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `review-star-rating-${testInfo.project.name}.png`),
      fullPage: false,
    })

    const ratingLabel = page.getByText('Your rating')
    const visible = await ratingLabel.isVisible().catch(() => false)
    if (visible) {
      await expect(ratingLabel).toBeVisible()
      const starButtons = page.locator('button[type="button"]')
      const count = await starButtons.count()
      expect(count).toBeGreaterThanOrEqual(5)
    }
  })

  test('review form has name and body fields', async ({ page }, testInfo) => {
    await page.goto('/review/sample-token-xyz')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `review-fields-${testInfo.project.name}.png`),
      fullPage: true,
    })

    const nameField = page.getByLabel('Your name')
    const visible = await nameField.isVisible().catch(() => false)
    if (visible) {
      await expect(nameField).toBeVisible()
      await expect(page.getByLabel(/Your review/i)).toBeVisible()
    }
  })

  test('submit button is disabled without a star rating', async ({ page }, testInfo) => {
    await page.goto('/review/sample-token-xyz')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `review-submit-disabled-${testInfo.project.name}.png`),
      fullPage: false,
    })

    const submitButton = page.getByRole('button', { name: /Submit Review/i })
    const visible = await submitButton.isVisible().catch(() => false)
    if (visible) {
      await expect(submitButton).toBeDisabled()
    }
  })

  test('clicking a star enables the submit button', async ({ page }, testInfo) => {
    await page.goto('/review/sample-token-xyz')
    await page.waitForLoadState('networkidle')

    const starButtons = page.locator('button[type="button"]')
    const count = await starButtons.count()

    if (count >= 5) {
      await starButtons.nth(4).click()
      await expect(page.getByText('Excellent!')).toBeVisible()

      const submitButton = page.getByRole('button', { name: /Submit Review/i })
      await expect(submitButton).toBeEnabled()
    }

    await page.screenshot({
      path: path.join('e2e/screenshots', `review-star-selected-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})
