// One same-URL history entry per dialog. Swiping photos does not add entries.
export function createDialogNavigation(dialogs: HTMLDialogElement[]) {
  const key = '__ourSeasonDialog';
  const session = Math.random().toString(36).slice(2);
  type Entry = { dialog: HTMLDialogElement; restore: () => void; trigger: HTMLElement | null; x: number; y: number };
  const entries = new Map<number, Entry>();
  let sequence = 0;
  let active: Entry | undefined;
  let closing = false;

  // A reloaded page starts with its dialogs closed.
  if (history.state?.[key]) {
    const state = { ...history.state };
    delete state[key];
    history.replaceState(state, '');
  }

  function close(dialog: HTMLDialogElement) {
    if (!dialog.open || closing) return;
    const marker = history.state?.[key];
    if (marker?.session === session) {
      closing = true;
      history.back();
    } else {
      dialog.close();
    }
  }

  window.addEventListener('popstate', () => {
    closing = false;
    const marker = history.state?.[key];
    const next = marker?.session === session ? entries.get(marker.id) : undefined;
    const previous = active;
    active = next;
    for (const dialog of dialogs) {
      if (dialog.open && dialog !== next?.dialog) dialog.close();
    }
    if (next) {
      next.restore();
      if (!next.dialog.open) next.dialog.showModal();
    } else if (previous) {
      // Browsers restore persisted focus/scroll after popstate. Restore ours last.
      requestAnimationFrame(() => {
        if (active) return;
        previous.trigger?.focus({ preventScroll: true });
        window.scrollTo({ left: previous.x, top: previous.y, behavior: 'instant' });
      });
    }
  });

  for (const dialog of dialogs) {
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      close(dialog);
    });
  }

  return {
    open(dialog: HTMLDialogElement, restore = () => {}) {
      if (closing || dialog.open) return;
      const entry = {
        dialog, restore,
        trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        x: window.scrollX, y: window.scrollY,
      };
      entries.set(++sequence, entry);
      history.pushState({ ...history.state, [key]: { session, id: sequence } }, '');
      active = entry;
      restore();
      dialog.showModal();
    },
    close,
  };
}
