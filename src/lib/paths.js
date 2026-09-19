// The portal is served from a sub-path on GitHub Pages
// (https://<org>.github.io/herosPortal/) and from the root locally. Vite
// injects the configured `base` as import.meta.env.BASE_URL ('/' or
// '/herosPortal/'); React Router gets it as its basename, so every <Route>,
// <Link> and navigate() stays app-relative. These helpers cover the few
// places that bypass the router: static assets in /public and hard
// window.location navigations.
export const BASE_PATH = String(import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

// asset('logo/crispr-logo.svg') -> '/logo/crispr-logo.svg' or '/herosPortal/logo/crispr-logo.svg'
export function asset(path) {
  return `${BASE_PATH}/${String(path).replace(/^\/+/, '')}`;
}

// Browser URL for an app-relative path, for window.location.assign/replace.
export function href(appPath) {
  return `${BASE_PATH}${appPath}`;
}

// Current app-relative pathname (window.location.pathname minus the base).
export function currentAppPath() {
  const { pathname } = window.location;
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) return pathname.slice(BASE_PATH.length) || '/';
  return pathname;
}
