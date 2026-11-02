/** Keep a practice screen inside the area left visible by browser chrome/keyboard. */
export function bindPracticeViewport(win: Window, doc: Document) {
  const root = doc.documentElement;
  const viewport = win.visualViewport;
  let baselineWidth = win.innerWidth;
  let baselineHeight = win.innerHeight;
  let frame = 0;
  function update() {
    frame = 0;
    // Pinch zoom must keep normal browser panning, rather than resizing the app.
    if (viewport && Math.abs(viewport.scale - 1) > .01) return;
    const height = Math.round(viewport?.height ?? win.innerHeight);
    if (!height) return;
    if (Math.abs(win.innerWidth - baselineWidth) > 80) {
      baselineWidth = win.innerWidth;
      baselineHeight = win.innerHeight;
    }
    baselineHeight = Math.max(baselineHeight, win.innerHeight, height);
    const editing = doc.activeElement?.matches('input:not([type=range]):not([type=checkbox]), textarea, [contenteditable=true]') ?? false;
    root.style.setProperty('--practice-height', `${height}px`);
    root.style.setProperty('--practice-top', `${Math.round(viewport?.offsetTop ?? 0)}px`);
    root.dataset.practiceKeyboard = String(editing && baselineHeight - height > 120);
  }
  function schedule() { if (!frame) frame = win.requestAnimationFrame(update); }
  viewport?.addEventListener('resize', schedule);
  viewport?.addEventListener('scroll', schedule);
  win.addEventListener('resize', schedule);
  doc.addEventListener('focusin', schedule);
  doc.addEventListener('focusout', schedule);
  update();
  return () => {
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    win.removeEventListener('resize', schedule);
    doc.removeEventListener('focusin', schedule);
    doc.removeEventListener('focusout', schedule);
    if (frame) win.cancelAnimationFrame(frame);
    root.style.removeProperty('--practice-height');
    root.style.removeProperty('--practice-top');
    delete root.dataset.practiceKeyboard;
  };
}

export function focusAnswerOnDesktop(input: HTMLInputElement | null) {
  if (window.matchMedia('(min-width: 761px) and (pointer: fine)').matches) input?.focus({ preventScroll: true });
}
