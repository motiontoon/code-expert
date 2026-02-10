# Codex Forge - AI-Powered Coding Automation Platform

## Project Overview
Full-stack TypeScript application for autonomous AI coding automation with GitHub integration and File Guard protection.

## Tech Stack
- **Backend**: Express.js + TypeScript, Prisma ORM, Socket.IO
- **Frontend**: React 18 + TypeScript, Tailwind CSS, Vite
- **Database**: SQLite (Prisma)
- **Auth**: JWT + GitHub OAuth2
- **AI**: Anthropic Claude API

## Commands
- `npm run dev` - Start both server and client in dev mode
- `npm run dev:server` - Start server only
- `npm run dev:client` - Start Vite client only
- `npm run build` - Build for production
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed demo data
- `npm test` - Run tests

## Architecture
- `src/server/` - Express backend
  - `routes/` - API endpoints (auth, tasks, projects, github, file-guard)
  - `services/` - Business logic (codingEngine, fileGuard, githubService)
  - `middleware/` - Auth, validation, error handling
- `src/client/` - React frontend
  - `pages/` - Route pages
  - `components/` - Reusable components
  - `services/api.ts` - API client
  - `hooks/` - React hooks

## File Guard Rule
**Every file must be read before it can be written.** The FileGuardService enforces this in strict mode, logging all operations in the audit trail.
