import { formatTime, formatTimeRange, hasStarted, nowInLosAngeles, splitPastAndUpcoming, startsWithinDays } from './time';
import { Event } from '../types/types';

// 2026-07-01 16:30 UTC is 09:30 in Los Angeles (PDT, UTC-7).
const now = new Date('2026-07-01T16:30:00Z');

const event = (startDate: string, startTime: string): Event => ({
  id: 1,
  title: 'Beach cleanup',
  organization: 'Shore Crew',
  body: '',
  startDate,
  startTime,
  endDate: startDate,
  endTime: '',
  location: 'Irvine, CA',
  cause: '',
});

test('reads the current time in Los Angeles regardless of the machine timezone', () => {
  expect(nowInLosAngeles(now)).toBe('2026-07-01 09:30');
  expect(nowInLosAngeles(new Date('2026-07-02T06:59:00Z'))).toBe('2026-07-01 23:59');
});

test('an event has started once its Los Angeles start time has passed', () => {
  expect(hasStarted(event('2026-07-01', '09:29'), now)).toBe(true);
  expect(hasStarted(event('2026-07-01', '09:30'), now)).toBe(true);
  expect(hasStarted(event('2026-07-01', '09:31'), now)).toBe(false);
  expect(hasStarted(event('2026-06-30', '23:00'), now)).toBe(true);
});

test('splits events into upcoming and past', () => {
  const { upcoming, past } = splitPastAndUpcoming([event('2026-07-02', '10:00'), event('2026-06-01', '10:00')], now);
  expect(upcoming.map((e) => e.startDate)).toEqual(['2026-07-02']);
  expect(past.map((e) => e.startDate)).toEqual(['2026-06-01']);
});

test('flags events that start within the next week', () => {
  expect(startsWithinDays(event('2026-07-08', '10:00'), 7, now)).toBe(true);
  expect(startsWithinDays(event('2026-07-09', '10:00'), 7, now)).toBe(false);
  expect(startsWithinDays(event('2026-07-01', '09:00'), 7, now)).toBe(false);
});

test('formats 24-hour times for display', () => {
  expect(formatTime('00:05')).toBe('12:05 AM');
  expect(formatTime('12:00')).toBe('12:00 PM');
  expect(formatTime('17:45')).toBe('5:45 PM');
  expect(formatTimeRange('09:00', '12:30')).toBe('9:00 AM - 12:30 PM');
  expect(formatTimeRange('09:00')).toBe('9:00 AM');
});
