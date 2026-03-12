import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Landing Page', () => {
  test('renders the full landing page', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `landing-full-${testInfo.project.name}.png`),
      fullPage: true,
    })

    // Verify the page loaded (server-rendered content)
    await expect(page.getByText('FlashLocal').first()).toBeVisible()
  })

  test('hero section displays CTAs and social proof', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `landing-hero-${testInfo.project.name}.png`),
      fullPage: false,
    })

    await expect(page.getByRole('link', { name: /Launch My Business/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible()
    await expect(page.getByText('120+')).toBeVisible()
  })

  test('pricing section renders both plans', async ({ page }, testInfo) => {
    await page.goto('/#pricing')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `landing-pricing-${testInfo.project.name}.png`),
      fullPage: true,
    })

    await expect(page.getByText('Two ways to launch')).toBeVisible()
    await expect(page.getByText('Launch Plan')).toBeVisible()
    await expect(page.getByText('Partner Plan', { exact: true })).toBeVisible()
    await expect(page.getByText('$99').first()).toBeVisible()
  })

  test('navigation links are present', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `landing-nav-${testInfo.project.name}.png`),
      fullPage: false,
    })

    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()
  })

  test('service verticals strip is rendered', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `landing-verticals-${testInfo.project.name}.png`),
      fullPage: false,
    })

    await expect(page.getByText('Holiday Lights')).toBeVisible()
    await expect(page.getByText('Snow Shoveling')).toBeVisible()
  })
})
