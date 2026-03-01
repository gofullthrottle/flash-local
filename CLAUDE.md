# Flash Local

## ClickUp Integration

@.clickup_state.json

## Project Overview

Flash Local (FlashLocal) is a platform that turns seasonal service providers ("hustlers") into searchable, bookable, payable local businesses — fast. It provides instant microsite generation, guided Google Business Profile setup, Stripe-powered payments, booking, reviews collection, and optional automated ad management.

The platform serves two audiences:
1. **Seasonal providers** — holiday lights, tree delivery, NYE cleanup, snow shoveling, etc. — who need a professional web presence and payment flow in minutes
2. **End customers** — homeowners and small businesses who want to find, book, and pay local service providers

**Two commercial models:**
- **Upfront plan** — provider pays a setup fee; keeps direct control of payments
- **Rev-share (Partner) plan** — $0 upfront; all customer payments flow through platform Stripe Connect; operator takes a percentage

- **License**: Proprietary — do not add open-source license headers or redistribute code
- **GitHub**: `gofullthrottle/flash-local`
- **Project Tier**: Standard (defined in `.claude/project-tier.json`)

## Repository Structure

```
flash-local/
├── CLAUDE.md                    # AI assistant instructions (this file)
├── README.md                    # Project overview and badges
├── CONTRIBUTING.md              # Contribution guidelines
├── LICENSE                      # Proprietary license
├── .clickup_state.json          # ClickUp workspace state
├── .claude/                     # Claude Code configuration
│   ├── git-workflow.json        #   Auto-PR settings
│   └── project-tier.json        #   Project tier (standard)
├── .github/
│   └── workflows/
│       └── ci-cd.yml            # CI/CD pipeline (GitHub Actions)
├── .pre-commit-config.yaml      # Pre-commit hook definitions
├── sonar-project.properties     # Root SonarQube config
├── .sonarqube/
│   ├── sonar-dev.properties     # SonarQube config for dev branch
│   └── sonar-prod.properties    # SonarQube config for master branch
├── docs/
│   ├── README.md                # Fumadocs documentation setup
│   └── architecture/
│       └── README.md            # ADR template and index
├── schemas/                     # JSON schemas (onboarding wizard, vertical packs)
├── supabase/
│   └── migrations/              # Supabase/Postgres migrations (RLS, enums, tables)
└── app/                         # Next.js App Router (API routes, pages)
    └── api/
        ├── stripe/webhook/      # Stripe webhook handler
        └── checkout/create/     # Checkout session creation
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Hosting**: Cloudflare Pages
- **Edge**: Cloudflare Workers (routing, A/B tests, bot protection)
- **Database/Auth**: Supabase (Postgres + Auth + Storage + RLS)
- **Payments**: Stripe (Checkout, Billing, Connect Express)
- **Documentation**: Fumadocs
- **Code Quality**: SonarQube (self-hosted), pre-commit hooks
- **CI/CD**: GitHub Actions (self-hosted runners)
- **DNS/CDN**: Cloudflare (wildcard subdomains, WAF, caching)

## Git Workflow

- **Default branch**: `master`
- **Development branch**: `dev`
- **Feature branches**: `feature/<name>` — all changes go through feature branches
- **Never commit directly to `master` or `dev`**
- Auto-PR is enabled on feature commits (`.claude/git-workflow.json`)

### Branching Model

1. Create a feature branch from `dev`
2. Make changes and commit using conventional commits
3. Push and open a PR to `dev`
4. After review and CI passes, merge to `dev`
5. Promote from `dev` to `master` via PR (triggers promotion quality gate)

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — code restructuring (no behavior change)
- `test:` — adding or updating tests
- `chore:` — maintenance tasks (deps, config, CI)

Examples:
```
feat: add provider onboarding wizard
fix: correct deposit calculation for rev-share plan
docs: update Stripe webhook state machine spec
chore: upgrade pre-commit hooks to v4.5.0
```

## Pre-commit Hooks

Defined in `.pre-commit-config.yaml` (v4.5.0). These run automatically on every commit:

| Hook                       | Purpose                                |
|----------------------------|----------------------------------------|
| `trailing-whitespace`      | Remove trailing whitespace             |
| `end-of-file-fixer`       | Ensure files end with a newline        |
| `check-yaml`              | Validate YAML syntax                   |
| `check-json`              | Validate JSON syntax                   |
| `check-added-large-files` | Block files larger than 1 MB           |
| `detect-private-key`      | Prevent accidental private key commits |

Install hooks locally: `pre-commit install`

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci-cd.yml`) runs on self-hosted runners.

