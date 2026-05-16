/**
 * Auth utilities — JWT token management and API fetch wrapper.
 */

const TOKEN_KEY = 'hanzi_auth_token';
const USER_KEY = 'hanzi_auth_user';

/** Store auth data after login */
export function setAuth(token: string, user: { id: number; email: string; name: string }): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Get JWT token */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Get stored user info */
export function getUser(): { id: number; email: string; name: string } | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

/** Check if user is authenticated */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  // Basic JWT expiry check (decode payload)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/** Logout — clear token and redirect to login */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '/login.html';
}

/** Auth guard — redirect to login if not authenticated */
export function requireAuth(): void {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
  }
}

/**
 * Fetch wrapper that adds Authorization header.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...options, headers });
}

/**
 * Login API call.
 */
export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Login failed' };
    }

    setAuth(data.token, data.user);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Network error: ' + err.message };
  }
}
