# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.3.0](https://github.com/gofullthrottle/flash-local/compare/v0.2.1...v0.3.0) (2026-04-20)


### Features

* **auth:** cookie-based SSR auth with @supabase/ssr ([#8](https://github.com/gofullthrottle/flash-local/issues/8))
* **dashboard:** replace demo data with real Supabase queries ([#8](https://github.com/gofullthrottle/flash-local/issues/8))
* **email:** add Resend integration for transactional emails ([#8](https://github.com/gofullthrottle/flash-local/issues/8))
* **payments:** wire Stripe Connect from DB and auth context ([#8](https://github.com/gofullthrottle/flash-local/issues/8))
* **sales-rep:** mobile sales rep system — field tools, commissions, plan tiers, claim flow, Places scan, payouts, territories ([#7](https://github.com/gofullthrottle/flash-local/issues/7))


### Maintenance

* **deploy:** add Vercel config, update env template, polish UI ([#8](https://github.com/gofullthrottle/flash-local/issues/8))


### [0.2.1](https://github.com/gofullthrottle/flash-local/compare/v0.2.0...v0.2.1) (2026-03-12)


### Maintenance

* promote dev to master ([1157d90](https://github.com/gofullthrottle/flash-local/commit/1157d909b47b5fbe388ea2876a257d13eb9a2fa0)), closes [#5](https://github.com/gofullthrottle/flash-local/issues/5) [#2](https://github.com/gofullthrottle/flash-local/issues/2)


## [v0.2.0] - 2026-03-11


### Features

* Initial FlashLocal platform implementation with onboarding & payments — provider onboarding wizard (7 steps), Stripe Checkout/Connect integration, booking flow, review submission, microsite generation, and provider dashboard ([#1](https://github.com/gofullthrottle/flash-local/issues/1))


### Tests

* Add Playwright E2E baseline screenshot suite — 82 tests across 8 spec files covering landing, auth, onboarding, booking, review, microsite, and dashboard flows on desktop and mobile viewports ([#2](https://github.com/gofullthrottle/flash-local/issues/2))


### Documentation

* Add documentation structure, CI/CD, and SonarQube configs
* Add E2E testing guide to README.md, CLAUDE.md, and e2e/README.md


### Chores

* Initial project setup
* Add ClickUp integration
