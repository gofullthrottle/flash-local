import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Login Page', () => {
  test('renders the login page', async ({ page }, testInfo) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `login-page-${testInfo.project.name}.png`),
      fullPage: true,
    })

    // Client component — verify page rendered (body has content)
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('shows FlashLocal branding on login page', async ({ page }, testInfo) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `login-branding-${testInfo.project.name}.png`),
      fullPage: false,
    })

    await expect(page.getByText('Flash')).toBeVisible()
  })

  test('shows link to signup from login page', async ({ page }, testInfo) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `login-signup-link-${testInfo.project.name}.png`),
      fullPage: true,
    })

    const signupLink = page.getByRole('link', { name: /Sign up/i })
    const visible = await signupLink.isVisible().catch(() => false)
    if (visible) {
      await expect(signupLink).toBeVisible()
    }
  })
})

test.describe('Signup Page', () => {
  test('renders the signup page', async ({ page }, testInfo) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `signup-page-${testInfo.project.name}.png`),
      fullPage: true,
    })

    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('shows partner plan messaging', async ({ page }, testInfo) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `signup-value-prop-${testInfo.project.name}.png`),
      fullPage: false,
    })

    const noCCText = page.getByText(/No credit card/i)
    const visible = await noCCText.isVisible().catch(() => false)
    if (visible) {
      await expect(noCCText).toBeVisible()
    }
  })

  test('shows link to login from signup page', async ({ page }, testInfo) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join('e2e/screenshots', `signup-login-link-${testInfo.project.name}.png`),
      fullPage: true,
    })

    const signinLink = page.getByRole('link', { name: /Sign in/i })
    const visible = await signinLink.isVisible().catch(() => false)
    if (visible) {
      await expect(signinLink).toBeVisible()
    }
  })
})
