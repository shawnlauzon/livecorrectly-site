/**
 * Seed script: reads newsletters/*.md from disk and INSERTs into the newsletters table.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-newsletters.ts
 *
 * Safe to re-run: uses INSERT ... ON CONFLICT (number) DO UPDATE to upsert.
 */

import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { parseRawNewsletter } from '../newsletters/loader';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.local or set it in the environment.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function run(): Promise<void> {
  const dir = path.join(process.cwd(), 'newsletters');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();

  if (files.length === 0) {
    console.log('No newsletter .md files found in newsletters/');
    return;
  }

  console.log(`Found ${files.length} newsletter file(s)`);

  let inserted = 0;

  for (const file of files) {
    const num = parseInt(file.replace('.md', ''), 10);
    if (isNaN(num) || num < 1) {
      console.log(`  Skipping ${file} (not a valid newsletter number)`);
      continue;
    }

    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const raw = parseRawNewsletter(content, num);

    await sql`
      INSERT INTO newsletters (
        number, subject, preview, slug, description,
        image, body_markdown, postscripts, old_slugs
      ) VALUES (
        ${raw.number},
        ${raw.subject},
        ${raw.preview},
        ${raw.slug},
        ${raw.description},
        ${raw.rawImage},
        ${raw.bodyMarkdown},
        ${JSON.stringify(raw.rawPs)},
        ${JSON.stringify(raw.oldSlugs)}
      )
      ON CONFLICT (number) DO UPDATE SET
        subject = EXCLUDED.subject,
        preview = EXCLUDED.preview,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        image = EXCLUDED.image,
        body_markdown = EXCLUDED.body_markdown,
        postscripts = EXCLUDED.postscripts,
        old_slugs = EXCLUDED.old_slugs,
        updated_at = now()
    `;

    console.log(`  #${num}: ${raw.subject}`);
    inserted++;
  }

  console.log(`\nSeeded ${inserted} newsletter(s) into the database.`);
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
