import { test, expect } from '@playwright/test';
import { createPhotoArchive } from '../src/lib/photo-archive';

test('30 photos keep the chosen three albums and two previews, even after reordering', () => {
  const photos = Array.from({ length: 30 }, (_, i) => ({ id: 'photo-' + i }));
  const albums = [
    { id: 'first', title: '처음', label: '처음', story: '이야기 1', photoIds: ['photo-5', 'photo-0'] },
    { id: 'trip', title: '여행', label: '여행', story: '이야기 2', photoIds: ['photo-20', 'photo-12'] },
    { id: 'today', title: '오늘', label: '오늘', story: '이야기 3', photoIds: ['photo-29'] },
  ];
  const result = createPhotoArchive(photos.reverse(), albums, ['photo-12', 'photo-29']);
  expect(result.albums).toHaveLength(3);
  expect(result.albums[0].cover.id).toBe('photo-5');
  expect(result.albums[1].photos.map((photo) => photo.id)).toEqual(['photo-20', 'photo-12']);
  expect(result.previews.map((photo) => photo.id)).toEqual(['photo-12', 'photo-29']);
});

test('invalid photo configuration fails at build time', () => {
  expect(() => createPhotoArchive([], [], [])).toThrow('한 장 이상');
  expect(() => createPhotoArchive([{ id: 'a' }, { id: 'a' }], [], [])).toThrow('중복');
  expect(() => createPhotoArchive([{ id: 'a' }], [], ['missing'])).toThrow('등록되지 않은');
  expect(() => createPhotoArchive([{ id: 'a' }], [{ id: 'album', title: '', label: '', story: '', photoIds: [] }], [])).toThrow('앨범에 사진이 없습니다');
});
