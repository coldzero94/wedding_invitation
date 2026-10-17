// Interactions specific to the movie-theater design; everything shared (gallery, dialogs, copy, share,
// countdown, reveals) comes from invitation.ts, which this page loads as well.

// The VIP ticket flips over to show the showtime calendar and the live countdown.
const ticket = document.querySelector<HTMLButtonElement>('[data-ticket]');
const ticketWrap = ticket?.closest<HTMLElement>('.ticket-wrap');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let arrivalFrame = 0;
let arrivalTimer = 0;
function stopTicketArrival() {
  cancelAnimationFrame(arrivalFrame);
  clearTimeout(arrivalTimer);
  ticket?.classList.remove('is-back-arriving');
  ticket?.querySelectorAll<HTMLElement>('.countdown-num').forEach((number) => number.getAnimations().forEach((animation) => animation.cancel()));
}
ticket?.addEventListener('click', () => {
  stopTicketArrival();
  ticketWrap?.classList.remove('is-peeking');
  const flipped = ticket.classList.toggle('is-flipped');
  ticket.setAttribute('aria-pressed', String(flipped));
  ticket.querySelector('.ticket-front')?.setAttribute('aria-hidden', String(flipped));
  ticket.querySelector('.ticket-back')?.setAttribute('aria-hidden', String(!flipped));
  if (flipped && !reduceMotion.matches) {
    arrivalFrame = requestAnimationFrame(() => {
      ticket.classList.add('is-back-arriving');
      arrivalTimer = window.setTimeout(() => ticket.classList.remove('is-back-arriving'), 1450);
    });
  }
});

// Roll only digits that actually changed, while the back is visible. The shared countdown remains
// the source of truth; no fake intermediate numbers are written into its timer or accessible text.
const ticketClock = ticket?.querySelector('.countdown-clock');
if (ticket && ticketClock) {
  new MutationObserver((records) => {
    if (!ticket.classList.contains('is-flipped') || ticket.classList.contains('is-back-arriving') || reduceMotion.matches) return;
    const changed = new Set<HTMLElement>();
    records.forEach(({ target }) => {
      const element = target instanceof Element ? target : target.parentElement;
      const number = element?.closest<HTMLElement>('.countdown-num');
      if (number) changed.add(number);
    });
    changed.forEach((number) => {
      number.getAnimations().forEach((animation) => animation.cancel());
      number.animate([{ opacity: .25, transform: 'translateY(30%)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    });
  }).observe(ticketClock, { childList: true, characterData: true, subtree: true });
}

// Invite another flip whenever the guest returns to the ticket's part of the screen. The wider
// exit threshold prevents a toolbar resize or tiny scroll around the entry point from replaying it.
if (ticket && ticketWrap && 'IntersectionObserver' in window) {
  let armed = true;
  const hints = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio <= .2) {
        armed = true;
        ticketWrap.classList.remove('is-peeking');
      }
      if (!entry.isIntersecting || entry.intersectionRatio < .65 || !armed || reduceMotion.matches) continue;
      armed = false;
      ticketWrap.classList.add('is-peeking');
    }
  }, { rootMargin: '-12% 0px -12% 0px', threshold: [0, .2, .65] });
  hints.observe(ticket);
  ticket.addEventListener('animationend', (event) => {
    if (event.animationName === 'ticket-peek') ticketWrap.classList.remove('is-peeking');
  });
}
reduceMotion.addEventListener('change', () => {
  if (!reduceMotion.matches) return;
  ticketWrap?.classList.remove('is-peeking');
  stopTicketArrival();
});

// Post-credit scene: a blurred photo that plays (sharpens) when tapped.
const cookie = document.querySelector<HTMLButtonElement>('[data-cookie]');
const cookieNote = document.querySelector<HTMLElement>('.cookie-note');
const cookieText = document.querySelector<HTMLTemplateElement>('[data-cookie-note]')?.content.textContent?.trim() ?? '';
cookie?.addEventListener('click', () => {
  if (cookie.classList.contains('is-open')) return;
  cookie.classList.add('is-open');
  cookie.setAttribute('aria-pressed', 'true');
  if (cookieNote) cookieNote.textContent = cookieText;
});
