// Shared rules for every <input type="time"> in the app (Create Match, Browse
// filters): a 5-minute grid, with the earliest slot being "now" rounded up —
// but only when the chosen date is today.

/** `<input type="time" step={...}>` — 300s = 5-minute increments. */
export const TIME_STEP_SECONDS = 300;

const LAST_SLOT = "23:55";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar date of `now` as "YYYY-MM-DD" (matches <input type="date">). */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * `now` rounded UP to the next 5-minute boundary, as "HH:MM".
 *   10:01 -> "10:05"   10:56 -> "11:00"   10:05 -> "10:05" (already on grid)
 * Never wraps past midnight — clamps to the final "23:55" slot.
 */
export function nextFiveMinuteSlot(now: Date = new Date()): string {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.ceil(minutes / 5) * 5;
  if (rounded >= 24 * 60) return LAST_SLOT;
  return `${pad(Math.floor(rounded / 60))}:${pad(rounded % 60)}`;
}

/**
 * Earliest time selectable for a picker bound to `dateStr` (a "YYYY-MM-DD"
 * string, or empty/undefined when no date has been chosen yet).
 *
 *   - today, or no date picked -> next 5-minute slot from now
 *   - any date after today      -> "00:00" (the whole day is open)
 *
 * Past dates fall through to the "now" floor; they shouldn't be reachable via
 * the date picker anyway.
 */
export function earliestTimeForDate(
  dateStr: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!dateStr || dateStr <= todayIso(now)) {
    return nextFiveMinuteSlot(now);
  }
  return "00:00";
}
