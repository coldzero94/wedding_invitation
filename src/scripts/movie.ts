// Interactions specific to the movie-theater design; everything shared (gallery, dialogs, copy, share,
// countdown, reveals) comes from invitation.ts, which this page loads as well.

// The VIP ticket flips over to show the showtime calendar and the live countdown.
const ticket = document.querySelector<HTMLButtonElement>('[data-ticket]');
const ticketWrap = ticket?.closest<HTMLElement>('.ticket-wrap');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let arrivalFrame = 0;
let arrivalTimer = 0;
const paperFlips = new Map<HTMLElement, () => void>();
function stopTicketArrival() {
  cancelAnimationFrame(arrivalFrame);
  clearTimeout(arrivalTimer);
  ticket?.classList.remove('is-back-arriving');
  [...paperFlips.values()].forEach((stop) => stop());
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

// Fold the old upper half away, then unfold the new lower half. The static live number underneath
// already contains the new value; the three temporary paper leaves are hidden from screen readers.
function flipPaperNumber(number: HTMLElement, previous: string, next: string) {
  paperFlips.get(number)?.();
  const panel = number.closest('.flip-number');
  if (!panel) return;
  const sheet = (classes: string, value: string) => {
    const leaf = document.createElement('span');
    leaf.className = 'flip-sheet ' + classes;
    leaf.setAttribute('aria-hidden', 'true');
    const ink = document.createElement('span');
    ink.textContent = value;
    leaf.append(ink);
    panel.append(leaf);
    return leaf;
  };
  const oldBottom = sheet('flip-sheet--bottom', previous);
  const oldTop = sheet('flip-sheet--top', previous);
  const newBottom = sheet('flip-sheet--bottom flip-sheet--incoming', next);
  const animations = [
    oldTop.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], { duration: 260, easing: 'cubic-bezier(.55, 0, 1, .45)', fill: 'forwards' }),
    newBottom.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: 260, delay: 260, easing: 'cubic-bezier(0, .55, .45, 1)', fill: 'both' }),
  ];
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    animations.forEach((animation) => animation.cancel());
    [oldBottom, oldTop, newBottom].forEach((leaf) => leaf.remove());
    paperFlips.delete(number);
  };
  paperFlips.set(number, stop);
  void Promise.all(animations.map((animation) => animation.finished)).then(stop, stop);
}

// Observe real countdown changes on either face so a later flip starts with current values.
const ticketClock = ticket?.querySelector('.countdown-clock');
if (ticket && ticketClock) {
  const previousValues = new WeakMap<HTMLElement, string>();
  ticketClock.querySelectorAll<HTMLElement>('.countdown-num').forEach((number) => previousValues.set(number, number.textContent ?? ''));
  new MutationObserver((records) => {
    const changed = new Set<HTMLElement>();
    records.forEach(({ target }) => {
      const element = target instanceof Element ? target : target.parentElement;
      const number = element?.closest<HTMLElement>('.countdown-num');
      if (number) changed.add(number);
    });
    changed.forEach((number) => {
      const next = number.textContent ?? '';
      const previous = previousValues.get(number) ?? next;
      previousValues.set(number, next);
      if (previous === next || !ticket.classList.contains('is-flipped') || ticket.classList.contains('is-back-arriving') || reduceMotion.matches) return;
      flipPaperNumber(number, previous, next);
    });
  }).observe(ticketClock, { childList: true, characterData: true, subtree: true });
}

// Observe the stationary wrapper, so the paper's own nudge cannot trigger another viewport entry.
// Touch screens also get an occasional reminder while reading; desktop pointers replay it on hover.
if (ticket && ticketWrap) {
  const hoverPointer = matchMedia('(hover: hover) and (pointer: fine)');
  let armed = true;
  let inView = false;
  let reminder = 0;
  let pendingHint = 0;
  let hintFrame = 0;
  let lastTap = -Infinity;
  function stopHint() {
    clearTimeout(pendingHint);
    cancelAnimationFrame(hintFrame);
    ticketWrap!.classList.remove('is-peeking');
  }
  function playHint(fromPointer = false) {
    if ((!inView && !fromPointer) || reduceMotion.matches || document.hidden) return;
    stopHint();
    const settling = 900 - (performance.now() - lastTap);
    if (settling > 0) {
      pendingHint = window.setTimeout(() => playHint(fromPointer), Math.ceil(settling));
      return;
    }
    // Two frames let WebKit finish removing the previous animation before replaying it.
    hintFrame = requestAnimationFrame(() => {
      hintFrame = requestAnimationFrame(() => ticketWrap!.classList.add('is-peeking'));
    });
  }
  function scheduleReminder() {
    clearTimeout(reminder);
    if (!inView || hoverPointer.matches || reduceMotion.matches || document.hidden) return;
    reminder = window.setTimeout(() => {
      playHint();
      scheduleReminder();
    }, 7000);
  }
  if ('IntersectionObserver' in window) {
    const hints = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio <= .4) {
          inView = false;
          armed = true;
          clearTimeout(reminder);
          stopHint();
        }
        if (!entry.isIntersecting || entry.intersectionRatio < .6) continue;
        inView = true;
        if (armed) {
          armed = false;
          playHint();
          scheduleReminder();
        }
      }
    }, { rootMargin: '-10% 0px -10% 0px', threshold: [0, .4, .6] });
    hints.observe(ticketWrap);
  }
  ticket.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse' && hoverPointer.matches) playHint(true);
  });
  ticket.addEventListener('click', () => {
    lastTap = performance.now();
    stopHint();
    scheduleReminder();
  });
  ticket.addEventListener('animationend', (event) => {
    if (event.animationName === 'ticket-peek') stopHint();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopHint();
    scheduleReminder();
  });
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) stopHint();
    scheduleReminder();
  });
  hoverPointer.addEventListener('change', scheduleReminder);
  window.addEventListener('pagehide', () => {
    clearTimeout(reminder);
    stopHint();
  });
  window.addEventListener('pageshow', scheduleReminder);
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
