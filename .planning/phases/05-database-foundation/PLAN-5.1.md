---
wave: 1
depends_on: []
files_modified:
  - package.json
  - src/lib/db/index.ts
  - drizzle.config.ts
  - .env.example
autonomous: true
---

# Plan 5.1: Install Drizzle ORM and Configure Database Connection

## Goal
Install Drizzle ORM with Vercel Postgres adapter and create the database connection configuration, establishing the foundation for database operations.

## Context
The app currently uses Vercel Blob JSON files for data persistence, which causes CDN caching issues. We're migrating to Vercel Postgres with Drizzle ORM for type-safe database operations. The Vercel Postgres database must be provisioned separately via Vercel dashboard - this plan sets up the code to connect to it.

## Prerequisites
- Vercel Postgres database must be created via Vercel dashboard before running
- Database connection string must be available as `POSTGRES_URL` environment variable

## Tasks

<task id="5.1.1">
**Install Drizzle ORM dependencies**

Run npm install for the required packages:
```bash
npm install drizzle-orm @vercel/postgres
npm install -D drizzle-kit
```

This installs:
- `drizzle-orm` - Core ORM with type-safe query builder
- `@vercel/postgres` - Vercel's Postgres client (provides connection pooling)
- `drizzle-kit` - CLI for schema migrations and introspection

Verify package.json has the new dependencies listed.
</task>

<task id="5.1.2">
**Create database connection module**

Create `src/lib/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/vercel-postgres'
import { sql } from '@vercel/postgres'

// Export the database instance
// Uses POSTGRES_URL from environment automatically via @vercel/postgres
export const db = drizzle(sql)

// Re-export for convenience
export { sql }
```

This creates a single database instance using Vercel's connection pooling. The `@vercel/postgres` client automatically reads the `POSTGRES_URL` environment variable.
</task>

<task id="5.1.3">
**Create Drizzle configuration file**

Create `drizzle.config.ts` in the project root:

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
})
```

This configuration:
- Points to the schema file (created in Plan 5.2)
- Outputs migrations to `./drizzle` directory
- Uses PostgreSQL dialect
- Reads connection URL from environment
</task>

<task id="5.1.4">
**Update .env.example with required variables**

Create or update `.env.example` to document required environment variables:

```
# Vercel Blob (existing)
BLOB_READ_WRITE_TOKEN=

# Vercel Postgres (new for v1.2)
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=
```

Note: Vercel Postgres provides multiple connection strings. `POSTGRES_URL` uses connection pooling (for serverless), `POSTGRES_URL_NON_POOLING` is for migrations.
</task>

<task id="5.1.5">
**Add npm scripts for database operations**

Update package.json scripts:

```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

- `db:push` - Push schema changes directly to database (for development/prototyping)
- `db:studio` - Open Drizzle Studio for database inspection
</task>

## Verification

1. Run `npm install` and verify no errors
2. Verify `package.json` includes `drizzle-orm`, `@vercel/postgres`, and `drizzle-kit`
3. Verify `src/lib/db/index.ts` exists and exports `db`
4. Verify `drizzle.config.ts` exists in project root
5. Run `npx next build` to verify TypeScript compiles (schema file won't exist yet, but db/index.ts should be valid)

## must_haves
- [ ] drizzle-orm and @vercel/postgres installed as dependencies (DB-02)
- [ ] drizzle-kit installed as dev dependency (DB-02)
- [ ] Database connection module created at src/lib/db/index.ts (DB-01, DB-02)
- [ ] Drizzle config file created with correct schema path (DB-02)
- [ ] npm scripts added for db:push and db:studio (DB-02)
