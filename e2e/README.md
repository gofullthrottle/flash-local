# E2E Tests — FlashLocal

Playwright tests for visual baseline capture and flow validation across all FlashLocal pages.

## Setup

Install browsers (one-time):

```bash
npx playwright install
```

## Running Tests

```bash
# Run all E2E tests (starts Next.js dev server automatically)
npm run test:e2e

# Open the interactive Playwright UI
npm run test:e2e:ui

# Run and update snapshots
npm run test:e2e:screenshots
```

Run tests for a single project (desktop or mobile):

```bash
npx playwright test --config=e2e/playwright.config.ts --project=desktop
npx playwright test --config=e2e/playwright.config.ts --project=mobile
```

Run a specific test file:

```bash
npx playwright test --config=e2e/playwright.config.ts e2e/tests/public/landing.spec.ts
```

## Structure

```
e2e/
├── playwright.config.ts       # Config — baseURL, projects, webServer
├── screenshots/               # Captured screenshots (committed, stakeholder artifacts)
│   └── *.png
├── test-results/              # Raw test artifacts (gitignored)
├── playwright-report/         # HTML report (gitignored)
└── tests/
    ├── public/
    │   ├── landing.spec.ts    # Landing page — hero, pricing, FAQ
    │   ├── auth.spec.ts       # Login and signup pages
    │   ├── onboarding.spec.ts # /start wizard steps
    │   ├── microsite.spec.ts  # /site/[slug] provider pages
    │   ├── booking.spec.ts    # /site/[slug]/book + /book/success
    │   └── review.spec.ts     # /review/[token] submission
    └── dashboard/
        ├── overview.spec.ts   # /dashboard — auth redirect behavior
        └── pages.spec.ts      # All /dashboard/* sub-pages
```

## Screenshots

Named screenshots are written to `e2e/screenshots/` and committed to the repo. They serve as:

- Visual baselines for regression detection
- Stakeholder demos of rendered pages
- Pre-launch sign-off artifacts

Screenshot naming: `<page-description>-<project-name>.png`
Example: `landing-full-desktop.png`, `booking-form-mobile.png`

## Notes

- Tests are designed to pass without a running Supabase or Stripe backend. Pages render their client-side shells, loading states, or Next.js 404 pages in the absence of data.
- Dashboard pages may redirect to `/login` — this is expected and the redirect state is captured in screenshots.
- The `webServer` config starts `next dev` automatically. If port 3000 is already in use, Playwright reuses it (`reuseExistingServer: true` in non-CI environments).
