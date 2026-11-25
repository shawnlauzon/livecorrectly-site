import { defineConfig } from 'vitest/config';
import path from 'path';
import { readFileSync } from 'fs';
import { parseEnv } from 'util';

// Tests see the checked-in .env (public settings such as the booking link) so
// they exercise the real values. Never .env.local: it holds live secrets.
const checkedInEnv = parseEnv(readFileSync(path.resolve(import.meta.dirname, '.env'), 'utf8'));

export default defineConfig({
  test: {
    globals: true,
    env: checkedInEnv,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
