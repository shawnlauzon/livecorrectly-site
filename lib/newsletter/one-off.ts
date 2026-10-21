/**
 * One-off issues are numbered after this base (10001, 10002, …) so they never
 * take a slot in the series, whose numbers are subscribers' next_step values.
 * Code decides whether an issue is a one-off from its `one_off` column; the
 * base only chooses which numbers one-offs are given.
 */
export const ONE_OFF_NUMBER_BASE = 10000;

/** How an issue is named in the admin: "One-off 1" or "Issue 12". */
export function issueLabel(number: number, oneOff: boolean): string {
  return oneOff ? `One-off ${number - ONE_OFF_NUMBER_BASE}` : `Issue ${number}`;
}