**Triggers**: Push or PR to `master`, `dev`

### Pipeline Stages

1. **Quality Circuit** — Lint, type-check, unit tests, build (language-specific steps to be configured)
2. **SonarQube Analysis** — Static analysis using environment-specific config:
   - `master` → `.sonarqube/sonar-prod.properties`
   - `dev` / other → `.sonarqube/sonar-dev.properties`
3. **E2E Tests** — Run only on `dev` branch (Playwright, to be configured)
4. **Promotion Quality Gate** — Runs on PRs targeting `master`; verifies all gates passed

### SonarQube

- Self-hosted instance (URL via `SONAR_HOST_URL` secret)
- Auth via `SONAR_TOKEN` secret
- Quality gate wait is enabled (`sonar.qualitygate.wait=true`)

## Key Architecture Decisions

### Multi-tenant Model

Each provider gets a subdomain (`<slug>.flashlocal.com`) or optional custom domain. Tenant routing is handled at the Cloudflare Workers edge layer. Core entities:

- **Provider** — identity, status, plan type, vertical, slug
- **Site** — microsite settings, theme, publish state
- **ServicePackage** — pricing tiers, add-ons
- **Booking** — customer requests, scheduling
- **Order** — Stripe-backed payment records
- **GBPProfile** — Google Business Profile wizard state tracking

### Stripe Integration

- **Checkout Sessions** for setup fees and customer bookings
- **Connect Express** for rev-share payouts (destination charges with `application_fee_amount`)
- **Webhook handler** at `app/api/stripe/webhook/route.ts` — idempotent via `stripe_events` table
- All Checkout Sessions / PaymentIntents MUST include metadata: `provider_id`, `booking_id`, `plan_type`, `order_kind`, `environment`
- Server-side checkout creation at `app/api/checkout/create/` ensures metadata consistency
- See `docs/stripe_state_machine.md` for the full state machine spec

### Database (Supabase)

- RLS enforced on all tables
- Admin check via `public.is_admin()` function
- Anonymous users can: view published profiles/packages, submit leads/bookings for active providers
- Providers can only access their own data
- Stripe webhook mutations use service role (bypasses RLS)
- Migration at `supabase/migrations/0001_flashlocal.sql`

### Google Business Profile

- GBP wizard is API-assisted where allowed but does NOT guarantee instant Maps visibility
- Verification methods are determined by Google (may require video)
- Service-area updates can take ~48 hours
- Never create fake businesses, fake addresses, or keyword-stuff business names
- A compliance linter agent flags suspicious patterns

## Documentation

- Uses [Fumadocs](https://fumadocs.vercel.app/) for documentation site (see `docs/README.md`)
- Architecture decisions tracked as ADRs in `docs/architecture/`
- Stripe state machine documented in `docs/stripe_state_machine.md`
- Onboarding wizard schema in `schemas/flashlocal_onboarding.schema.json`

## AI Assistant Guidelines

- Read files before modifying them — understand context first
- Respect the proprietary license: do not add open-source headers
- Always use feature branches; never push directly to `master` or `dev`
- Follow conventional commit format strictly
- Ensure pre-commit hooks pass before finalizing commits
- Do not commit secrets, credentials, private keys, or `.env` files
- Keep PRs focused — one logical change per PR
- When creating Stripe integrations, always attach required metadata server-side
- RLS policies must be maintained — never disable RLS on any table
- Provider slugs are immutable after publish (SEO + link integrity)
- All order mutations from webhooks must go through service role, not client RLS
- Test webhook idempotency: duplicate delivery must not create duplicate effects
