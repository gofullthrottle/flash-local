import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Landing Page', () => {
  test('renders the full landing page with hero, pricing, and FAQ', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify key content is present
    await expect(page.getByRole('heading', { name: /Turn your holiday hustle/i })).toBeVisible()
    await expect(page.getByText('Flash')).toBeVisible()

    // Full-page screenshot for stakeholder review
    await page.screenshot({
      path: path.join('e2e/screenshots', `landing-full-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('hero section displays CTAs and social proof', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: /Launch My Business/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible()
    await expect(page.getByText('120+')).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `landing-hero-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })

  test('pricing section renders both plans', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: /Pricing/i }).click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /Two ways to launch/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Launch Plan' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Partner Plan' })).toBeVisible()
    await expect(page.getByText('$99')).toBeVisible()
    await expect(page.getByText('$0').first()).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `landing-pricing-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('navigation links are present', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `landing-nav-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })

  test('service verticals strip is rendered', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Holiday Lights')).toBeVisible()
    await expect(page.getByText('Snow Shoveling')).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `landing-verticals-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })
})
