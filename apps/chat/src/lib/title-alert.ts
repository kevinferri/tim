const FLASH_INTERVAL_MS = 1500;

let timer: ReturnType<typeof setInterval> | null = null;
let alertTitle: string | null = null;
// The page's own title (e.g. the "(3) Topic" unread count), picked up again whenever it changes.
let pageTitle = "";

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  if (alertTitle !== null && document.title === alertTitle) {
    document.title = pageTitle;
  }
  alertTitle = null;
}

// Alternates the tab title with `message` until the window is focused again. No-op while focused.
export function flashTitle(message: string) {
  if (document.hasFocus()) return;
  stop();
  alertTitle = message;
  pageTitle = document.title;

  const tick = () => {
    if (document.title !== alertTitle) {
      pageTitle = document.title;
      document.title = alertTitle!;
    } else {
      document.title = pageTitle;
    }
  };

  tick();
  timer = setInterval(tick, FLASH_INTERVAL_MS);
  window.addEventListener("focus", stop, { once: true });
}
