type Album = { id: string; title: string; label: string; story: string; photoIds: string[] };

// Resolve stable IDs at build time so reordering photos cannot silently change an album.
export function createPhotoArchive<P extends { id: string }>(photos: P[], albums: Album[], previewPhotoIds: string[]) {
  if (!photos.length) throw new Error('사진을 한 장 이상 등록해 주세요.');
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  if (byId.size !== photos.length) throw new Error('사진 ID가 중복되었습니다.');
  if (new Set(albums.map((album) => album.id)).size !== albums.length) throw new Error('앨범 ID가 중복되었습니다.');
  const resolve = (id: string) => {
    const photo = byId.get(id);
    if (!photo) throw new Error('등록되지 않은 사진 ID: ' + id);
    return photo;
  };
  return {
    albums: albums.map((album) => {
      if (!album.photoIds.length) throw new Error('앨범에 사진이 없습니다: ' + album.id);
      const items = album.photoIds.map(resolve);
      return { ...album, cover: items[0], photos: items };
    }),
    previews: previewPhotoIds.map(resolve),
  };
}
