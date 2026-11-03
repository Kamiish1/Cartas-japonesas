// utils.js – helper utilities for Hiragana Cartas

/** Shuffle an array (Fisher–Yates) */
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Weighted random sample without replacement */
export function weightedSample(items, n, weightFn) {
  const pool = [...items];
  const result = [];
  while (result.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + weightFn(x), 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= weightFn(pool[idx]);
      if (r <= 0) break;
    }
    result.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
  }
  return result;
}

/** Simple spaced‑repetition scheduler (SRS) */
export function srsNextReview(item) {
  // item: { lastReview: timestamp, interval: days }
  const now = Date.now();
  const next = (item.lastReview || now) + (item.interval || 1) * 24 * 60 * 60 * 1000;
  return next;
}

/** Drag‑and‑drop helper for Phase 2 board */
export const DnD = {
  makeDraggable(el) {
    el.setAttribute('draggable', true);
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', el.dataset.kana);
      e.dataTransfer.effectAllowed = 'move';
    });
  },
  makeDropZone(zone, onDrop) {
    zone.addEventListener('dragover', e => e.preventDefault());
    zone.addEventListener('drop', e => {
      e.preventDefault();
      const kana = e.dataTransfer.getData('text/plain');
      onDrop(kana, zone);
    });
  },
};
