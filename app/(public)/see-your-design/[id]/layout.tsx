import type { Metadata } from "next";

// Personal chart pages (and their sub-pages) must never appear in search results
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SubscriberChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
