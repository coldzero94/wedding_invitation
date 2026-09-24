import { createDialogNavigation } from './dialog-navigation';

type Photo = { id: string; src: string; srcset: string; w: number; h: number; alt: string; caption: string };
const galleryData = document.querySelector<HTMLElement>('#gallery-data');
const photos: Photo[] = JSON.parse(galleryData?.dataset.photos || '[]');
const lightboxSizes = galleryData?.dataset.sizes || '100vw';
const gallery = document.querySelector<HTMLDialogElement>('#gallery-dialog')!;
const contact = document.querySelector<HTMLDialogElement>('#contact-dialog');
const copyDialog = document.querySelector<HTMLDialogElement>('#copy-dialog')!;
const parking = document.querySelector<HTMLDialogElement>('#parking-dialog');
const shareSheet = document.querySelector<HTMLDialogElement>('#share-sheet');
const galleryImage = document.querySelector<HTMLImageElement>('#gallery-image')!;
const galleryCaption = document.querySelector<HTMLElement>('#gallery-caption')!;
const galleryCounter = document.querySelector<HTMLElement>('#gallery-counter')!;
const toastElement = document.querySelector<HTMLElement>('.toast')!;
const dialogs = [gallery, contact, copyDialog, parking, shareSheet].filter((dialog): dialog is HTMLDialogElement => dialog !== null);
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
  if (!photo) return;
  if (warmed.has(photo.id)) return warmed.get(photo.id);
  const image = new Image();
  image.decoding = 'async';
  image.sizes = lightboxSizes;
  image.srcset = photo.srcset;
  image.src = photo.src;
  warmed.set(photo.id, image);
  image.addEventListener('error', () => warmed.delete(photo.id));
  return image;
}
const wait = (ms: number) => new Promise<false>((resolve) => setTimeout(() => resolve(false), ms));
// Resolves true once the photo can be painted, or false if it is not ready within the time limit.
function ready(image: HTMLImageElement | undefined, ms: number) {
  if (!image) return Promise.resolve(false);
  if (image.complete) return Promise.resolve(image.naturalWidth > 0);
  return Promise.race([image.decode().then(() => true, () => false), wait(ms)]);
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

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// The invitation always opens on its cover. Older shared links carry #invitation (the 초대장 열기
// target); drop it so they start at the top too. Other anchors (e.g. Kakao's #location) still apply.
// (The head script already strips it before the browser can jump; this is the fallback.)
if (location.hash === '#invitation') {
  history.replaceState(history.state, '', location.pathname + location.search);
  window.scrollTo({ top: 0, behavior: 'instant' });
}
// Set while an in-page link is smooth-scrolling, so on-screen moments wait for it to finish.
let autoScrollUntil = 0;
// In-page links scroll without writing their #fragment into the address, so a link copied or shared
// from the address bar later still opens on the cover. The skip link keeps its native behaviour.
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not(.skip-link)').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    autoScrollUntil = performance.now() + 1500;
    const behavior = reduceMotion.matches ? 'instant' : 'smooth';
    // #top means the very top of the page; scroll there directly rather than to the marker element.
    if (target.id === 'top') window.scrollTo({ top: 0, behavior });
    else target.scrollIntoView({ behavior, block: 'start' });
  });
});
let opening = false;
// Grow the tapped thumbnail into the full photo. Only when the photo is already decoded, so the
// morph never lands on an empty frame; otherwise the viewer simply fades in as before.
async function openPhoto(index: number, thumb: HTMLImageElement | null) {
  if (opening || gallery.open) return;
  const opened = { index };
  const show = () => navigation.open(gallery, () => {
    selection = opened;
    updatePhoto(selection.index);
  });
  if (!document.startViewTransition || reduceMotion.matches || !thumb) return show();
  opening = true;
  const ok = await ready(preload(photos[index]), 250);
  if (!ok || gallery.open) { opening = false; if (!gallery.open) show(); return; }
  thumb.style.viewTransitionName = 'gallery-photo';
  gallery.classList.add('is-morphing');
  const transition = document.startViewTransition(async () => {
    thumb.style.viewTransitionName = '';
    galleryImage.style.viewTransitionName = 'gallery-photo';
    show();
    if (!galleryImage.complete) await ready(galleryImage, 200);
    if (galleryImage.complete && galleryImage.naturalWidth > 0) photoLoaded();
  });
  transition.finished.finally(() => {
    galleryImage.style.viewTransitionName = '';
    gallery.classList.remove('is-morphing');
    opening = false;
  });
}
// Thumbnails are links to the full photo so they still work without JavaScript.
document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((trigger) => {
  const index = photos.findIndex((photo) => photo.id === trigger.dataset.gallery);
  const thumb = trigger.querySelector('img');
  // Fade each thumbnail in once it has loaded instead of popping in over the placeholder.
  if (thumb && !thumb.complete) {
    thumb.classList.add('is-loading');
    const loaded = () => thumb.classList.remove('is-loading');
    thumb.addEventListener('load', loaded, { once: true });
    thumb.addEventListener('error', loaded, { once: true });
  }
  // Start fetching the full photo as soon as a finger or pointer lands on it.
  trigger.addEventListener('pointerdown', () => preload(photos[index]), { passive: true });
  trigger.addEventListener('click', (event) => {
    // Modified clicks keep the link's own behaviour (e.g. open the photo in a new tab).
    if (index < 0 || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void openPhoto(index, thumb);
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

// The button is a link to the first guide image, so it still works without JavaScript.
document.querySelector('[data-open-parking]')?.addEventListener('click', (event) => {
  if (!parking || (event as MouseEvent).metaKey || (event as MouseEvent).ctrlKey) return;
  event.preventDefault();
  navigation.open(parking, () => { parking.scrollTop = 0; });
});
document.querySelector('[data-close-parking]')?.addEventListener('click', () => { if (parking) navigation.close(parking); });
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

// Clipboard writes must start inside the tap itself (Safari), so try first and report after.
const tryClipboard = (value: string) => navigator.clipboard?.writeText(value).then(() => true, () => false) ?? Promise.resolve(false);
function showCopyFallback(value: string) {
  const input = document.querySelector<HTMLInputElement>('#copy-value')!;
  navigation.open(copyDialog, () => { input.value = value; });
  input.focus();
  input.select();
}
async function copy(value: string, message: string) {
  if (await tryClipboard(value)) toast(message);
  else showCopyFallback(value);
}
document.querySelector('[data-close-copy]')?.addEventListener('click', () => navigation.close(copyDialog));
document.querySelectorAll<HTMLElement>('[data-copy]').forEach((button) => button.addEventListener('click', () => {
  void copy(button.dataset.copy || '', button.dataset.copyMessage || '복사했습니다.');
}));

type KakaoShareLink = { mobileWebUrl: string; webUrl: string };
type KakaoSDK = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: { sendDefault: (options: { objectType: 'feed'; content: { title: string; description: string; imageUrl: string; imageWidth?: number; imageHeight?: number; link: KakaoShareLink }; buttons: { title: string; link: KakaoShareLink }[] }) => void };
};
declare global { interface Window { Kakao?: KakaoSDK } }

// One 청첩장 공유하기 button opens a sheet: KakaoTalk (the rich card), other apps (the system share
// sheet, which can only carry a link) and 링크 복사. With nothing to choose between, it copies directly.
const shareUrl = () => {
  const url = new URL(window.location.href);
  url.hash = ''; url.search = '';
  return url.href;
};
const kakaoData = shareSheet?.dataset ?? {};
// Checked at tap time rather than on load, so it does not matter when the deferred SDK arrived.
const kakaoReady = () => Boolean(kakaoData.kakaoJsKey && window.Kakao);
const kakaoOption = shareSheet?.querySelector<HTMLButtonElement>('[data-share-kakao]');
const nativeOption = shareSheet?.querySelector<HTMLButtonElement>('[data-share-native]');
// Close the sheet (through its history entry) and only then run what comes next.
function afterSheetCloses(next: () => void) {
  if (!shareSheet?.open) return next();
  shareSheet.addEventListener('close', () => setTimeout(next, 0), { once: true });
  navigation.close(shareSheet);
}
document.querySelector('[data-share]')?.addEventListener('click', async () => {
  const canNative = typeof navigator.share === 'function';
  if (!shareSheet || (!kakaoReady() && !canNative)) {
    await copy(shareUrl(), '청첩장 링크를 복사했습니다.');
    return;
  }
  if (kakaoOption) kakaoOption.hidden = !kakaoReady();
  if (nativeOption) nativeOption.hidden = !canNative;
  navigation.open(shareSheet);
});
document.querySelector('[data-close-share]')?.addEventListener('click', () => { if (shareSheet) navigation.close(shareSheet); });
kakaoOption?.addEventListener('click', () => {
  const kakao = window.Kakao;
  const { kakaoJsKey, kakaoTitle, kakaoDescription, kakaoImage, kakaoImageWidth, kakaoImageHeight, kakaoUrl, kakaoMapUrl } = kakaoData;
  if (!kakao || !kakaoJsKey || !kakaoTitle || !kakaoDescription || !kakaoImage || !kakaoUrl || !kakaoMapUrl) return;
  if (!kakao.isInitialized()) kakao.init(kakaoJsKey);
  kakao.Share.sendDefault({
    objectType: 'feed',
    content: { title: kakaoTitle, description: kakaoDescription, imageUrl: kakaoImage, imageWidth: Number(kakaoImageWidth) || undefined, imageHeight: Number(kakaoImageHeight) || undefined, link: { mobileWebUrl: kakaoUrl, webUrl: kakaoUrl } },
    buttons: [
      { title: '청첩장 보기', link: { mobileWebUrl: kakaoUrl, webUrl: kakaoUrl } },
      { title: '위치 보기', link: { mobileWebUrl: kakaoMapUrl, webUrl: kakaoMapUrl } },
    ],
  });
  // Leave the hand-off to KakaoTalk a moment before touching history.
  setTimeout(() => { if (shareSheet) navigation.close(shareSheet); }, 600);
});
nativeOption?.addEventListener('click', async () => {
  try {
    await navigator.share({ title: document.title, text: '저희의 새로운 시작에 함께해 주세요.', url: shareUrl() });
    afterSheetCloses(() => {});
  } catch (error) {
    // Cancelling the system sheet keeps ours open; any other failure falls back to copying.
    if (error instanceof Error && error.name === 'AbortError') return;
    const url = shareUrl();
    afterSheetCloses(() => showCopyFallback(url));
  }
});
shareSheet?.querySelector('[data-share-copy]')?.addEventListener('click', async () => {
  const url = shareUrl();
  const copied = await tryClipboard(url);
  afterSheetCloses(() => (copied ? toast('청첩장 링크를 복사했습니다.') : showCopyFallback(url)));
});

const countdown = document.querySelector<HTMLElement>('[data-event-date]');
const countdownLabel = countdown?.querySelector<HTMLElement>('.countdown-label');
const countdownClock = countdown?.querySelector<HTMLElement>('.countdown-clock');
const countdownUnits = Object.fromEntries([...(countdown?.querySelectorAll<HTMLElement>('[data-unit]') ?? [])].map((el) => [el.dataset.unit!, el]));
// Live time left until the ceremony; on the day itself and afterwards, a short line instead.
function updateCountdown() {
  if (!countdown?.dataset.eventDate || !countdownLabel || !countdownClock) return;
  const ceremony = new Date(countdown.dataset.eventDate);
  const now = new Date();
  const left = ceremony.getTime() - now.getTime();
  const todayKorea = new Intl.DateTimeFormat('en-CA', { timeZone: countdown.dataset.timeZone || 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const sameDay = todayKorea.format(ceremony) === todayKorea.format(now);
  if (left > 0) {
    // Round up so the display reaches 00 exactly at the ceremony time, not a second early.
    const total = Math.ceil(left / 1000);
    const values = { d: Math.floor(total / 86400), h: Math.floor(total / 3600) % 24, m: Math.floor(total / 60) % 60, s: total % 60 };
    for (const [unit, value] of Object.entries(values)) {
      const text = unit === 'd' ? String(value) : String(value).padStart(2, '0');
      if (countdownUnits[unit] && countdownUnits[unit].textContent !== text) countdownUnits[unit].textContent = text;
    }
    countdownLabel.textContent = sameDay ? '오늘, 저희 결혼합니다' : '결혼식까지 남은 시간';
    countdownClock.hidden = false;
    countdownClock.setAttribute('aria-label', values.d + '일 ' + values.h + '시간 ' + values.m + '분 남았습니다');
    // Tick on the second boundary so the seconds change evenly.
    setTimeout(updateCountdown, 1000 - (Date.now() % 1000) + 5);
  } else {
    countdownLabel.textContent = sameDay ? '오늘, 저희 결혼합니다' : '함께해 주셔서 감사합니다';
    countdownClock.hidden = true;
  }
}
updateCountdown();

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

// Moments the guest should actually watch (the date digits, the ring round the day) start as soon as
// they are on screen, except during an automatic scroll such as 초대장 열기, where they wait until it
// has come to rest instead of playing mid-scroll.
const arriving = document.querySelectorAll<HTMLElement>('[data-arrive]');
if ('IntersectionObserver' in window) {
  let lastScroll = 0;
  window.addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  const whenSettled = (run: () => void) => {
    const check = () => (performance.now() - lastScroll > 140 ? run() : setTimeout(check, 60));
    setTimeout(check, 60);
  };
  const arrivals = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      arrivals.unobserve(entry.target);
      const arrive = () => entry.target.classList.add('is-arrived');
      if (performance.now() < autoScrollUntil) whenSettled(arrive); else arrive();
    }
  }, { threshold: .4 });
  arriving.forEach((el) => arrivals.observe(el));
} else {
  arriving.forEach((el) => el.classList.add('is-arrived'));
}

