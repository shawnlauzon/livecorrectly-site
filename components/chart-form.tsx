"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import BodygraphPlaceholder from "./bodygraph-placeholder";
import styles from "./chart-form.module.css";
import { countries } from "@/lib/countries";

/* ---- Analytics wrapper ---- */
function track(name: string, params?: Record<string, unknown>) {
  try {
    const w = window as Window & {
      gtag?: (...args: unknown[]) => void;
      DEBUG_ANALYTICS?: boolean;
    };
    if (typeof w.gtag === "function") w.gtag("event", name, params ?? {});
    if (w.DEBUG_ANALYTICS) console.log("[track]", name, params ?? {});
  } catch {
    // Analytics should never break the UI
  }
}

/* ---- Chart engine hook (stub — Phase 2 replaces with server action) ---- */
interface ChartResult {
  type: string;
  strategy: string;
  authority: string;
  theme: string;
}

interface BirthDetails {
  date: string;
  time: string | null;
  timeUnknown: boolean;
  countryAbbr: string;
  city: string;
  timezone: string;
}

/** Shape returned by the Maia Mechanics places API: { [timezone]: city[] } */
interface TimeZoneCities {
  [timezone: string]: string[];
}

// Phase 2: replace stub with server action calling the chart engine
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generateChart(_details: BirthDetails): Promise<ChartResult> {
  return {
    type: "Generator",
    strategy:
      "Wait to respond \u2014 let life bring things to you, then notice what lights you up.",
    authority:
      "Sacral \u2014 trust the gut yes/no in the moment, not the mind\u2019s pros-and-cons.",
    theme:
      "Frustration \u2014 usually a sign you\u2019re pushing at the wrong thing.",
  };
}

