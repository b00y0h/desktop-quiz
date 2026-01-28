import { drizzle } from 'drizzle-orm/vercel-postgres'
import { sql } from '@vercel/postgres'

// Export the database instance
// Uses POSTGRES_URL from environment automatically via @vercel/postgres
export const db = drizzle(sql)

// Re-export for convenience
export { sql }
