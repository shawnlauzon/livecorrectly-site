"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./chart-form.module.css";
import { countries } from "@/lib/countries";
import { ChartRecord } from "@/lib/types/chart";
import hdChart from "@/lib/hd-chart";
import { generateChart as generateChartAPI, BirthDetails } from "@/lib/generate-chart";

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

/** Shape returned by the Maia Mechanics places API: { [timezone]: city[] } */
interface TimeZoneCities {
  [timezone: string]: string[];
}

/* ---- Chart generation via Maia Mechanics API ---- */
async function generateChart(details: BirthDetails): Promise<ChartRecord> {
  try {
    return await generateChartAPI(details);
  } catch (error) {
    // Dev-only fallback: if API key is missing, use fake fixture
    // This allows local development without requiring an API key
    if (error instanceof Error && error.message.includes('NEXT_PUBLIC_MAIA_API_KEY')) {
      console.warn('⚠️ Using fake chart data - NEXT_PUBLIC_MAIA_API_KEY not set');
      const mod = await import("@/public/fake-mmi-response.json");
      return mod.default as unknown as ChartRecord;
    }
    throw error;
  }
}

export default function ChartForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [timeUnknown, setTimeUnknown] = useState(false);
  const formStarted = useRef(false);

  /* ---- Place picker state ---- */
  const [countryAbbr, setCountryAbbr] = useState("US");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
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

  /* ---- Reset city results when query is too short ---- */
  const resetCityResults = useCallback(() => {
    setCities([]);
    setDropdownOpen(false);
  }, []);

  /* ---- Fetch cities from Maia Mechanics API ---- */
  useEffect(() => {
    if (cityQuery.length < 2) {
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
  }

  /* ---- Clear city selection ---- */
  function clearCity() {
    setSelectedCity("");
    setCityQuery("");
    setCities([]);
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

  async function handleBirthSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const dateInput = form.elements.namedItem("bdate") as HTMLInputElement;
    const timeInput = form.elements.namedItem("btime") as HTMLInputElement;
    const fnameInput = form.elements.namedItem("fname") as HTMLInputElement;
    const lnameInput = form.elements.namedItem("lname") as HTMLInputElement;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;

    const date = dateInput.value;
    const firstName = fnameInput.value.trim();
    const lastName = lnameInput.value.trim();
    const email = emailInput.value.trim();

    if (!firstName) {
      fnameInput.focus();
      return;
    }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      emailInput.focus();
      return;
    }
    if (!date || !selectedCity) {
      if (!date) dateInput.focus();
      else if (!selectedCity) cityInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setSaveError(false);
    setEmailTaken(false);

    // Check for existing subscriber before calling the chart engine
    try {
      const checkRes = await fetch(
        `/api/subscribers/check-email?email=${encodeURIComponent(email)}`
      );
      if (checkRes.ok) {
        const { exists } = (await checkRes.json()) as { exists: boolean };
        if (exists) {
          setEmailTaken(true);
          setSubmitting(false);
          emailInput.focus();
          return;
        }
      }
    } catch (err) {
      console.error("Email check failed:", err);
      // If the check itself fails, let the flow continue rather than blocking
    }

    const birthInput = {
      date,
      time: timeInput.value || null,
      timeUnknown,
      city: selectedCity,
      country: countryAbbr,
    };

    const chartDetails: BirthDetails = {
      date: birthInput.date,
      time: birthInput.time || "12:00",
      city: birthInput.city,
      country: birthInput.country,
    };
    try {
      const result = await generateChart(chartDetails);

      const hd = hdChart(result.chart);
      track("chart_generated", {
        type: hd.type(),
        time_unknown: birthInput.timeUnknown,
      });

      const saveRes = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName || null,
          birth_input: birthInput,
          chart: result,
        }),
      });

      if (!saveRes.ok) {
        throw new Error(`Save failed: ${saveRes.status}`);
      }

      const { id } = (await saveRes.json()) as { id: string };
      router.push(`/see-your-design/${id}?utm_source=form`);
    } catch (err) {
      console.error("Chart generation/save error:", err);
      setSaveError(true);
      setSubmitting(false);
    }
  }

  return (
    <>
      <form
        className={styles.card}
        noValidate
        onSubmit={handleBirthSubmit}
        onFocus={handleFormFocus}
      >
          <div className={styles.nameRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fname">
                First name
              </label>
              <input
                className={styles.input}
                type="text"
                id="fname"
                name="fname"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lname">
                Last name
              </label>
              <input
                className={styles.input}
                type="text"
                id="lname"
                name="lname"
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              className={styles.input}
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              required
              onChange={() => emailTaken && setEmailTaken(false)}
            />
            <p className={styles.hint}>
              Unsubscribe anytime.
            </p>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bdate">
              Birth date
            </label>
            <input
              className={styles.input}
              type="date"
              id="bdate"
              name="bdate"
              autoComplete="bday"
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
                    const val = e.target.value;
                    setCityQuery(val);
                    setSelectedCity("");
                    if (val.length < 2) resetCityResults();
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
                  aria-controls="city-listbox"
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
                  <ul className={styles.dropdown} role="listbox" id="city-listbox">
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

        {emailTaken && (
          <p
            style={{
              color: "var(--coral)",
              fontSize: "0.92rem",
              marginTop: 14,
              textAlign: "center",
            }}
          >
            This email already has a chart on file. Please use a different email
            address.
          </p>
        )}

        {saveError && (
          <p
            style={{
              color: "var(--coral)",
              fontSize: "0.92rem",
              marginTop: 14,
              textAlign: "center",
            }}
          >
            Something went wrong saving your chart. Please try again.
          </p>
        )}
      </form>
    </>
  );
}
