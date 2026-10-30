import type { RouteXAlert } from './types';

const NOTIFIED_CACHE_KEY = 'routex_notified_alerts_v1';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // Ignore restricted storage errors
  }
  return null;
}

/**
 * Retrieves the set of alert IDs that have already been notified
 * to ensure alerts fire strictly once per change (no spam).
 */
export function getNotifiedAlertIds(): Set<string> {
  try {
    const storage = getStorage();
    if (!storage) return new Set();
    const raw = storage.getItem(NOTIFIED_CACHE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Records an alert ID in persistent storage so it will not fire repeatedly.
 */
export function markAlertAsNotified(alertId: string): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const set = getNotifiedAlertIds();
    set.add(alertId);
    // Keep max 200 recent IDs to avoid unbound growth
    const arr = Array.from(set).slice(-200);
    storage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(arr));
  } catch (err) {
    console.warn('[notificationService] Failed to cache notified alert ID:', err);
  }
}

/**
 * Checks whether the browser has granted notification permissions.
 */
export function hasNotificationPermission(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Prompts the user to grant browser notification permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.warn('[notificationService] Notification permission request error:', err);
    return false;
  }
}

/**
 * Dispatches an alert notification:
 * 1. Checks deduplication cache - skips if already notified.
 * 2. Emits an in-app custom event `routex:alert` for Toast rendering.
 * 3. Sends a HTML5 browser Notification if granted.
 *
 * Returns true if newly notified, false if skipped as duplicate.
 */
export function dispatchAlertNotification(alert: RouteXAlert): boolean {
  const notifiedSet = getNotifiedAlertIds();
  if (notifiedSet.has(alert.id)) {
    return false;
  }

  // 1. Mark as notified so it never fires twice for this exact change
  markAlertAsNotified(alert.id);

  // 2. In-app event for Global Toast banner
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('routex:alert', {
        detail: alert,
      })
    );
  }

  // 3. Native Browser Notification (if permission granted)
  if (hasNotificationPermission()) {
    try {
      new Notification(`[RouteX Alert] ${alert.title}`, {
        body: alert.description,
        icon: '/favicon.svg',
        tag: alert.id,
      });
    } catch (err) {
      console.warn('[notificationService] Native Notification display failed:', err);
    }
  }

  return true;
}
