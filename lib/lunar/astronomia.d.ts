/**
 * Type declarations for the `astronomia` package (v4.x).
 * Only the modules we use are declared: julian and moonposition.
 */

declare module 'astronomia/julian' {
  export class Calendar {
    year: number;
    month: number;
    day: number;
    constructor(year?: number | Date, month?: number, day?: number);
    fromDate(date: Date): this;
    toDate(): Date;
    toJD(): number;
    toJDE(): number;
    toYear(): number;
  }

  export class CalendarGregorian extends Calendar {
    toJD(): number;
    toJDE(): number;
    fromJD(jd: number): this;
  }

  export function DateToJDE(date: Date): number;
  export function DateToJD(date: Date): number;
  export function JDToDate(jd: number): Date;

  const julian: {
    Calendar: typeof Calendar;
    CalendarGregorian: typeof CalendarGregorian;
    DateToJDE: typeof DateToJDE;
    DateToJD: typeof DateToJD;
    JDToDate: typeof JDToDate;
  };
  export default julian;
}

declare module 'astronomia/moonposition' {
  interface Coord {
    lon: number;
    lat: number;
    range: number;
  }

  export function position(jde: number): Coord;

  const moonposition: {
    position: typeof position;
  };
  export default moonposition;
}
