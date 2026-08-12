import { ChartRecord } from "@/lib/types/chart";
import { countries } from "@/lib/countries";

interface BirthDetails {
  date: string;
  time: string | null;
  timeUnknown: boolean;
  countryAbbr: string;
  city: string;
  timezone: string;
}

export async function generateChart(details: BirthDetails): Promise<ChartRecord> {
  if (!process.env.NEXT_PUBLIC_MAIA_API_KEY) {
    throw new Error(
      'NEXT_PUBLIC_MAIA_API_KEY is not set. Cannot generate chart without API key. ' +
      'Set the environment variable or use the fake fixture explicitly for development.'
    );
  }

  const time = details.time ?? "12:00";

  const body = {
    tzData: {
      country: details.countryAbbr,
      city: details.city,
      timezone: details.timezone,
      timeInUtc: false,
      time: `${details.date}T${time}:00Z`,
    },
    data: {
      city: {
        name: details.city,
        timezone: details.timezone,
        tz: details.timezone,
      },
      country: {
        id: details.countryAbbr,
        name: countries.find((c) => c.abbr === details.countryAbbr)?.name,
        tz: null,
      },
      date: `${details.date}T00:00:00.000Z`,
      time: `1970-01-01T${time}:00.000Z`,
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
