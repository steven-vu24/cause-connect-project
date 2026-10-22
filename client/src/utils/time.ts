import { Event } from '../types/types';

const DAY_MS = 24 * 60 * 60 * 1000;

// Events are stored as Los Angeles wall-clock date and time. Rendering "now" in
// the same 'YYYY-MM-DD HH:MM' shape makes "has this event started" a string
// comparison that gives the same answer in every visitor's timezone.
export function nowInLosAngeles(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// new Date('YYYY-MM-DD') reads the string as UTC midnight, which is the
// previous day in California; building the date from parts keeps it local.
function parseDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export const formatDate = (date: string) =>
  date ? parseDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';

export function formatTime(time: string) {
  if (!time) return 'Time TBD';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export const formatTimeRange = (start: string, end?: string) =>
  end ? `${formatTime(start)} - ${formatTime(end)}` : formatTime(start);

type Scheduled = Pick<Event, 'startDate' | 'startTime'>;

export const hasStarted = (event: Scheduled, now = new Date()) =>
  `${event.startDate} ${event.startTime}` <= nowInLosAngeles(now);

export function startsWithinDays(event: Scheduled, days: number, now = new Date()) {
  const today = nowInLosAngeles(now).slice(0, 10);
  return !hasStarted(event, now) && (Date.parse(event.startDate) - Date.parse(today)) / DAY_MS <= days;
}

export function splitPastAndUpcoming<T extends Event>(events: T[], now = new Date()) {
  return {
    upcoming: events.filter((event) => !hasStarted(event, now)),
    past: events.filter((event) => hasStarted(event, now)),
  };
}
