/**
 * Cookie utility functions for client-side cookie management
 */

/**
 * Gets a cookie value by name (client-side only)
 * @param name - Cookie name to retrieve
 * @returns Cookie value or null if not found or on server-side
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Sets a cookie with specified name and value
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options (expires, path, etc.)
 */
export function setCookie(name: string, value: string, options: {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
} = {}): void {
  if (typeof document === 'undefined') return;

  let cookieString = `${name}=${value}`;

  if (options.expires) {
    cookieString += `; expires=${options.expires.toUTCString()}`;
  }
  if (options.maxAge) {
    cookieString += `; max-age=${options.maxAge}`;
  }
  if (options.path) {
    cookieString += `; path=${options.path}`;
  }
  if (options.domain) {
    cookieString += `; domain=${options.domain}`;
  }
  if (options.secure) {
    cookieString += `; secure`;
  }
  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`;
  }

  document.cookie = cookieString;
}

/**
 * Removes a cookie by setting its expiration date to the past
 * @param name - Cookie name to remove
 * @param path - Cookie path (defaults to '/')
 */
export function removeCookie(name: string, path: string = '/'): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
}