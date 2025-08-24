export const FRONT_URL = '';
export const BACKEND_URL = '';
export const PAY_LINK_CARD = '';
export const PAY_LINK_APPLE = '';
export const GBOX_BASE = '';

export function gboxLink({ udid, token, redirect }) {
  const params = new URLSearchParams();
  if (udid) params.set('udid', udid);
  if (token) params.set('token', token);
  if (redirect) params.set('redirect', redirect);
  return `${GBOX_BASE}?${params.toString()}`;
}
