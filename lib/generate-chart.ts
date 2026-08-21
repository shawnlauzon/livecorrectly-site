import { ChartRecord } from "@/lib/types/chart";
import { countries } from "@/lib/countries";

export interface BirthDetails {
  date: string;       // "YYYY-MM-DD"
  time: string;       // "HH:MM" — caller passes "12:00" when time is unknown
  city: string;
  country: string;    // 2-letter abbreviation e.g. "US"
}

/** Shape returned by the Maia Mechanics places API: { [timezone]: city[] } */
interface TimeZoneCities {
  [timezone: string]: string[];
}

/**
 * Resolve timezone for a city by calling the Maia Mechanics places API.
 * Finds the timezone key whose city list contains the given city name.
 */
async function resolveTimezone(city: string, country: string): Promise<string> {
  const params = new URLSearchParams([
    ["country", country],
    ["search", city],
  ]);

  const response = await fetch(
    `https://app.maiamechanics.com/places-v1/cities?${params}`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Timezone resolution failed: places API returned ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as TimeZoneCities;

  // Find the timezone key that contains this city
  const tz = Object.keys(data).find((key) => data[key].includes(city));
  if (!tz) {
    throw new Error(
      `Timezone resolution failed: city "${city}" not found in places API response for country "${country}"`
    );
  }

  return tz;
}

export async function generateChart(details: BirthDetails): Promise<ChartRecord> {
  if (!process.env.NEXT_PUBLIC_MAIA_API_KEY) {
    throw new Error(
      'NEXT_PUBLIC_MAIA_API_KEY is not set. Cannot generate chart without API key. ' +
      'Set the environment variable or use the fake fixture explicitly for development.'
    );
  }

  const timezone = await resolveTimezone(details.city, details.country);

  const body = {
    tzData: {
      country: details.country,
      city: details.city,
      timezone,
      timeInUtc: false,
      time: `${details.date}T${details.time}:00Z`,
    },
    data: {
      city: {
        name: details.city,
        timezone,
        tz: timezone,
      },
      country: {
        id: details.country,
        name: countries.find((c) => c.abbr === details.country)?.name,
        tz: null,
      },
      date: `${details.date}T00:00:00.000Z`,
      time: `1970-01-01T${details.time}:00.000Z`,
    },
  };

  console.log('Sending to Maia Mechanics:', body);

  const response = await fetch(
    "https://app.maiamechanics.com/api-v2/api/web-calculator/server-side-generation",
    {
      method: "POST",
      headers: {
        "Calculator-Token": process.env.NEXT_PUBLIC_MAIA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      // Response body not JSON — ignore
    }
    throw new Error(
      `Chart generation failed: ${response.status} ${response.statusText} ${JSON.stringify(errorBody)}`
    );
  }

  return (await response.json()) as ChartRecord;
}
