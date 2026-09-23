import { test, expect } from '@playwright/test';
import { validateWedding } from '../src/lib/validate-wedding';
import { deploymentConfig } from '../scripts/deployment-config.mjs';

const details = () => ({
  isDemo: false,
  groom: { name: '테스트', fullName: '테스트 신랑', phone: '' },
  bride: { name: '테스트', fullName: '테스트 신부', phone: '' },
  date: '2028-02-29T14:00:00+09:00', durationMinutes: 90, timeZone: 'Asia/Seoul',
  venue: { name: '테스트홀', address: '테스트 주소', mapLinks: [] },
  accounts: [], hero: { alt: '표지' },
});

test('release accepts optional contact/accounts but rejects samples and missing address', () => {
  expect(validateWedding(details(), true)).toEqual([]);
  expect(validateWedding({ ...details(), isDemo: true }, true).join()).toContain('isDemo');
  const incomplete = details();
  incomplete.venue.address = '';
  expect(validateWedding(incomplete, true).join()).toContain('상세 주소');
});

test('invalid dates cannot silently move to another day or timezone', () => {
  for (const date of ['2027-02-29T14:00:00+09:00', '2028-04-31T14:00:00+09:00', '2028-05-01T14:00:00', '2028-05-01T24:00:00+09:00']) {
    expect(validateWedding({ ...details(), date }).join()).toContain('예식 날짜');
  }
  expect(validateWedding({ ...details(), timeZone: 'Invalid/Timezone' }).join()).toContain('시간대');
});

test('malformed contact and map values fail before rendering', () => {
  expect(validateWedding({ ...details(), groom: { ...details().groom, phone: '-------' } }).join()).toContain('전화번호');
  expect(validateWedding({ ...details(), venue: { ...details().venue, mapLinks: [{ label: '지도', url: 'javascript:alert(1)' }] } }).join()).toContain('HTTPS');
});

test('release URL separates origin and base and refuses local addresses', () => {
  expect(deploymentConfig({ SITE_URL: 'https://couple.github.io', BASE_PATH: '/invitation', RELEASE_BUILD: '1' })).toEqual({ site: 'https://couple.github.io', base: '/invitation' });
  for (const SITE_URL of ['http://localhost:4321', 'https://wedding.test', 'https://your-name.github.io', 'https://couple.github.io/invitation/']) {
    expect(() => deploymentConfig({ SITE_URL, RELEASE_BUILD: '1' })).toThrow();
  }
  expect(() => deploymentConfig({ BASE_PATH: '//another-site' })).toThrow('BASE_PATH');
});
