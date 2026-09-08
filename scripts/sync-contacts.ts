/**
 * One-time migration: sync all active subscribers from Neon to Resend contacts.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/sync-contacts.ts
 *
 * Rate-limited to avoid hitting Resend API limits (150ms between calls).
 * Safe to re-run — contacts are created with upsert semantics.
 */

import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const DATABASE_URL = process.env.DATABASE_URL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const resend = new Resend(RESEND_API_KEY);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureNeonIdProperty() {
  console.log('Ensuring neon_id contact property exists in Resend...');
  const { error } = await resend.contactProperties.create({
    key: 'neon_id',
    type: 'string',
  });
  if (error) {
    // 409 = already exists, which is fine
    if ('statusCode' in error && (error as { statusCode: number }).statusCode === 409) {
      console.log('  neon_id property already exists');
    } else {
      throw new Error(`Failed to create neon_id property: ${JSON.stringify(error)}`);
    }
  } else {
    console.log('  Created neon_id property');
  }
}

async function main() {
  await ensureNeonIdProperty();

  console.log('Querying active subscribers from Neon...');

  const subscribers = await sql`
    SELECT id, email, first_name, last_name
    FROM subscribers
    WHERE email_status IN ('active', 'failed')
    ORDER BY created_at ASC
  `;

  console.log(`Found ${subscribers.length} active subscribers to sync`);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const sub of subscribers) {
    const { id, email, first_name, last_name } = sub;

    try {
      const { error } = await resend.contacts.create({
        email,
        firstName: first_name,
        ...(last_name && { lastName: last_name }),
        properties: { neon_id: id },
      });

      if (error) {
        // 409 = contact already exists — update instead
        if ('statusCode' in error && (error as { statusCode: number }).statusCode === 409) {
          const { error: updateError } = await resend.contacts.update({
            email,
            firstName: first_name,
            ...(last_name && { lastName: last_name }),
            properties: { neon_id: id },
          });

          if (updateError) {
            console.error(`  FAIL (update) ${email}: ${JSON.stringify(updateError)}`);
            failed++;
          } else {
            console.log(`  UPDATED ${email}`);
            updated++;
          }
        } else {
          console.error(`  FAIL (create) ${email}: ${JSON.stringify(error)}`);
          failed++;
        }
      } else {
        console.log(`  CREATED ${email}`);
        created++;
      }
    } catch (err) {
      console.error(`  ERROR ${email}:`, err);
      failed++;
    }

    // Rate limit: 150ms between calls
    await sleep(150);
  }

  console.log('\nSync complete:');
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Total:   ${subscribers.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
