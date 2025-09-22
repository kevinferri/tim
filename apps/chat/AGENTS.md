# AGENTS.md

This file provides guidance for AI agents working with this codebase.

## Project Overview

This is a Next.js 14 application using React Server Components with the following stack:
- **Framework**: Next.js 14.2.28 (App Router)
- **Language**: TypeScript (strict mode enabled)
- **Database**: PostgreSQL via Prisma ORM
- **Styling**: TailwindCSS with shadcn/ui components
- **Authentication**: NextAuth.js
- **Real-time**: Socket.io (client and server)
- **State Management**: Zustand
- **Media Upload**: Cloudinary

## Project Structure

```
src/
├── actions/          # Server actions (circles, media, topics, user-status)
├── app/             # Next.js App Router pages (circles, signin, api routes)
├── components/      # React components
│   ├── auth/        # Authentication components
│   ├── circles/     # Circle-related components
│   ├── dashboard/   # Dashboard components
│   ├── socket/      # Socket.io components
│   ├── topics/      # Topic/message components
│   └── ui/          # shadcn/ui components
├── lib/             # Utilities and libraries
│   ├── hooks/       # Custom React hooks
│   ├── prisma/      # Prisma client
│   └── *.ts         # Utility functions
├── globals.css      # Global styles
├── middleware.ts    # Next.js middleware
└── routes.ts        # Route definitions

prisma/
└── schema.prisma    # Database schema

types/              # TypeScript type definitions
```

## Common Commands

### Development
```bash
npm run dev         # Start development server (http://localhost:3000)
```

### Database (Prisma)
```bash
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:genpush   # Generate client and push schema (combined)
npm run db:migrate   # Create and run migrations
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database
```

### Build & Deployment
```bash
npm run build            # Build for production
npm run production:build # Production build with Prisma setup
npm run start            # Start production server
```

### Code Quality
```bash
npm run lint        # Run ESLint (next lint)
```

## Code Conventions

### TypeScript
- **Strict mode enabled** - all TypeScript strict checks are on
- **Path aliases**: Use `@/*` to import from `src/*` (e.g., `@/components/ui/button`)
- **Target**: ES2017
- Never use `any` or suppress type errors unless absolutely necessary

### React/Next.js Patterns
- **Client Components**: Mark with `"use client"` directive at top of file
- **Server Actions**: Located in `src/actions/` directory
- **Server Components**: Default - no directive needed
- **Styling**: Use `cn()` utility from `@/lib/utils` to merge Tailwind classes

### Component Organization
- **UI Components**: Located in `src/components/ui/` (shadcn/ui)
- **Feature Components**: Organized by domain (auth, circles, topics, etc.)
- **File naming**: kebab-case for files (e.g., `topic-message-bar.tsx`)
- **Component naming**: PascalCase matching the primary export

### Styling
- **TailwindCSS**: Primary styling method
- **Class merging**: Use `cn()` helper from `@/lib/utils.ts`
- **Global styles**: In `src/globals.css`
- **Theme support**: next-themes for dark/light mode
- **Icons**: Radix UI icons and Lucide React

### Database
- **ORM**: Prisma with PostgreSQL
- **Schema location**: `prisma/schema.prisma`
- **Client access**: Import from `@/lib/prisma/` 
- **Environment**: Uses `.env.local` for database connection
- **After schema changes**: Always run `npm run db:genpush`

### State Management
- **Global state**: Zustand
- **Server state**: React Server Components / Server Actions
- **Real-time**: Socket.io (see `src/components/socket/`)

### Authentication
- **Provider**: NextAuth.js
- **Session handling**: See `src/lib/session.ts`

### Media Upload
- **Service**: Cloudinary
- **Upload action**: `src/actions/media.ts`
- **Config**: `src/lib/cloudinary.ts`
- **Body size limit**: 100mb (configured in next.config.mjs)

## Testing

No test framework is currently configured in this project.

## Environment Variables

This project uses `.env.local` for environment configuration (not committed to git).
Required variables likely include:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_*` - NextAuth configuration
- Cloudinary credentials
- Other service API keys

## Important Notes

- **Node version**: Check `.nvmrc` for required Node.js version
- **Package manager**: Uses npm (has `package-lock.json`)
- **Socket.io**: Real-time features require socket server setup
- **Bundle analyzer**: Available via `ANALYZE=true npm run build`
- **Image optimization**: Unoptimized mode enabled (see next.config.mjs)
- **Remote images**: Cloudinary and Giphy domains whitelisted

## Common Patterns

### Server Actions
Server actions are located in `src/actions/` and follow this pattern:
```typescript
'use server'
// Server action implementation
```

### Socket Events
Socket events are defined and used via custom hooks in `src/components/socket/`

### Custom Hooks
Reusable hooks are in `src/lib/hooks/` (e.g., intersection observer, drag & drop, etc.)

## Dependencies to Know

Key libraries already in use:
- **UI**: Radix UI primitives, shadcn/ui, Geist font
- **Forms**: Zod for validation
- **Utils**: clsx, tailwind-merge, lodash (keyby, uniqby)
- **Markdown**: react-markdown, react-linkify
- **Emoji**: emoji-mart
- **State**: nuqs (URL state), zustand (global state)
