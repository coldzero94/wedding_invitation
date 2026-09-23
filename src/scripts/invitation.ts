import { createDialogNavigation } from './dialog-navigation';

type Photo = { id: string; src: string; srcset: string; w: number; h: number; alt: string; caption: string };
const galleryData = document.querySelector<HTMLElement>('#gallery-data');
const photos: Photo[] = JSON.parse(galleryData?.dataset.photos || '[]');
const lightboxSizes = galleryData?.dataset.sizes || '100vw';
const gallery = document.querySelector<HTMLDialogElement>('#gallery-dialog')!;
const contact = document.querySelector<HTMLDialogElement>('#contact-dialog');
const copyDialog = document.querySelector<HTMLDialogElement>('#copy-dialog')!;
const galleryImage = document.querySelector<HTMLImageElement>('#gallery-image')!;
const galleryCaption = document.querySelector<HTMLElement>('#gallery-caption')!;
const galleryCounter = document.querySelector<HTMLElement>('#gallery-counter')!;
const toastElement = document.querySelector<HTMLElement>('.toast')!;
const dialogs = [gallery, contact, copyDialog].filter((dialog): dialog is HTMLDialogElement => dialog !== null);
const navigation = createDialogNavigation(dialogs);
const loadStatus = document.querySelector<HTMLElement>('#gallery-load-status')!;
const retryPhoto = document.querySelector<HTMLButtonElement>('[data-gallery-retry]')!;
// Shared with the history entry so Forward reopens the photo the guest was last looking at.
let selection = { index: 0 };
let toastTimer: ReturnType<typeof setTimeout>;

function toast(message: string) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add('visible');
  toastTimer = setTimeout(() => toastElement.classList.remove('visible'), 3200);
}

// Warm the neighbouring photos with the same sizes/srcset so the lightbox picks the cached candidate.
const warmed = new Map<string, HTMLImageElement>();
function preload(photo?: Photo) {
  if (!photo || warmed.has(photo.id)) return;
  const image = new Image();
  image.decoding = 'async';
  image.sizes = lightboxSizes;
  image.srcset = photo.srcset;
  image.src = photo.src;
  warmed.set(photo.id, image);
  image.addEventListener('error', () => warmed.delete(photo.id));
}

function updatePhoto(index: number) {
  if (!photos.length) return;
  const current = (index + photos.length) % photos.length;
  selection.index = current;
  const photo = photos[current];
  galleryImage.style.visibility = 'hidden';
  galleryImage.style.opacity = '0';
  loadStatus.textContent = '사진을 불러오는 중이에요.';
  retryPhoto.hidden = true;
  galleryImage.width = photo.w;
  galleryImage.height = photo.h;
  galleryImage.sizes = lightboxSizes;
  galleryImage.srcset = photo.srcset;
  galleryImage.src = photo.src;
  galleryImage.alt = photo.alt;
  galleryCaption.textContent = photo.caption;
  galleryCaption.hidden = !photo.caption;
  galleryCounter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(photos.length).padStart(2, '0');
  document.querySelectorAll<HTMLButtonElement>('[data-gallery-prev], [data-gallery-next]').forEach((button) => {
    button.hidden = photos.length < 2;
  });
  if (galleryImage.complete && galleryImage.naturalWidth > 0) photoLoaded();
  if (photos.length > 1) {
    preload(photos[(current + 1) % photos.length]);
    preload(photos[(current - 1 + photos.length) % photos.length]);
  }
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
// Thumbnails are links to the full photo so they still work without JavaScript.
document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    const index = photos.findIndex((photo) => photo.id === trigger.dataset.gallery);
    // Modified clicks keep the link's own behaviour (e.g. open the photo in a new tab).
    if (index < 0 || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const opened = { index };
    navigation.open(gallery, () => {
      selection = opened;
      updatePhoto(selection.index);
    });
  });
});
document.querySelector('[data-close-gallery]')?.addEventListener('click', () => navigation.close(gallery));
document.querySelector('[data-gallery-prev]')?.addEventListener('click', () => updatePhoto(selection.index - 1));
document.querySelector('[data-gallery-next]')?.addEventListener('click', () => updatePhoto(selection.index + 1));
// Listen on the document: the retry button hides itself after use, which moves focus out of the dialog.
document.addEventListener('keydown', (event) => {
  if (!gallery.open) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); updatePhoto(selection.index + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); updatePhoto(selection.index - 1); }
});
let startX = 0, startY = 0, touchStarted = false;
const swipeArea = document.querySelector<HTMLElement>('.gallery-image-wrap')!;
// A pinch-zoomed guest is panning around the photo, not asking for the next one.
const isZoomed = () => (window.visualViewport?.scale ?? 1) > 1.01;
// Watch touches on the whole dialog so a second finger anywhere cancels the swipe (it is a pinch).
gallery.addEventListener('touchstart', (event) => {
  touchStarted = event.touches.length === 1 && !isZoomed() && swipeArea.contains(event.target as Node);
  if (touchStarted) { startX = event.touches[0].clientX; startY = event.touches[0].clientY; }
}, { passive: true });
gallery.addEventListener('touchend', (event) => {
  if (event.touches.length > 0 || isZoomed()) { touchStarted = false; return; }
  if (!touchStarted || !event.changedTouches.length) return;
  const dx = event.changedTouches[0].clientX - startX;
  const dy = event.changedTouches[0].clientY - startY;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) updatePhoto(selection.index + (dx < 0 ? 1 : -1));
  touchStarted = false;
}, { passive: true });
gallery.addEventListener('touchcancel', () => { touchStarted = false; }, { passive: true });

