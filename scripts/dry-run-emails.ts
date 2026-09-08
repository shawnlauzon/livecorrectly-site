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
import { buildBroadcastEmail } from '../emails/broadcast-config';
import { getEnabledBroadcastConfigs } from '../emails/broadcast-loader';
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

// --- Cron schedule helpers ---

interface VercelCronEntry {
  path: string;
  schedule: string;
}

interface VercelConfig {
  crons?: VercelCronEntry[];
}

/**
 * Parse a 5-field cron expression into minute, hour, and optional day-of-week.
 * Only supports the simple patterns used in vercel.json (no ranges, lists, etc.).
 */
function parseCronSchedule(expr: string): { minute: number; hour: number; dayOfWeek?: number } {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Expected 5-field cron expression, got: "${expr}"`);
  }
  const [minuteStr, hourStr, , , dowStr] = parts;
  const minute = parseInt(minuteStr, 10);
  const hour = parseInt(hourStr, 10);
  if (isNaN(minute) || isNaN(hour)) {
    throw new Error(`Could not parse minute/hour from cron expression: "${expr}"`);
  }
  const dayOfWeek = dowStr === '*' ? undefined : parseInt(dowStr, 10);
  if (dayOfWeek !== undefined && isNaN(dayOfWeek)) {
    throw new Error(`Could not parse day-of-week from cron expression: "${expr}"`);
  }
  return { minute, hour, dayOfWeek };
}

/**
 * Read vercel.json and return the cron schedule for the given API path.
 */
function getCronScheduleForPath(cronPath: string): { minute: number; hour: number; dayOfWeek?: number } {
  const configPath = path.join(process.cwd(), 'vercel.json');
  const config: VercelConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const entry = config.crons?.find(c => c.path === cronPath);
  if (!entry) {
    throw new Error(`No cron entry found in vercel.json for path: ${cronPath}`);
  }
  return parseCronSchedule(entry.schedule);
}

/**
 * Compute the next occurrence of a UTC cron time (hour:minute, optional day-of-week).
 */
function getNextCronDate(hourUtc: number, minuteUtc: number, dayOfWeek?: number): Date {
  const now = new Date();
  const candidate = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    hourUtc, minuteUtc, 0, 0
  ));

  if (dayOfWeek === undefined) {
    // Daily: use today if not yet passed, else tomorrow
    if (candidate.getTime() <= now.getTime()) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
  } else {
    // Weekly: advance to the next matching weekday
    const currentDay = candidate.getUTCDay();
    let daysUntil = (dayOfWeek - currentDay + 7) % 7;
    // If it's the right weekday but already past the time, jump to next week
    if (daysUntil === 0 && candidate.getTime() <= now.getTime()) {
      daysUntil = 7;
    }
    candidate.setUTCDate(candidate.getUTCDate() + daysUntil);
  }

  return candidate;
}

/** Format a Date in the server's local time zone, e.g. "Mon Sep 8 at 9:00 AM CDT" */
function formatCronDate(date: Date): string {
  const dayPart = date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  return `${dayPart} at ${timePart}`;
}

// Cron schedules read from vercel.json (single source of truth)
const welcomeSchedule    = getCronScheduleForPath('/api/cron/daily-emails');
const broadcastSchedule  = getCronScheduleForPath('/api/cron/broadcast');
const newsletterSchedule = getCronScheduleForPath('/api/cron/newsletter');

const nextWelcomeDate    = getNextCronDate(welcomeSchedule.hour, welcomeSchedule.minute, welcomeSchedule.dayOfWeek);
const nextBroadcastDate  = getNextCronDate(broadcastSchedule.hour, broadcastSchedule.minute, broadcastSchedule.dayOfWeek);
const nextNewsletterDate = getNextCronDate(newsletterSchedule.hour, newsletterSchedule.minute, newsletterSchedule.dayOfWeek);

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
  recipients: BroadcastResult[];
}

interface DryRunReport {
  nextSendDates: {
    welcome?: string;
    newsletter?: string;
    broadcast?: string;
  };
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
    nextSendDates: {
      ...(runWelcome  && { welcome:    nextWelcomeDate.toISOString() }),
      ...(runNewsletter && { newsletter: nextNewsletterDate.toISOString() }),
      ...(runBroadcast && { broadcast:  nextBroadcastDate.toISOString() }),
    },
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

  // In --json mode, buffer everything and print at the end.
  // In text mode, print each cohort as it completes.

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

    if (!jsonOutput) {
      console.log('--- Welcome Series ---');
      console.log(`${report.welcome.length} subscriber(s) due`);
      console.log(`Next send: ${formatCronDate(nextWelcomeDate)}\n`);

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

    if (!jsonOutput) {
      console.log('--- Newsletters ---');
      console.log(`${report.newsletter.length} subscriber(s) due (max available: #${report.maxNewsletterNumber})`);
      console.log(`Next send: ${formatCronDate(nextNewsletterDate)}\n`);

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
  }

  // --- Broadcasts ---

  if (runBroadcast) {
    const enabledBroadcasts = getEnabledBroadcastConfigs();

    if (!jsonOutput) {
      console.log('--- Broadcasts ---');
      console.log(`${enabledBroadcasts.length} enabled broadcast(s)`);
      console.log(`Next send: ${formatCronDate(nextBroadcastDate)}\n`);
    }

    for (const config of enabledBroadcasts) {
      const candidates = await getBroadcastCandidates(config.slug);
      const filterFn = config.filter ?? (() => true);
      const eligible = candidates.filter(filterFn);
      const recipients = filterSubscribers(eligible);

      const group: BroadcastGroupResult = {
        slug: config.slug,
        candidates: candidates.length,
        eligible: eligible.length,
        recipients: [],
      };

      for (const subscriber of recipients) {
        const chart = parseChartForEmail(subscriber.chart.chart);
        const recipient = formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email);
        const sendable = await canSendTo(recipient);

        const result: BroadcastResult = {
          slug: config.slug,
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
            config.slug,
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
            writeHtmlFile(outputDir, `broadcast-${config.slug}-${safeEmail}.html`, html);
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

      if (!jsonOutput) {
        console.log(`  "${group.slug}" (${group.eligible} eligible of ${group.candidates} candidates)\n`);

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
  }

  // --- Output ---

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
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
