import { createDialogNavigation } from './dialog-navigation';

type Photo = { id: string; src: string; alt: string; title: string; story: string };
type Album = { id: string; title: string; story: string; photoIds: string[] };
const photos: Photo[] = JSON.parse(document.querySelector<HTMLElement>('#gallery-data')?.dataset.photos || '[]');
const albums: Album[] = JSON.parse(document.querySelector<HTMLElement>('#gallery-data')?.dataset.albums || '[]');
const gallery = document.querySelector<HTMLDialogElement>('#gallery-dialog')!;
const contact = document.querySelector<HTMLDialogElement>('#contact-dialog');
const copyDialog = document.querySelector<HTMLDialogElement>('#copy-dialog')!;
const galleryImage = document.querySelector<HTMLImageElement>('#gallery-image')!;
const galleryTitle = document.querySelector<HTMLElement>('#gallery-title')!;
const galleryStory = document.querySelector<HTMLElement>('#gallery-story')!;
const galleryCounter = document.querySelector<HTMLElement>('#gallery-counter')!;
const toastElement = document.querySelector<HTMLElement>('.toast')!;
const galleryLabel = document.querySelector<HTMLElement>('#gallery-label')!;
const dialogs = [gallery, contact, copyDialog].filter((dialog): dialog is HTMLDialogElement => dialog !== null);
const navigation = createDialogNavigation(dialogs);
const loadStatus = document.querySelector<HTMLElement>('#gallery-load-status')!;
const retryPhoto = document.querySelector<HTMLButtonElement>('[data-gallery-retry]')!;
type Selection = { photos: Photo[]; album?: Album; index: number };
let selection: Selection = { photos, index: 0 };
let toastTimer: ReturnType<typeof setTimeout>;

function toast(message: string) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add('visible');
  toastTimer = setTimeout(() => toastElement.classList.remove('visible'), 3200);
}

function updatePhoto(index: number) {
  if (!selection.photos.length) return;
  selection.index = (index + selection.photos.length) % selection.photos.length;
  const photo = selection.photos[selection.index];
  galleryImage.style.visibility = 'hidden';
  galleryImage.style.opacity = '0';
  loadStatus.textContent = '사진을 불러오는 중이에요.';
  retryPhoto.hidden = true;
  galleryImage.src = photo.src;
  galleryImage.alt = photo.alt;
  galleryTitle.textContent = selection.album?.title || photo.title;
  galleryStory.textContent = selection.album?.story || photo.story;
  galleryLabel.textContent = selection.album ? '이야기 앨범 · ' + selection.album.title : '사진 전체';
  galleryCounter.textContent = String(selection.index + 1).padStart(2, '0') + ' / ' + String(selection.photos.length).padStart(2, '0');
  document.querySelectorAll<HTMLButtonElement>('[data-gallery-prev], [data-gallery-next]').forEach((button) => {
    button.hidden = selection.photos.length < 2;
  });
  if (galleryImage.complete && galleryImage.naturalWidth > 0) photoLoaded();
}
function photoLoaded() {
  galleryImage.style.visibility = 'visible';
  galleryImage.style.opacity = '1';
  loadStatus.textContent = '';
  retryPhoto.hidden = true;
}
galleryImage.addEventListener('load', photoLoaded);
galleryImage.addEventListener('error', () => {
  galleryImage.style.visibility = 'hidden';
  galleryImage.style.opacity = '0';
  loadStatus.textContent = '사진을 불러오지 못했어요. 다시 시도해 주세요.';
  retryPhoto.hidden = false;
});
retryPhoto.addEventListener('click', () => updatePhoto(selection.index));
document.querySelectorAll<HTMLElement>('[data-gallery], [data-album]').forEach((button) => {
  button.addEventListener('click', () => {
    const album = albums.find((item) => item.id === button.dataset.album);
    const albumPhotos = album ? album.photoIds.map((id) => photos.find((photo) => photo.id === id)!).filter(Boolean) : photos;
    if (!albumPhotos.length) return;
    const opened: Selection = { photos: albumPhotos, album, index: Math.max(0, albumPhotos.findIndex((photo) => photo.id === button.dataset.gallery)) };
    navigation.open(gallery, () => {
      selection = opened;
      updatePhoto(selection.index);
    });
  });
});
document.querySelector('[data-close-gallery]')?.addEventListener('click', () => navigation.close(gallery));
document.querySelector('[data-gallery-prev]')?.addEventListener('click', () => updatePhoto(selection.index - 1));
document.querySelector('[data-gallery-next]')?.addEventListener('click', () => updatePhoto(selection.index + 1));
gallery.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') { event.preventDefault(); updatePhoto(selection.index + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); updatePhoto(selection.index - 1); }
});
let startX = 0, startY = 0, touchStarted = false;
const swipeArea = document.querySelector<HTMLElement>('.gallery-image-wrap')!;
swipeArea.addEventListener('touchstart', (event) => {
  touchStarted = event.touches.length === 1;
  if (touchStarted) { startX = event.touches[0].clientX; startY = event.touches[0].clientY; }
}, { passive: true });
swipeArea.addEventListener('touchend', (event) => {
  if (!touchStarted || !event.changedTouches.length) return;
  const dx = event.changedTouches[0].clientX - startX;
  const dy = event.changedTouches[0].clientY - startY;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) updatePhoto(selection.index + (dx < 0 ? 1 : -1));
  touchStarted = false;
}, { passive: true });
swipeArea.addEventListener('touchcancel', () => { touchStarted = false; }, { passive: true });

