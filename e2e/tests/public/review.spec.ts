import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Review Submission Page (/review/[token])', () => {
  test('renders the review form for any token', async ({ page }, testInfo) => {
    await page.goto('/review/sample-review-token-abc123')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /How was your experience/i })).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `review-form-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('review form shows star rating widget', async ({ page }, testInfo) => {
    await page.goto('/review/sample-token-xyz')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Your rating')).toBeVisible()

    // Five star buttons should be present
    const starButtons = page.locator('button[type="button"]')
    const count = await starButtons.count()
    expect(count).toBeGreaterThanOrEqual(5)

    await page.screenshot({
      path: path.join('e2e/screenshots', `review-star-rating-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })

  test('review form has name and body fields', async ({ page }, testInfo) => {
    await page.goto('/review/sample-token-xyz')
    await page.waitForLoadState('networkidle')

    await expect(page.getByLabel('Your name')).toBeVisible()
    await expect(page.getByLabel(/Your review/i)).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `review-fields-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('submit button is disabled without a star rating', async ({ page }, testInfo) => {
    await page.goto('/review/sample-token-xyz')
    await page.waitForLoadState('networkidle')

    const submitButton = page.getByRole('button', { name: /Submit Review/i })
    await expect(submitButton).toBeDisabled()

    await page.screenshot({
      path: path.join('e2e/screenshots', `review-submit-disabled-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })

  test('clicking a star enables the submit button', async ({ page }, testInfo) => {
    await page.goto('/review/sample-token-xyz')
    await page.waitForLoadState('networkidle')

    // Click the 5th star button
    const starButtons = page.locator('button[type="button"]')
    await starButtons.nth(4).click()

    // Rating label should update
    await expect(page.getByText('Excellent!')).toBeVisible()

    const submitButton = page.getByRole('button', { name: /Submit Review/i })
    await expect(submitButton).toBeEnabled()

    await page.screenshot({
      path: path.join('e2e/screenshots', `review-star-selected-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})
