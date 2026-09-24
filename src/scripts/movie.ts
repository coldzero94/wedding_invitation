// Interactions specific to the movie-theater design; everything shared (gallery, dialogs, copy, share,
// countdown, reveals) comes from invitation.ts, which this page loads as well.

// The VIP ticket flips over to show the showtime calendar and the live countdown.
const ticket = document.querySelector<HTMLButtonElement>('[data-ticket]');
ticket?.addEventListener('click', () => {
  const flipped = ticket.classList.toggle('is-flipped');
  ticket.setAttribute('aria-pressed', String(flipped));
  // Once the guest has found the flip, the hint has done its job.
  ticket.closest('.ticket-wrap')?.classList.add('was-flipped');
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
