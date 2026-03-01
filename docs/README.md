# Documentation

This project uses [Fumadocs](https://fumadocs.vercel.app/) for documentation.

## Quick Start

### Option 1: Add to Existing Next.js Project

```bash
npm install fumadocs-ui fumadocs-core fumadocs-mdx
npm install @mdx-js/loader @mdx-js/react
mkdir -p content/docs
```

### Option 2: Create Standalone Docs Site

```bash
npx create-fumadocs-app docs-site
```

## Directory Structure

```
docs/
├── README.md           # This file
├── content/            # MDX content (if using Fumadocs in this repo)
│   └── docs/
│       ├── index.mdx   # Docs homepage
│       └── ...
└── architecture/       # Architecture Decision Records (ADRs)
    └── README.md
```

## Resources

- [Fumadocs Documentation](https://fumadocs.vercel.app/)
- [Fumadocs GitHub](https://github.com/fuma-nama/fumadocs)
- [MDX Documentation](https://mdxjs.com/)
