import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadSiteContent } from "./lib/content";
import "./index.css";

const root = document.getElementById("root");

/**
 * As in the Pakka build: on laptops and larger the whole public website is laid out for a 1440 x 850 screen and
 * scaled (CSS zoom) to the window, between 0.7 and 2.4. Phones and tablets use their own layout.
 *
 * Not on the admin panel (/admin) or the trip report opened by QR (/r/...): those are work screens with their own
 * layout built on the window height (100vh), which a zoomed page shrinks or stretches in current browsers (the
 * menu and grey background stopped short of the bottom of the window).
 */
const unzoomed = () => /^\/(admin|r)(\/|$)/.test(window.location.pathname);
function fitToScreen() {
  const w = document.documentElement.clientWidth;
  const h = window.innerHeight;
  const z = w >= 1024 && !unzoomed() ? Math.max(0.7, Math.min(Math.max(w, 1440) / 1440, h / 850, 2.4)) : 1;
  root.style.zoom = Math.abs(z - 1) < 0.005 ? "" : z.toFixed(4);
}
fitToScreen();
window.addEventListener("resize", fitToScreen);
// Moving between the website and the admin panel happens without a page load: re-check on every navigation.
window.addEventListener("popstate", fitToScreen);
for (const method of ["pushState", "replaceState"]) {
  const original = history[method].bind(history);
  history[method] = (...args) => {
    const result = original(...args);
    fitToScreen();
    return result;
  };
}

// Apply the content saved in the admin panel first, then load the app, so modules that read the content when
// they are imported (links, route lists...) see the saved version.
loadSiteContent()
  .then(() => import("./App"))
  .then(({ default: App }) =>
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
