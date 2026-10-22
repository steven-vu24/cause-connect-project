import { Event } from '../types/types';

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

export function eventStart(event: Pick<Event, 'startDate' | 'startTime'>) {
  const start = parseDate(event.startDate);
  const [hours, minutes] = event.startTime.split(':').map(Number);
  start.setHours(hours, minutes, 0, 0);
  return start;
}

export const hasStarted = (event: Pick<Event, 'startDate' | 'startTime'>, now = new Date()) =>
  eventStart(event) <= now;

export function splitPastAndUpcoming<T extends Event>(events: T[]) {
  const now = new Date();
  return {
    upcoming: events.filter((event) => !hasStarted(event, now)),
    past: events.filter((event) => hasStarted(event, now)),
  };
}