document.querySelectorAll<HTMLElement>('[data-open-contact]').forEach((button) => button.addEventListener('click', () => {
  if (contact) navigation.open(contact);
}));
document.querySelector('[data-close-contact]')?.addEventListener('click', () => { if (contact) navigation.close(contact); });
for (const dialog of dialogs) {
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) navigation.close(dialog);
  });
}

async function copy(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast(message);
  } catch {
    const input = document.querySelector<HTMLInputElement>('#copy-value')!;
    navigation.open(copyDialog, () => { input.value = value; });
    input.focus();
    input.select();
  }
}
document.querySelector('[data-close-copy]')?.addEventListener('click', () => navigation.close(copyDialog));
document.querySelectorAll<HTMLElement>('[data-copy]').forEach((button) => button.addEventListener('click', () => {
  void copy(button.dataset.copy || '', button.dataset.copyMessage || '복사했습니다.');
}));

document.querySelectorAll<HTMLElement>('[data-share]').forEach((button) => button.addEventListener('click', async () => {
  // Share the actual page URL, with no gallery/section fragment.
  const url = new URL(window.location.href);
  url.hash = ''; url.search = '';
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, text: '저희의 새로운 시작에 함께해 주세요.', url: url.href });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
    }
  }
  await copy(url.href, '청첩장 링크를 복사했습니다.');
}));

type KakaoShareLink = { mobileWebUrl: string; webUrl: string };
type KakaoSDK = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: { sendDefault: (options: { objectType: 'feed'; content: { title: string; description: string; imageUrl: string; link: KakaoShareLink }; buttons: { title: string; link: KakaoShareLink }[] }) => void };
};
declare global { interface Window { Kakao?: KakaoSDK } }

// The Kakao SDK <script> tag (head, not deferred) has already run by the time this module executes.
const kakaoButton = document.querySelector<HTMLButtonElement>('[data-kakao-share]');
if (kakaoButton && window.Kakao) {
  const { kakaoJsKey, kakaoTitle, kakaoDescription, kakaoImage, kakaoUrl, kakaoMapUrl } = kakaoButton.dataset;
  if (kakaoJsKey && kakaoTitle && kakaoDescription && kakaoImage && kakaoUrl && kakaoMapUrl) {
    const kakao = window.Kakao;
    if (!kakao.isInitialized()) kakao.init(kakaoJsKey);
    kakaoButton.hidden = false;
    kakaoButton.addEventListener('click', () => {
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title: kakaoTitle, description: kakaoDescription, imageUrl: kakaoImage, link: { mobileWebUrl: kakaoUrl, webUrl: kakaoUrl } },
        buttons: [
          { title: '청첩장 보기', link: { mobileWebUrl: kakaoUrl, webUrl: kakaoUrl } },
          { title: '위치 보기', link: { mobileWebUrl: kakaoMapUrl, webUrl: kakaoMapUrl } },
        ],
      });
    });
  }
}

const like = document.querySelector<HTMLButtonElement>('.like-button')!;
try { like.setAttribute('aria-pressed', String(localStorage.getItem('our-season-heart') === 'true')); } catch { /* Storage can be disabled. */ }
like.addEventListener('click', () => {
  const pressed = like.getAttribute('aria-pressed') !== 'true';
  like.setAttribute('aria-pressed', String(pressed));
  try { localStorage.setItem('our-season-heart', String(pressed)); } catch { /* The control still works in memory. */ }
  toast(pressed ? '축하하는 마음을 표시했어요.' : '마음 표시를 취소했어요.');
});

const countdown = document.querySelector<HTMLElement>('[data-event-date]');
function updateCountdown() {
  if (!countdown?.dataset.eventDate) return;
  const ceremony = new Date(countdown.dataset.eventDate);
  const todayKorea = new Intl.DateTimeFormat('en-CA', { timeZone: countdown.dataset.timeZone || 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const dateKey = (date: Date) => {
    const parts = todayKorea.formatToParts(date);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return Date.UTC(get('year'), get('month') - 1, get('day'));
  };
  const days = Math.round((dateKey(ceremony) - dateKey(new Date())) / 86400000);
  countdown.textContent = days > 0 ? '우리의 새로운 시작까지 ' + days + '일' : days === 0 ? '오늘, 우리의 새로운 시작' : '함께해 주셔서 감사합니다.';
}
updateCountdown();
setInterval(updateCountdown, 60_000);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
} else {
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
}
