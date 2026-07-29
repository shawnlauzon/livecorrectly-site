"use server"

import { sql } from "@/lib/db"

export type ChartRequest = {
  firstName: string
  lastName: string
  email: string
  birthDate: string
  birthTime: string
  timeUnknown: boolean
  birthLocation: string
}

export type SubmitResult = {
  ok: boolean
  message: string
}

export async function submitChartRequest(
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  const data: ChartRequest = {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    birthDate: String(formData.get("birthDate") ?? "").trim(),
    birthTime: String(formData.get("birthTime") ?? "").trim(),
    timeUnknown: formData.get("timeUnknown") === "on",
    birthLocation: String(formData.get("birthLocation") ?? "").trim(),
  }

  if (!data.firstName || !data.email || !data.birthDate || !data.birthLocation) {
    return { ok: false, message: "Please fill in your first name, email, birth date, and birth location." }
  }
  if (!data.timeUnknown && !data.birthTime) {
    return {
      ok: false,
      message: "Please enter your birth time, or check \u201cI don\u2019t know my birth time\u201d.",
    }
  }

  try {
    await sql`
      INSERT INTO subscribers (email, first_name, last_name, birth_date, birth_time, time_unknown, birth_place)
      VALUES (
        ${data.email},
        ${data.firstName},
        ${data.lastName || null},
        ${data.birthDate},
        ${data.birthTime || null},
        ${data.timeUnknown},
        ${data.birthLocation}
      )
    `
  } catch (error: unknown) {
    // Neon/pg unique_violation error code for duplicate email
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "23505") {
      return {
        ok: false,
        message: "This email has already been submitted. We\u2019ll be in touch soon!",
      }
    }
    console.error("[chart-request] failed to insert subscriber:", error)
    return {
      ok: false,
      message: "Something went wrong saving your details. Please try again.",
    }
  }

  return {
    ok: true,
    message: "Thanks! We\u2019ve got your details and will send your chart shortly.",
  }
}
