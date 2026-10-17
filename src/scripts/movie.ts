// Interactions specific to the movie-theater design; everything shared (gallery, dialogs, copy, share,
// countdown, reveals) comes from invitation.ts, which this page loads as well.

// The VIP ticket flips over to show the showtime calendar and the live countdown.
const ticket = document.querySelector<HTMLButtonElement>('[data-ticket]');
const ticketWrap = ticket?.closest<HTMLElement>('.ticket-wrap');
ticket?.addEventListener('click', () => {
  ticketWrap?.classList.remove('is-peeking');
  const flipped = ticket.classList.toggle('is-flipped');
  ticket.setAttribute('aria-pressed', String(flipped));
  ticket.querySelector('.ticket-front')?.setAttribute('aria-hidden', String(flipped));
  ticket.querySelector('.ticket-back')?.setAttribute('aria-hidden', String(!flipped));
});

// Invite another flip whenever the guest returns to the ticket's part of the screen. The wider
// exit threshold prevents a toolbar resize or tiny scroll around the entry point from replaying it.
if (ticket && ticketWrap && 'IntersectionObserver' in window) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
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
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) ticketWrap.classList.remove('is-peeking');
  });
}

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
