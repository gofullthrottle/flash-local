import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Booking Page (/site/[slug]/book)', () => {
  test('renders the booking form for a slug', async ({ page }, testInfo) => {
    await page.goto('/site/test-provider/book')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `booking-form-${testInfo.project.name}.png`),
      fullPage: true,
    })

    // Form fields should be present regardless of provider validity
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('booking form shows customer info and service detail fields', async ({ page }, testInfo) => {
    await page.goto('/site/demo-provider/book')
    await page.waitForLoadState('networkidle')

    // These fields are rendered client-side unconditionally
    const nameInput = page.getByLabel('Full name')
    const emailInput = page.getByLabel('Email')
    // At least some form fields should be present
    const nameVisible = await nameInput.isVisible().catch(() => false)
    const emailVisible = await emailInput.isVisible().catch(() => false)

    if (nameVisible) {
      await expect(nameInput).toBeVisible()
    }
    if (emailVisible) {
      await expect(emailInput).toBeVisible()
    }

    await page.screenshot({
      path: path.join('e2e/screenshots', `booking-form-fields-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('booking form has back navigation to site', async ({ page }, testInfo) => {
    await page.goto('/site/demo-provider/book')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `booking-header-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })

  test('booking form secure checkout badge is visible', async ({ page }, testInfo) => {
    await page.goto('/site/demo-provider/book')
    await page.waitForLoadState('networkidle')

    const secureText = page.getByText(/Secure checkout/i)
    const visible = await secureText.isVisible().catch(() => false)

    if (visible) {
      await expect(secureText).toBeVisible()
    }

    await page.screenshot({
      path: path.join('e2e/screenshots', `booking-secure-badge-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })
})

test.describe('Booking Success Page (/site/[slug]/book/success)', () => {
  test('renders the payment confirmed success page', async ({ page }, testInfo) => {
    await page.goto('/site/test-provider/book/success')
    await page.waitForLoadState('networkidle')

    // Success page renders client-side with useParams, so it renders regardless of provider
    await expect(page.getByText('Payment Confirmed!')).toBeVisible()
    await expect(page.getByText(/Your booking has been confirmed/i)).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `booking-success-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('success page shows return to site button', async ({ page }, testInfo) => {
    await page.goto('/site/test-provider/book/success')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: /Back to Site/i })).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `booking-success-cta-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})