/* ---- Kit opt-in hook (stub — Phase 2 replaces with own pipeline) ---- */
async function subscribeToKit(email: string): Promise<boolean> {
  const KIT_FORM_ID = "YOUR_KIT_FORM_ID";
  if (KIT_FORM_ID === "YOUR_KIT_FORM_ID") return true;
  const res = await fetch(
    `https://app.kit.com/forms/${KIT_FORM_ID}/subscriptions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email_address: email }),
    }
  );
  return res.ok;
}

type Step = "form" | "chart" | "done";

export default function ChartForm() {
  const [step, setStep] = useState<Step>("form");
  const [chart, setChart] = useState<ChartResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{
    text: string;
    type: "err" | "ok";
  } | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const formStarted = useRef(false);

  /* ---- Place picker state ---- */
  const [countryAbbr, setCountryAbbr] = useState("US");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [timezone, setTimezone] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [timeZoneCities, setTimeZoneCities] = useState<TimeZoneCities | null>(
    null
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const abortRef = useRef<AbortController | null>(null);
  const cityWrapRef = useRef<HTMLDivElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const handleFormFocus = useCallback(() => {
    if (!formStarted.current) {
      formStarted.current = true;
      track("form_start");
    }
  }, []);

  /* ---- Fetch cities from Maia Mechanics API ---- */
  useEffect(() => {
    if (cityQuery.length < 2) {
      setCities([]);
      setTimeZoneCities(null);
      setDropdownOpen(false);
      return;
    }

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort("refetch");
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams([
      ["country", countryAbbr],
      ["search", cityQuery],
    ]);

    fetch(`https://app.maiamechanics.com/places-v1/cities?${params}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          console.error(`City search HTTP error: ${res.status}`);
          return;
        }
        const data = (await res.json()) as TimeZoneCities;
        setTimeZoneCities(data);
        const flat = Object.values(data).flat();
        setCities(flat);
        setDropdownOpen(flat.length > 0);
        setActiveIndex(-1);
      })
      .catch((err) => {
        // AbortController.abort('refetch') throws — expected, ignore it
        if (err === "refetch" || err?.name === "AbortError") return;
        console.error("Error fetching cities:", err);
      });
  }, [cityQuery, countryAbbr]);

  /* ---- Close dropdown on outside click ---- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        cityWrapRef.current &&
        !cityWrapRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---- Select a city from the dropdown ---- */
  function selectCity(city: string) {
    setSelectedCity(city);
    setCityQuery(city);
    setDropdownOpen(false);

    // Resolve timezone from the API response keys
    if (timeZoneCities) {
      const tz = Object.keys(timeZoneCities).find((key) =>
        timeZoneCities[key].includes(city)
      );
      if (tz) setTimezone(tz);
    }
  }

  /* ---- Clear city selection ---- */
  function clearCity() {
    setSelectedCity("");
    setCityQuery("");
    setTimezone("");
    setCities([]);
    setTimeZoneCities(null);
    setDropdownOpen(false);
    setActiveIndex(-1);
    cityInputRef.current?.focus();
  }

  /* ---- Country change resets city ---- */
  function handleCountryChange(abbr: string) {
    setCountryAbbr(abbr);
    clearCity();
  }

  /* ---- City input keyboard navigation ---- */
  function handleCityKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropdownOpen || cities.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < cities.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : cities.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < cities.length) {
        selectCity(cities[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDropdownOpen(false);
    }
  }

  function showStep(s: Step) {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleBirthSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const dateInput = form.elements.namedItem("bdate") as HTMLInputElement;
    const timeInput = form.elements.namedItem("btime") as HTMLInputElement;

    const date = dateInput.value;

    if (!date || !selectedCity || !timezone) {
      if (!date) dateInput.focus();
      else if (!selectedCity) cityInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    const details: BirthDetails = {
      date,
      time: timeInput.value || null,
      timeUnknown,
      countryAbbr,
      city: selectedCity,
      timezone,
    };
    const result = await generateChart(details);
    setChart(result);

    track("chart_generated", {
      type: result.type,
      time_unknown: details.timeUnknown,
    });
    setSubmitting(false);
    showStep("chart");
  }

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    const email = emailInput.value.trim();

    setEmailMsg(null);

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailMsg({
        text: "That email doesn\u2019t look right \u2014 mind checking it?",
        type: "err",
      });
      emailInput.focus();
      return;
    }

    setEmailSubmitting(true);
    try {
      const ok = await subscribeToKit(email);
      if (ok) {
        track("email_optin");
        showStep("done");
      } else {
        throw new Error("failed");
      }
    } catch {
      setEmailMsg({
        text: "Something went wrong sending that. Try again in a moment.",
        type: "err",
      });
      setEmailSubmitting(false);
    }
  }

  return (
    <>
      {/* STEP 1: birth details */}
      <section className={step === "form" ? styles.stepActive : styles.step}>
        <form
          className={styles.card}
          noValidate
          onSubmit={handleBirthSubmit}
          onFocus={handleFormFocus}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bdate">
              Birth date
            </label>
            <input
              className={styles.input}
              type="date"
              id="bdate"
              name="bdate"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="btime">
              Birth time{" "}
              <span className={styles.hint}>&mdash; as exact as you can</span>
            </label>
            <input
              className={styles.input}
              type="time"
              id="btime"
              name="btime"
              disabled={timeUnknown}
            />
            <div className={styles.checkrow}>
              <input
                className={styles.checkbox}
                type="checkbox"
                id="notime"
                checked={timeUnknown}
                onChange={(e) => setTimeUnknown(e.target.checked)}
              />
              <label className={styles.checkLabel} htmlFor="notime">
                I&rsquo;m not sure of my exact time
              </label>
            </div>
            <p
              className={`${styles.note} ${timeUnknown ? styles.noteShow : ""}`}
            >
              No problem &mdash; I&rsquo;ll still generate your chart. Your
              Type and Strategy are usually stable; a couple of finer details
              firm up once you track down your birth time.
            </p>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              Birth place{" "}
              <span className={styles.hint}>
                &mdash; country, then city
              </span>
            </label>
            <div className={styles.placeRow}>
              <select
                className={styles.input}
                value={countryAbbr}
                onChange={(e) => handleCountryChange(e.target.value)}
                aria-label="Birth country"
              >
                {countries.map((c) => (
                  <option key={c.abbr} value={c.abbr}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className={styles.cityWrap} ref={cityWrapRef}>
                <input
                  ref={cityInputRef}
                  className={styles.input}
                  type="text"
                  placeholder={"Start typing a city\u2026"}
                  value={cityQuery}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setSelectedCity("");
                    setTimezone("");
                  }}
                  onFocus={() => {
                    if (cities.length > 0 && !selectedCity) {
                      setDropdownOpen(true);
                    }
                  }}
                  onKeyDown={handleCityKeyDown}
                  autoComplete="off"
                  aria-label="Birth city"
                  aria-expanded={dropdownOpen}
                  aria-autocomplete="list"
                  role="combobox"
                />
                {selectedCity && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={clearCity}
                    aria-label="Clear city"
                  >
                    &times;
                  </button>
                )}
                {dropdownOpen && cities.length > 0 && (
                  <ul className={styles.dropdown} role="listbox">
                    {cities.map((city, i) => (
                      <li
                        key={i}
                        className={`${styles.dropdownItem} ${i === activeIndex ? styles.dropdownItemActive : ""}`}
                        role="option"
                        aria-selected={i === activeIndex}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectCity(city);
                        }}
                        onMouseEnter={() => setActiveIndex(i)}
                      >
                        {city}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <button className={styles.btn} type="submit" disabled={submitting}>
            {submitting ? "Reading your chart\u2026" : "See my design"}
          </button>
        </form>
      </section>

      {/* STEP 2: chart + email ask */}
      <section className={step === "chart" ? styles.stepActive : styles.step}>
        <div className={styles.card}>
          <div className={styles.resultHead}>
            <div className={styles.bodygraph}>
              <BodygraphPlaceholder />
            </div>
            <div>
              <p className={styles.typeLabel}>Your type</p>
              <h2 className={styles.typeName}>{chart?.type ?? ""}</h2>
            </div>
          </div>

          <div className={styles.readout}>
            <div className={styles.rowitem}>
              <div className={styles.k}>Strategy</div>
              <div className={styles.v}>{chart?.strategy ?? ""}</div>
            </div>
            <div className={styles.rowitem}>
              <div className={styles.k}>Authority</div>
              <div className={styles.v}>{chart?.authority ?? ""}</div>
            </div>
            <div className={styles.rowitem}>
              <div className={styles.k}>Not-self theme</div>
              <div className={styles.v}>{chart?.theme ?? ""}</div>
            </div>
          </div>

          <p className={styles.stubFlag}>
            Sample reading shown. Wire your chart engine into{" "}
            <code>generateChart()</code> to replace these values and render the
            real bodygraph.
          </p>

          <div className={styles.emailBlock}>
            <h3 className={styles.emailH3}>
              That&rsquo;s the map. Now the how.
            </h3>
            <p className={styles.emailP}>
              Knowing your type is the start. The series walks you through
              actually using it &mdash; your decisions, your energy, where your
              money comes from &mdash; one piece at a time.
            </p>
            <form noValidate onSubmit={handleEmailSubmit}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  Where should I send it?
                </label>
                <input
                  className={styles.input}
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button
                className={styles.btn}
                type="submit"
                disabled={emailSubmitting}
              >
                {emailSubmitting
                  ? "Sending\u2026"
                  : "Send me the series"}
              </button>
              {emailMsg && (
                <div
                  className={`${styles.msg} ${emailMsg.type === "err" ? styles.msgErr : styles.msgOk}`}
                >
                  {emailMsg.text}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* STEP 3: done */}
      <section className={step === "done" ? styles.stepActive : styles.step}>
        <div className={`${styles.card} ${styles.doneCard}`}>
          <h2 className={styles.doneH2}>Check your inbox.</h2>
          <p className={styles.doneP}>
            Your chart and the first email are on their way. If you don&rsquo;t
            see it in a minute, check spam and drag it to your inbox &mdash;
            that keeps the rest coming.
          </p>
        </div>
      </section>
    </>
  );
}
