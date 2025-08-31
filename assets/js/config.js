export const FRONT_URL = 'https://mimo050.github.io/xlop-cert-site';
export const BACKEND_URL = 'https://xlop-cert-site.onrender.com';
export const GBOX_BASE = 'https://gbox.example.com/install';

export function gboxLink({ udid, token, redirect }) {
  if (!GBOX_BASE) {
    console.error('GBOX_BASE is not configured');
    return '#';
  }

  const params = new URLSearchParams();
  if (udid) params.set('udid', udid);
  if (token) params.set('token', token);
  if (redirect) params.set('redirect', redirect);

  return `${GBOX_BASE}?${params.toString()}`;
}
