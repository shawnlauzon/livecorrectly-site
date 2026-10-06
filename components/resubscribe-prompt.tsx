"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import styles from "./resubscribe-prompt.module.css";

interface ResubscribePromptProps {
  subscriberId: string;
  /** Weekday the newsletter goes out (from the publication cadence), or null if unset */
  sendDay: string | null;
  /** Where this prompt appears, for analytics */
  location: string;
}

type Status = "idle" | "saving" | "done" | "error";

/** Shown to an unsubscribed subscriber on the newsletter pages: one click to opt back in. */
export default function ResubscribePrompt({ subscriberId, sendDay, location }: ResubscribePromptProps) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleClick() {
    setStatus("saving");
    try {
      const res = await fetch(`/api/subscribers/${subscriberId}/resubscribe`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      track("resubscribe", { location });
      setStatus("done");
    } catch (err) {
      console.error("Resubscribe failed:", err);
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <section className={styles.prompt}>
        <p>
          Welcome back! {sendDay ? `Your next issue arrives on ${sendDay}.` : "Your next issue is on its way."}
        </p>
      </section>
    );
  }

  return (
    <section className={styles.prompt}>
      <p>You&rsquo;re unsubscribed from the newsletter. Want it in your inbox again?</p>
      <button
        className="btn"
        type="button"
        onClick={() => void handleClick()}
        disabled={status === "saving"}
      >
        {status === "saving" ? "Resubscribing…" : "Resubscribe"}
      </button>
      {status === "error" && (
        <p className={styles.error}>Something went wrong. Please try again.</p>
      )}
    </section>
  );
}
