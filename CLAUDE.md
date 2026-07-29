# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live Correctly — a Next.js 16 marketing and intake site for a Human Design consulting service. Built with React 19, TypeScript, and Tailwind CSS 4. Originally generated with v0.app.

## Commands

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # ESLint
```

No test framework is configured yet.

## Architecture

**Framework**: Next.js 16 App Router with React Server Components enabled.

**Routing** (file-based in `app/`):
- `/` — marketing homepage (hero, benefits, about, CTA)
- `/see-your-design` — birth chart intake form; server action inserts into Neon PostgreSQL

**Database**:
- Neon PostgreSQL via `@neondatabase/serverless` (HTTP-over-WebSocket driver)
- Connection: `lib/db.ts` exports a tagged-template `sql` function using `DATABASE_URL` env var
- Single table `subscribers` — see `db/001-create-subscribers.sql` for schema:
  - `id` (UUID PK), `email` (unique), `first_name`, `last_name`, `birth_date`, `birth_time`, `time_unknown`, `birth_place`, `chart` (JSONB), `created_at`
- No ORM — raw SQL via Neon's tagged-template driver
- `db/import-supabase.mjs` — one-time migration script that imported users + charts from Supabase CSV exports

**Component patterns**:
- Server Components by default; `"use client"` directive only where needed (form interactivity)
- Form handling uses React 19's `useActionState` and `useFormStatus`
- Server actions in colocated `actions.ts` files
- `Wrap` component provides consistent max-width container layout

**UI system**:
- shadcn/ui (base-nova style) configured via `components.json`
- Button built on `@base-ui/react` primitives with `class-variance-authority` for variants
- `cn()` utility in `lib/utils.ts` merges classes via `clsx` + `tailwind-merge`
- Lucide React for icons

**Styling**:
- Tailwind CSS 4.3.3 with `@tailwindcss/postcss`
- Brand tokens defined as CSS custom properties in `app/globals.css` (ink, grape, marigold, paper, etc.)
- Custom animations: `breathe` (aura bg), `rise` (staggered reveal) — respects `prefers-reduced-motion`

**Fonts** (Google Fonts, loaded in `app/layout.tsx`):
- Display: Bricolage Grotesque
- Body: Hanken Grotesk
- Serif: Newsreader

**Path aliases**: `@/*` maps to project root (configured in `tsconfig.json`).

**Auth**: None configured yet. No middleware.ts, no next-auth or similar packages installed.

## Known TODOs in Codebase

- `next.config.mjs`: TypeScript build errors are ignored (`ignoreBuildErrors: true`) and image optimization is disabled (`unoptimized: true`)

## Deployment

Vercel. Analytics via `@vercel/analytics` (production only, conditionally rendered in layout).
