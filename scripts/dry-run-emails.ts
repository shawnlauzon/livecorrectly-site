/**
 * Dry-run script for email crons.
 *
 * Simulates the welcome series, newsletter, and broadcast crons against the
 * real DB and real templates, showing exactly who would get what — without
 * sending anything or writing to the DB.
 *
 * Usage:
 *   pnpm dry-run
 *   pnpm dry-run -- --welcome-only
 *   pnpm dry-run -- --newsletter-only
 *   pnpm dry-run -- --broadcast-only
 *   pnpm dry-run -- --subscriber=jane@example.com
 *   pnpm dry-run -- --render-html
 *   pnpm dry-run -- --json
 */

import { getWelcomeDueSubscribers, getNewsletterDueSubscribers, getBroadcastCandidates } from '../lib/db';
import { parseChartForEmail } from '../lib/hd-chart/parse-for-email';
import { getWelcomeEmail, WELCOME_SERIES_LENGTH } from '../emails/welcome';
import { getWelcomeSubject } from '../emails/subjects';
import { getNewsletterEmail, getNewsletterSubject, getMaxNewsletterNumber } from '../emails/newsletter';
import { renderEmail, formatEmailRecipient, canSendTo, buildUnsubscribeUrl } from '../emails/send';
import { buildBroadcastEmail, getEnabledBroadcasts } from '../emails/broadcast-config';
import type { Subscriber } from '../lib/types/subscriber';
import fs from 'fs';
import path from 'path';

// --- CLI flag parsing ---

const args = process.argv.slice(2);

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function getFlagValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = args.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const welcomeOnly = hasFlag('welcome-only');
const newsletterOnly = hasFlag('newsletter-only');
const broadcastOnly = hasFlag('broadcast-only');
const subscriberFilter = getFlagValue('subscriber');
const renderHtml = hasFlag('render-html');
const jsonOutput = hasFlag('json');

// Determine which sections to run
const runWelcome = !newsletterOnly && !broadcastOnly;
const runNewsletter = !welcomeOnly && !broadcastOnly;
const runBroadcast = !welcomeOnly && !newsletterOnly;

// --- Safety checks ---

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.local or set it in the environment.');
  process.exit(1);
}

if (process.env.RESEND_API_KEY) {
  console.log('Note: RESEND_API_KEY is set, but this script never calls Resend. No emails will be sent.\n');
}

// --- Types for structured output ---

interface WelcomeResult {
  email: string;
  name: string;
  step: number;
  subject: string;
  canSend: boolean;
  renderOk: boolean;
  renderError?: string;
  htmlBytes: number;
}

interface NewsletterResult {
  email: string;
  name: string;
  step: number;
  subject: string;
  skipped: boolean;
  skipReason?: string;
  canSend: boolean;
  renderOk: boolean;
  renderError?: string;
  htmlBytes: number;
}

interface BroadcastResult {
  slug: string;
  email: string;
  name: string;
  subject: string;
  canSend: boolean;
  renderOk: boolean;
  renderError?: string;
  htmlBytes: number;
}

interface BroadcastGroupResult {
  slug: string;
  candidates: number;
  eligible: number;
  batchSize: number;
  recipients: BroadcastResult[];
}

interface DryRunReport {
  welcome: WelcomeResult[];
  newsletter: NewsletterResult[];
  broadcast: BroadcastGroupResult[];
  maxNewsletterNumber: number;
  summary: {
    welcomeWouldSend: number;
    welcomeBlocked: number;
    newsletterWouldSend: number;
    newsletterSkipped: number;
    broadcastWouldSend: number;
    broadcastBlocked: number;
  };
}

// --- Helpers ---

function filterSubscribers(subscribers: Subscriber[]): Subscriber[] {
  if (!subscriberFilter) return subscribers;
  return subscribers.filter(s => s.email === subscriberFilter);
}

function ensureOutputDir(): string {
  const dir = path.join(process.cwd(), 'scripts', 'dry-run-output');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function writeHtmlFile(dir: string, filename: string, html: string): void {
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, html, 'utf-8');
}

// --- Main ---

