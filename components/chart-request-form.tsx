"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { submitChartRequest, type SubmitResult } from "@/app/see-your-design/actions"

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-line bg-card-lc px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-muted-lc focus:border-grape"
const labelClass = "mb-2 block text-[0.9rem] font-semibold text-ink"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-xl bg-grape px-7 py-[15px] text-base font-semibold text-white shadow-[0_8px_22px_-10px_rgba(106,75,214,.7)] transition-all hover:-translate-y-0.5 hover:bg-grape-deep active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending\u2026" : "See how I\u2019m designed"}
    </button>
  )
}

export function ChartRequestForm() {
  const [state, formAction] = useActionState<SubmitResult | null, FormData>(submitChartRequest, null)
  const [timeUnknown, setTimeUnknown] = useState(false)

  if (state?.ok) {
    return (
      <div className="rounded-[20px] border border-line bg-card-lc p-8 text-center">
        <p className="font-display text-[1.4rem] font-bold text-ink">You&apos;re all set.</p>
        <p className="mt-3 text-[1.05rem] leading-[1.55] text-muted-lc">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="rounded-[20px] border border-line bg-card-lc p-6 sm:p-8">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className={labelClass}>
              First name
            </label>
            <input id="firstName" name="firstName" type="text" required className={fieldClass} placeholder="Jane" />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>
              Last name
            </label>
            <input id="lastName" name="lastName" type="text" className={fieldClass} placeholder="Doe" />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" required className={fieldClass} placeholder="you@example.com" />
        </div>

        <div>
          <label htmlFor="birthDate" className={labelClass}>
            Birth date
          </label>
          <input id="birthDate" name="birthDate" type="date" required className={fieldClass} />
        </div>

        <div>
          <label htmlFor="birthTime" className={labelClass}>
            Birth time
          </label>
          <input
            id="birthTime"
            name="birthTime"
            type="time"
            disabled={timeUnknown}
            className={`${fieldClass} disabled:opacity-50`}
          />
          <label className="mt-2 flex items-center gap-2 text-[0.9rem] text-muted-lc">
            <input
              type="checkbox"
              name="timeUnknown"
              checked={timeUnknown}
              onChange={(e) => setTimeUnknown(e.target.checked)}
              className="size-4 accent-grape"
            />
            I don&apos;t know my birth time
          </label>
        </div>

        <div>
          <label htmlFor="birthLocation" className={labelClass}>
            Birth location
          </label>
          <input
            id="birthLocation"
            name="birthLocation"
            type="text"
            required
            className={fieldClass}
            placeholder="City, Country"
          />
        </div>

        {state && !state.ok ? (
          <p role="alert" className="text-[0.92rem] font-medium text-coral">
            {state.message}
          </p>
        ) : null}

        <SubmitButton />
      </div>
    </form>
  )
}
