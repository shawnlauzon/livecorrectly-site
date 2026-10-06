"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import styles from "./chart-link-request.module.css";

interface ChartLinkRequestProps {
  /** Where this form appears, for analytics */
  location: string;
  /** Newsletter issue being read — the emailed link returns here */
  slug?: string;
  /** Pre-filled email; when set, the form sends straight away without asking for it */
  email?: string;
  /** Text of the link that opens the form (or sends, when `email` is set) */
  label?: string;
  /** Lead-in shown before the link (e.g. "Already have one?"); dropped once sent */
  prompt?: string;
}

type Status = "closed" | "open" | "sending" | "sent" | "error";

/**
 * "Email me my link" for returning subscribers on a new device. The reply never
 * says whether the email has a chart, so it can't reveal who is subscribed.
 */
export default function ChartLinkRequest({
  location,
  slug,
  email: presetEmail,
  label = "Email me my link",
  prompt,
}: ChartLinkRequestProps) {
  const [status, setStatus] = useState<Status>("closed");
  const [email, setEmail] = useState(presetEmail ?? "");

  async function send(address: string) {
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribers/chart-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, slug }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      track("chart_link_request", { location });
      setStatus("sent");
    } catch (err) {
      console.error("Chart link request failed:", err);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <strong className={styles.note}>
        If that email has a chart, your link is on its way. Check your inbox.
      </strong>
    );
  }

  if (status === "closed") {
    return (
      <>
        {prompt && `${prompt} `}
        <button
          type="button"
          className={styles.trigger}
          onClick={() => (presetEmail ? void send(presetEmail) : setStatus("open"))}
        >
          {label}
        </button>
      </>
    );
  }

  if (presetEmail) {
    return status === "error" ? (
      <span className={styles.error}>
        Something went wrong.{" "}
        <button type="button" className={styles.trigger} onClick={() => void send(presetEmail)}>
          Try again
        </button>
      </span>
    ) : (
      <span className={styles.note}>Sending&hellip;</span>
    );
  }

  return (
    <>
      {prompt}
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void send(email);
        }}
      >
        <input
          className={styles.input}
          type="email"
          required
          autoComplete="email"
          aria-label="Your email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        <button className={styles.submit} type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending\u2026" : "Send link"}
        </button>
        {status === "error" && (
          <span className={styles.error}>Something went wrong. Please try again.</span>
        )}
      </form>
    </>
  );
}
