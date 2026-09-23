import type { APIRoute } from 'astro';
import { wedding } from '../data/wedding';

const escape = (s: string) => s.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;').replaceAll('\r', '');
const utc = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
// Fold at 75 UTF-8 bytes without splitting a Korean character (RFC 5545).
function fold(line: string): string {
  let output = '', length = 0;
  for (const character of line) {
    const bytes = new TextEncoder().encode(character).length;
    if (length + bytes > 75) { output += '\r\n '; length = 1; }
    output += character; length += bytes;
  }
  return output;
}
export const GET: APIRoute = () => {
  const start = new Date(wedding.date);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Our Season//Wedding Invitation//KO',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:our-season-' + utc(start) + '@invitation.local',
    'DTSTAMP:' + utc(new Date()), 'DTSTART:' + utc(start),
    'DTEND:' + utc(new Date(start.getTime() + wedding.durationMinutes * 60000)),
    'SUMMARY:' + escape((wedding.isDemo ? '[샘플] ' : '') + wedding.groom.name + ' & ' + wedding.bride.name + ' 결혼식'),
    'LOCATION:' + escape([wedding.venue.name, wedding.venue.address.startsWith(wedding.venue.detail) ? '' : wedding.venue.detail, wedding.venue.address].filter(Boolean).join(', ')),
    'DESCRIPTION:' + escape(wedding.isDemo ? '청첩장 미리보기용 일정입니다.' : wedding.introduction.join('\n')),
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="our-wedding.ics"' },
  });
};
