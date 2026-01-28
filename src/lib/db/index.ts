import { drizzle } from 'drizzle-orm/vercel-postgres'
import { sql } from '@vercel/postgres'
import * as schema from './schema'

// Export the database instance with schema for relational queries
export const db = drizzle(sql, { schema })

// Re-export schema and sql for convenience
export * from './schema'
export { sql }