const galleryGrid = document.querySelector<HTMLElement>('#gallery-grid');
const galleryMore = document.querySelector<HTMLButtonElement>('[data-gallery-more]');
if (galleryGrid && galleryMore) {
  galleryMore.hidden = false;
  galleryMore.addEventListener('click', () => {
    const firstHidden = galleryGrid.querySelector<HTMLElement>('.is-extra .gallery-thumb');
    galleryGrid.classList.add('is-expanded');
    galleryMore.setAttribute('aria-expanded', 'true');
    galleryMore.hidden = true;
    firstHidden?.focus({ preventScroll: true });
  });
}

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
  Share: { sendDefault: (options: { objectType: 'feed'; content: { title: string; description: string; imageUrl: string; imageWidth?: number; imageHeight?: number; link: KakaoShareLink }; buttons: { title: string; link: KakaoShareLink }[] }) => void };
};
declare global { interface Window { Kakao?: KakaoSDK } }

// The Kakao SDK <script> tag (head, not deferred) has already run by the time this module executes.
const kakaoButton = document.querySelector<HTMLButtonElement>('[data-kakao-share]');
if (kakaoButton && window.Kakao) {
  const { kakaoJsKey, kakaoTitle, kakaoDescription, kakaoImage, kakaoImageWidth, kakaoImageHeight, kakaoUrl, kakaoMapUrl } = kakaoButton.dataset;
  if (kakaoJsKey && kakaoTitle && kakaoDescription && kakaoImage && kakaoUrl && kakaoMapUrl) {
    const kakao = window.Kakao;
    if (!kakao.isInitialized()) kakao.init(kakaoJsKey);
    kakaoButton.hidden = false;
    kakaoButton.addEventListener('click', () => {
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title: kakaoTitle, description: kakaoDescription, imageUrl: kakaoImage, imageWidth: Number(kakaoImageWidth) || undefined, imageHeight: Number(kakaoImageHeight) || undefined, link: { mobileWebUrl: kakaoUrl, webUrl: kakaoUrl } },
        buttons: [
          { title: '청첩장 보기', link: { mobileWebUrl: kakaoUrl, webUrl: kakaoUrl } },
          { title: '위치 보기', link: { mobileWebUrl: kakaoMapUrl, webUrl: kakaoMapUrl } },
        ],
      });
    });
  }
}

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
  countdown.textContent = days > 0 ? '결혼식까지 ' + days + '일 남았습니다' : days === 0 ? '오늘, 저희 결혼합니다' : '함께해 주셔서 감사합니다';
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

// The dock stays out of the way on the cover and appears once the invitation itself is on screen.
const dock = document.querySelector<HTMLElement>('.mobile-dock');
const cover = document.querySelector<HTMLElement>('.cover');
if (dock && cover) {
  let queued = false;
  const syncDock = () => {
    queued = false;
    const shown = cover.getBoundingClientRect().bottom < window.innerHeight * 0.6;
    dock.classList.toggle('is-shown', shown);
    dock.inert = !shown;
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(syncDock); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  syncDock();
}
