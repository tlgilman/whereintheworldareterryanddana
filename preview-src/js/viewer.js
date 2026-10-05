// The full-size photo viewer: a native <dialog>, so the browser handles focus, Escape and the backdrop.

/**
 * dialog: the <dialog> element from the page. onShowOnGlobe(photo) runs when the visitor asks to see where a photo was taken.
 * Returns { open(photos, startIndex) } where each photo is { thumb, large, caption, label }.
 */
export function createViewer(dialog, { onShowOnGlobe }) {
  const q = sel => dialog.querySelector(sel);
  const img = q('.vimg'), hand = q('.vhand'), cap = q('.vcap'), count = q('.vcount');
  const prev = q('.vprev'), next = q('.vnext'), close = q('.vclose'), go = q('.vgo');
  let list = [], index = 0, token = 0;

  function show(i) {
    index = (i + list.length) % list.length;
    const photo = list[index], mine = ++token;
    img.alt = photo.caption || photo.label;
    img.referrerPolicy = photo.remote ? 'no-referrer' : '';
    img.src = photo.thumb;                                   // the small copy first (often already loaded), so something shows at once
    const big = new Image();
    if (photo.remote) big.referrerPolicy = 'no-referrer';
    big.onload = () => { if (mine === token) img.src = photo.large; };
    big.src = photo.large;
    hand.textContent = photo.label;
    cap.textContent = photo.caption || '';
    cap.hidden = !photo.caption || photo.caption === photo.label;
    count.textContent = list.length > 1 ? `${index + 1} of ${list.length}` : '';
    prev.hidden = next.hidden = list.length < 2;
    if (list.length > 1) {                                   // have the next one ready
      const coming = list[(index + 1) % list.length], ahead = new Image();
      if (coming.remote) ahead.referrerPolicy = 'no-referrer';
      ahead.src = coming.large;
    }
  }

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  close.addEventListener('click', () => dialog.close());
  go.addEventListener('click', () => { const photo = list[index]; dialog.close(); onShowOnGlobe(photo); });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });     // a click on the backdrop
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { show(index - 1); event.preventDefault(); }
    if (event.key === 'ArrowRight') { show(index + 1); event.preventDefault(); }
  });
  dialog.addEventListener('close', () => { token++; document.documentElement.classList.remove('viewing'); });

  // swipe left or right on a touch screen
  let startX = null;
  img.addEventListener('pointerdown', event => { startX = event.clientX; });
  img.addEventListener('pointerup', event => {
    if (startX == null || list.length < 2) return;
    const dx = event.clientX - startX; startX = null;
    if (Math.abs(dx) > 48) show(index + (dx < 0 ? 1 : -1));
  });
  img.addEventListener('pointercancel', () => { startX = null; });

  return {
    open(photos, startIndex = 0) {
      if (!photos.length) return;
      if (typeof dialog.showModal !== 'function') {            // a browser from before 2022: open the photo on its own instead
        window.open(photos[startIndex].large, '_blank', 'noopener');
        return;
      }
      list = photos;
      document.documentElement.classList.add('viewing');
      show(startIndex);                                        // before opening, so focus does not land on a button about to be hidden
      if (!dialog.open) dialog.showModal();
      (list.length > 1 ? next : close).focus();
    },
  };
}
