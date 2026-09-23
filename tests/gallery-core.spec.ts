import { test, expect } from '@playwright/test';
import { buildGallery, defaultAlt } from '../src/lib/gallery-core';

const entries = (...files: string[]) => files.map((file) => ({ file, image: file }));

test('photos are ordered by the number in their file name, whatever the extension case', () => {
  const photos = buildGallery(entries('10.jpg', '2.jpg', '1.JPG', '11.jpeg', '3.png'));
  expect(photos.map((photo) => photo.id)).toEqual(['1', '2', '3', '10', '11']);
  expect(photos.map((photo) => photo.index)).toEqual([0, 1, 2, 3, 4]);
});

test('default alt text uses the right Korean particle and the photo number', () => {
  expect(defaultAlt('찬영', '예지', 3)).toBe('찬영과 예지의 웨딩 사진 3');
  expect(defaultAlt('지후', '서연', 1)).toBe('지후와 서연의 웨딩 사진 1');
  expect(defaultAlt('Alex', 'Sam', 2)).toBe('Alex & Sam의 웨딩 사진 2');
  expect(defaultAlt('', '', 4)).toBe('웨딩 사진 4');
  const [photo] = buildGallery(entries('01.jpg'), {}, { groom: '찬영', bride: '예지' });
  expect(photo.alt).toBe('찬영과 예지의 웨딩 사진 1');
  expect(photo.position).toBe('attention');
});

test('overrides are matched by file number or name, ignoring case and extension', () => {
  const photos = buildGallery(entries('01.jpg', '02.JPG', '03.png'), {
    '01': { caption: ' 제주에서 ', position: 'top', alt: '바다 앞의 두 사람' },
    '02.jpg': { caption: '대문자 확장자' },
    '03.PNG': { position: ' ' },
  });
  expect(photos[0]).toMatchObject({ caption: '제주에서', position: 'top', alt: '바다 앞의 두 사람' });
  expect(photos[1].caption).toBe('대문자 확장자');
  expect(photos[2].position).toBe('attention');
  expect(() => buildGallery(entries('01.jpg'), { '01.png': { caption: '다른 확장자' } }, { release: true })).toThrow('찾을 수 없습니다');
});

test('invalid gallery configuration fails at build time with a clear message', () => {
  expect(() => buildGallery([])).toThrow('한 장 이상');
  expect(() => buildGallery(entries('01.jpg', '01.png'))).toThrow('같은 이름');
  expect(() => buildGallery(entries('01.jpg'), { '01': { position: '50% 30%' } })).toThrow('position');
  expect(() => buildGallery(entries('01.jpg'), { '01': { hidden: true } as never })).toThrow('숨기기');
  expect(() => buildGallery(entries('01.jpg'), { '07': { caption: '없는 사진' } }, { release: true })).toThrow('찾을 수 없습니다');
  expect(() => buildGallery(entries('01.jpg'), { '07': { caption: '없는 사진' } })).not.toThrow();
});