async function run(): Promise<void> {
  const report: DryRunReport = {
    welcome: [],
    newsletter: [],
    broadcast: [],
    maxNewsletterNumber: 0,
    summary: {
      welcomeWouldSend: 0,
      welcomeBlocked: 0,
      newsletterWouldSend: 0,
      newsletterSkipped: 0,
      broadcastWouldSend: 0,
      broadcastBlocked: 0,
    },
  };

  const outputDir = renderHtml ? ensureOutputDir() : null;

  // --- Welcome series ---

  if (runWelcome) {
    const allWelcomeDue = await getWelcomeDueSubscribers(WELCOME_SERIES_LENGTH);
    const welcomeDue = filterSubscribers(allWelcomeDue);

    for (const subscriber of welcomeDue) {
      const step = subscriber.next_step;
      const chart = parseChartForEmail(subscriber.chart.chart);
      const subject = getWelcomeSubject(step);
      const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsub_token, `welcome${step}`);
      const emailComponent = getWelcomeEmail(step, subscriber, chart, unsubscribeUrl);

      const recipient = formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email);
      const sendable = await canSendTo(recipient);

      const result: WelcomeResult = {
        email: subscriber.email,
        name: subscriber.last_name
          ? `${subscriber.first_name} ${subscriber.last_name}`
          : subscriber.first_name,
        step,
        subject,
        canSend: sendable,
        renderOk: false,
        htmlBytes: 0,
      };

      if (emailComponent) {
        try {
          const html = await renderEmail(emailComponent);
          result.renderOk = true;
          result.htmlBytes = Buffer.byteLength(html, 'utf-8');

          if (outputDir) {
            const safeEmail = subscriber.email.replace(/[^a-zA-Z0-9@._-]/g, '_');
            writeHtmlFile(outputDir, `welcome${step}-${safeEmail}.html`, html);
          }
        } catch (err) {
          result.renderError = err instanceof Error ? err.message : String(err);
        }
      } else {
        result.renderError = `getWelcomeEmail returned null for step ${step}`;
      }

      report.welcome.push(result);

      if (sendable && result.renderOk) {
        report.summary.welcomeWouldSend++;
      } else {
        report.summary.welcomeBlocked++;
      }
    }
  }

  // --- Newsletters ---

  if (runNewsletter) {
    const maxNum = getMaxNewsletterNumber();
    report.maxNewsletterNumber = maxNum;

    const allNewsletterDue = await getNewsletterDueSubscribers(WELCOME_SERIES_LENGTH);
    const newsletterDue = filterSubscribers(allNewsletterDue);

    for (const subscriber of newsletterDue) {
      const step = subscriber.next_step;

      if (step > maxNum) {
        report.newsletter.push({
          email: subscriber.email,
          name: subscriber.last_name
            ? `${subscriber.first_name} ${subscriber.last_name}`
            : subscriber.first_name,
          step,
          subject: '',
          skipped: true,
          skipReason: `past max #${maxNum}`,
          canSend: false,
          renderOk: false,
          htmlBytes: 0,
        });
        report.summary.newsletterSkipped++;
        continue;
      }

      const chart = parseChartForEmail(subscriber.chart.chart);
      const subject = getNewsletterSubject(step, subscriber.first_name, subscriber.id);
      const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsub_token, `newsletter_${step}`);
      const emailComponent = getNewsletterEmail(step, subscriber, chart, unsubscribeUrl);

      const recipient = formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email);
      const sendable = await canSendTo(recipient);

      const result: NewsletterResult = {
        email: subscriber.email,
        name: subscriber.last_name
          ? `${subscriber.first_name} ${subscriber.last_name}`
          : subscriber.first_name,
        step,
        subject,
        skipped: false,
        canSend: sendable,
        renderOk: false,
        htmlBytes: 0,
      };

      if (emailComponent) {
        try {
          const html = await renderEmail(emailComponent);
          result.renderOk = true;
          result.htmlBytes = Buffer.byteLength(html, 'utf-8');

          if (outputDir) {
            const safeEmail = subscriber.email.replace(/[^a-zA-Z0-9@._-]/g, '_');
            writeHtmlFile(outputDir, `newsletter${step}-${safeEmail}.html`, html);
          }
        } catch (err) {
          result.renderError = err instanceof Error ? err.message : String(err);
        }
      } else {
        result.renderError = `getNewsletterEmail returned null for step ${step}`;
      }

      report.newsletter.push(result);

      if (sendable && result.renderOk) {
        report.summary.newsletterWouldSend++;
      } else if (!result.skipped) {
        report.summary.newsletterSkipped++;
      }
    }
  }

  // --- Broadcasts ---

  if (runBroadcast) {
    const enabledBroadcasts = getEnabledBroadcasts();

    for (const [slug, config] of enabledBroadcasts) {
      const candidates = await getBroadcastCandidates(slug);
      const eligible = candidates.filter(config.filter);
      // Apply --subscriber filter, then batch limit
      const recipients = filterSubscribers(eligible).slice(0, config.batchSize);

      const group: BroadcastGroupResult = {
        slug,
        candidates: candidates.length,
        eligible: eligible.length,
        batchSize: config.batchSize,
        recipients: [],
      };

      for (const subscriber of recipients) {
        const chart = parseChartForEmail(subscriber.chart.chart);
        const recipient = formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email);
        const sendable = await canSendTo(recipient);

        const result: BroadcastResult = {
          slug,
          email: subscriber.email,
          name: subscriber.last_name
            ? `${subscriber.first_name} ${subscriber.last_name}`
            : subscriber.first_name,
          subject: '',
          canSend: sendable,
          renderOk: false,
          htmlBytes: 0,
        };

        try {
          const { element, subject } = buildBroadcastEmail(
            slug,
            subscriber.id,
            subscriber.first_name,
            subscriber.created_at,
            subscriber.unsub_token,
            chart
          );
          result.subject = subject;

          const html = await renderEmail(element);
          result.renderOk = true;
          result.htmlBytes = Buffer.byteLength(html, 'utf-8');

          if (outputDir) {
            const safeEmail = subscriber.email.replace(/[^a-zA-Z0-9@._-]/g, '_');
            writeHtmlFile(outputDir, `broadcast-${slug}-${safeEmail}.html`, html);
          }
        } catch (err) {
          result.renderError = err instanceof Error ? err.message : String(err);
        }

        group.recipients.push(result);

        if (sendable && result.renderOk) {
          report.summary.broadcastWouldSend++;
        } else {
          report.summary.broadcastBlocked++;
        }
      }

      report.broadcast.push(group);
    }
  }

  // --- Output ---

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Text output
  if (runWelcome) {
    console.log('--- Welcome Series ---');
    console.log(`${report.welcome.length} subscriber(s) due\n`);

    for (let i = 0; i < report.welcome.length; i++) {
      const r = report.welcome[i];
      const canSendLabel = r.canSend ? 'yes' : 'NO';
      const renderLabel = r.renderOk
        ? `ok (${r.htmlBytes.toLocaleString()} bytes)`
        : `FAILED: ${r.renderError}`;
      console.log(`  ${i + 1}. ${r.email} (${r.name})`);
      console.log(`     Welcome ${r.step} — "${r.subject}"`);
      console.log(`     Can send: ${canSendLabel} · Render: ${renderLabel}\n`);
    }
  }

  if (runNewsletter) {
    console.log('--- Newsletters ---');
    console.log(`${report.newsletter.length} subscriber(s) due (max available: #${report.maxNewsletterNumber})\n`);

    for (let i = 0; i < report.newsletter.length; i++) {
      const r = report.newsletter[i];
      if (r.skipped) {
        console.log(`  ${i + 1}. ${r.email} (${r.name})`);
        console.log(`     Step ${r.step} — SKIPPED (${r.skipReason})\n`);
        continue;
      }
      const canSendLabel = r.canSend ? 'yes' : 'NO';
      const renderLabel = r.renderOk
        ? `ok (${r.htmlBytes.toLocaleString()} bytes)`
        : `FAILED: ${r.renderError}`;
      console.log(`  ${i + 1}. ${r.email} (${r.name})`);
      console.log(`     Newsletter #${r.step} — "${r.subject}"`);
      console.log(`     Can send: ${canSendLabel} · Render: ${renderLabel}\n`);
    }
  }

  if (runBroadcast) {
    console.log('--- Broadcasts ---');
    const enabledCount = report.broadcast.length;
    console.log(`${enabledCount} enabled broadcast(s)\n`);

    for (const group of report.broadcast) {
      console.log(`  "${group.slug}" (${group.eligible} eligible of ${group.candidates} candidates, batch: ${group.batchSize})`);
      console.log(`  ${group.recipients.length} in this batch\n`);

      for (let i = 0; i < group.recipients.length; i++) {
        const r = group.recipients[i];
        const canSendLabel = r.canSend ? 'yes' : 'NO';
        const renderLabel = r.renderOk
          ? `ok (${r.htmlBytes.toLocaleString()} bytes)`
          : `FAILED: ${r.renderError}`;
        console.log(`    ${i + 1}. ${r.email} (${r.name})`);
        console.log(`       "${r.subject}"`);
        console.log(`       Can send: ${canSendLabel} · Render: ${renderLabel}\n`);
      }
    }
  }

  console.log('--- Summary ---');
  console.log(`Welcome: ${report.summary.welcomeWouldSend} would send, ${report.summary.welcomeBlocked} blocked`);
  console.log(`Newsletter: ${report.summary.newsletterWouldSend} would send, ${report.summary.newsletterSkipped} skipped (caught up)`);
  console.log(`Broadcast: ${report.summary.broadcastWouldSend} would send, ${report.summary.broadcastBlocked} blocked`);

  if (outputDir) {
    console.log(`\nHTML files written to: ${outputDir}`);
  }
}

run().catch(err => {
  console.error('Dry run failed:', err);
  process.exit(1);
});
