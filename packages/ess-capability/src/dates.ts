const WEEKDAY: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a Date as YYYY-MM-DD in local calendar fields of the given Date object. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function nextWeekday(from: Date, weekday: number): Date {
  const current = from.getDay();
  let delta = (weekday - current + 7) % 7;
  if (delta === 0) delta = 7;
  return addDays(from, delta);
}

export interface ResolvedDateRange {
  readonly startDate: string;
  readonly endDate: string;
  readonly label: string;
}

/**
 * Resolve relative / absolute date phrases without hardcoding calendar years.
 * `now` is injectable for deterministic tests.
 */
export function resolveRelativeDatePhrase(
  text: string,
  now: Date = new Date(),
): ResolvedDateRange | null {
  const message = text.trim().toLowerCase();
  const today = startOfDay(now);

  if (/\btoday\b/.test(message)) {
    const iso = toIsoDate(today);
    return { startDate: iso, endDate: iso, label: 'today' };
  }
  if (/\btomorrow\b/.test(message)) {
    const iso = toIsoDate(addDays(today, 1));
    return { startDate: iso, endDate: iso, label: 'tomorrow' };
  }
  if (/\byesterday\b/.test(message)) {
    const iso = toIsoDate(addDays(today, -1));
    return { startDate: iso, endDate: iso, label: 'yesterday' };
  }

  const nextWeekdayMatch = message.match(
    /\b(?:next|coming)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
  );
  if (nextWeekdayMatch?.[1]) {
    const weekday = WEEKDAY[nextWeekdayMatch[1]];
    if (weekday !== undefined) {
      const iso = toIsoDate(nextWeekday(today, weekday));
      return { startDate: iso, endDate: iso, label: `next ${nextWeekdayMatch[1]}` };
    }
  }

  const thisWeekdayMatch = message.match(
    /\b(?:this|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
  );
  if (thisWeekdayMatch?.[1]) {
    const weekday = WEEKDAY[thisWeekdayMatch[1]];
    if (weekday !== undefined) {
      const current = today.getDay();
      const delta = (weekday - current + 7) % 7;
      const iso = toIsoDate(addDays(today, delta));
      return { startDate: iso, endDate: iso, label: thisWeekdayMatch[1] };
    }
  }

  if (/\bnext week\b/.test(message)) {
    const monday = nextWeekday(today, 1);
    const friday = addDays(monday, 4);
    return {
      startDate: toIsoDate(monday),
      endDate: toIsoDate(friday),
      label: 'next week',
    };
  }

  const rangeWords = message.match(
    /\b(?:from\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:to|through|-)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
  );
  if (rangeWords?.[1] && rangeWords[2]) {
    const startWd = WEEKDAY[rangeWords[1]];
    const endWd = WEEKDAY[rangeWords[2]];
    if (startWd !== undefined && endWd !== undefined) {
      const start = nextWeekday(addDays(today, -1), startWd);
      let end = nextWeekday(addDays(today, -1), endWd);
      if (end < start) end = addDays(end, 7);
      return {
        startDate: toIsoDate(start),
        endDate: toIsoDate(end),
        label: `${rangeWords[1]} to ${rangeWords[2]}`,
      };
    }
  }

  const isos = [...text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[1]).filter(Boolean);
  if (isos.length >= 2 && isos[0] && isos[1]) {
    return { startDate: isos[0], endDate: isos[1], label: `${isos[0]} to ${isos[1]}` };
  }
  if (isos.length === 1 && isos[0]) {
    return { startDate: isos[0], endDate: isos[0], label: isos[0] };
  }

  return null;
}

export function countWeekdaysInclusive(startIso: string, endIso: string): number {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end || end < start) return 0;
  let count = 0;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function listDatesInclusive(startIso: string, endIso: string): string[] {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end || end < start) return [];
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    out.push(toIsoDate(d));
  }
  return out;
}
