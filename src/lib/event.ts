import { wedding } from '../data/wedding';

export const eventDate = new Date(wedding.date);
export const eventParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: wedding.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(eventDate);
const part = (name: string) => Number(eventParts.find((p) => p.type === name)?.value);
export const year = part('year');
export const month = part('month');
export const day = part('day');
export const longDate = new Intl.DateTimeFormat('ko-KR', {
  timeZone: wedding.timeZone, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
}).format(eventDate);
export const time = new Intl.DateTimeFormat('ko-KR', {
  timeZone: wedding.timeZone, hour: 'numeric', minute: '2-digit', hour12: true,
}).format(eventDate).replace(':00', '시');
export const shortDate = [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('.');
export const weekday = new Intl.DateTimeFormat('en-US', { timeZone: wedding.timeZone, weekday: 'short' }).format(eventDate).toUpperCase();
export const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
export const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
