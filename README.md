# Flash Local

![Coverage](https://codecov.io/gh/gofullthrottle/flash-local/branch/main/graph/badge.svg)

**Agentic Dev Tools**
![Claude Code Compatible](https://img.shields.io/badge/Claude%20Code-Compatible-8B5CF6?logo=anthropic&logoColor=white)

![GitHub stars](https://img.shields.io/github/stars/gofullthrottle/flash-local)
![GitHub forks](https://img.shields.io/github/forks/gofullthrottle/flash-local)
![GitHub issues](https://img.shields.io/github/issues/gofullthrottle/flash-local)
![Last commit](https://img.shields.io/github/last-commit/gofullthrottle/flash-local)



## About
An initiative to provide many companies with a Google Business Profile and a comprehensive local SEO
strategy to help them rank higher in local search results and attract more customers.

## E2E Testing

Playwright-based E2E integration tests with automatic screenshot capture for baseline validation and stakeholder reporting.

### Setup

```bash
# Install Playwright browsers (one-time)
npx playwright install
```

### Running Tests

```bash
# Run all E2E tests (desktop + mobile viewports)
npm run test:e2e

# Interactive UI mode (great for stakeholder walkthroughs)
npm run test:e2e:ui

# Update baseline snapshots
npm run test:e2e:screenshots
```

### Test Coverage

| Category | Pages | Description |
|----------|-------|-------------|
| **Public** | Landing, Login, Signup | Marketing pages and auth flows |
| **Onboarding** | `/start` wizard | Provider onboarding with plan pre-selection |
| **Microsite** | `/site/[slug]` | Provider public profile pages |
| **Booking** | Book + Success | Customer booking flow and confirmation |
| **Reviews** | `/review/[token]` | Customer review submission |
| **Dashboard** | 7 sub-pages | Provider management (bookings, orders, reviews, connect, site, settings, ads) |

### Screenshots

Screenshots are captured for every test in both desktop (1280x720) and mobile (390x844) viewports. They are saved to `e2e/screenshots/` and committed to the repo as stakeholder-ready artifacts.

### Structure

```
e2e/
├── playwright.config.ts       # Config (viewports, webServer, reporters)
├── screenshots/               # Captured screenshots (committed to git)
├── tests/
│   ├── public/                # Public page tests
│   │   ├── landing.spec.ts
│   │   ├── auth.spec.ts
│   │   ├── onboarding.spec.ts
│   │   ├── microsite.spec.ts
│   │   ├── booking.spec.ts
│   │   └── review.spec.ts
│   └── dashboard/             # Dashboard tests
│       ├── overview.spec.ts
│       └── pages.spec.ts
├── test-results/              # Runtime artifacts (gitignored)
└── playwright-report/         # HTML report (gitignored)
```
