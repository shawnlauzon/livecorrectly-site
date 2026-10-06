"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";

/** next/link that fires a GA4 event on click — for use from server components. */
export default function TrackedLink({
  event,
  params,
  ...props
}: ComponentProps<typeof Link> & { event: string; params?: Record<string, unknown> }) {
  return <Link {...props} onClick={() => track(event, params)} />;
}
