"use client";

import { track } from "@/lib/analytics";
import { forgetCookieString } from "@/lib/subscriber-cookie";

/**
 * "Not you?" on personalized pages: forgets the remembered subscriber and
 * reloads the page without `?s=`, so it renders for an anonymous visitor.
 */
export default function NotYouLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        document.cookie = forgetCookieString();
        track("subscriber_forgotten");
        window.location.assign(window.location.pathname);
      }}
    >
      Not you?
    </button>
  );
}
