# Automa CRM — WhatsApp CRM for Real Estate Builders

> Built by **Automa Studio** ([automastudio.in](https://automastudio.in)) — Shared inbox, contact management, sales pipelines, broadcast campaigns, no-code automations, and AI assistant on top of the official WhatsApp Cloud API.

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase)](https://supabase.com)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

---

## Features Out of the Box

- **Shared Inbox** — Official WhatsApp Business Cloud API integration. Multiple agents working one number, conversation assignment, custom tags, status management, internal notes, and media support.
- **Contacts & Pipelines** — Real estate lead tracking, custom fields, CSV import, deduplication, and visual Kanban deals pipeline.
- **Broadcasts** — Meta-approved template broadcasts, real-time delivery and read tracking, with per-recipient dynamic variable substitution.
- **No-Code Automations** — Flow triggers on inbound messages, new leads, keywords, or schedules with visual interactive flow builder.
- **AI Reply Assistant** — Bring your own OpenAI or Anthropic API key (encrypted at rest with AES-256-GCM). Instant AI-drafted replies in the inbox and optional automated reply bot with human handoff.
- **Knowledge Base** — Built-in FAQs, property brochures, and policy search using hybrid retrieval (Postgres full-text + semantic search via pgvector).
- **Team Collaboration** — Invite teammates via secure links, role-based access control (`owner`, `admin`, `agent`, `viewer`), and multi-agent coordination.
- **Public REST API (`/api/v1`)** — Scoped, revocable API keys for seamless integration with external websites, ERPs, and listing portals. See [docs/public-api.md](./docs/public-api.md).
- **MCP Server** — Drive your CRM from Claude, Cursor, and other AI tools via the [Model Context Protocol](https://modelcontextprotocol.io). See [docs/mcp.md](./docs/mcp.md).

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack) & [React 19](https://react.dev)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) & OKLCH color palettes
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL with Row Level Security, Realtime, Storage)
- **WhatsApp**: Meta WhatsApp Business Cloud API
- **Language**: TypeScript

---

## Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Vinay-Saw/automacrm.git
cd automacrm
npm install
```

### 2. Environment Configuration

Copy the example environment configuration:

```bash
cp .env.local.example .env.local
```

Fill in your configuration details:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: From your Supabase Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key (server-side only)
- `ENCRYPTION_KEY`: 64-character hex key (32 bytes AES-256-GCM) generated via:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `META_APP_SECRET`: Meta App Secret from Meta for Developers dashboard

### 3. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view your dashboard.

---

## Building for Production

```bash
npm run build
npm run start
```

---

## License

Distributed under the [MIT License](./LICENSE). Modified by Vinay Kumar.
