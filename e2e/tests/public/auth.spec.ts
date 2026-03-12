import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Login Page', () => {
  test('renders the login form', async ({ page }, testInfo) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `login-page-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('shows FlashLocal branding on login page', async ({ page }, testInfo) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Brand link at top of card
    await expect(page.getByRole('link', { name: /FlashLocal/i })).toBeVisible()
    await expect(page.getByText("Sign in to your provider dashboard")).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `login-branding-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })

  test('shows link to signup from login page', async ({ page }, testInfo) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `login-signup-link-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})

test.describe('Signup Page', () => {
  test('renders the signup form', async ({ page }, testInfo) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByLabel('Confirm password')).toBeVisible()
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `signup-page-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })

  test('shows "no credit card needed" messaging for Partner plan', async ({ page }, testInfo) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/No credit card needed for the Partner plan/i)).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `signup-value-prop-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })

  test('shows link to login from signup page', async ({ page }, testInfo) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()

    await page.screenshot({
      path: path.join('e2e/screenshots', `signup-login-link-${testInfo.project.name}.png`),
      fullPage: true,
    })
  })
})
