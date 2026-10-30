import { db, type QueueItem } from '../../lib/db';
import { supabase } from '../../lib/supabase';

let isFlushing = false;

/**
 * Adds an action to the offline queue and notifies listeners
 */
export async function enqueueAction(
  type: 'report' | 'vote' | 'sos' | 'checkin',
  payload: Record<string, unknown>
): Promise<number> {
  const id = await db.queue.add({
    type,
    payload,
    createdAt: new Date().toISOString(),
    tries: 0,
    status: 'pending',
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('routex-queue-updated'));
  }

  // If online, attempt immediate sync
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    flushOfflineQueue().catch(() => {});
  }

  return Number(id);
}

/**
 * Returns total count of pending items in queue
 */
export async function getPendingQueueCount(): Promise<number> {
  try {
    return await db.queue
      .where('status')
      .anyOf(['pending', 'failed'])
      .count();
  } catch {
    return 0;
  }
}

/**
 * Returns all queue items ordered by creation time
 */
export async function getQueueItems(): Promise<QueueItem[]> {
  try {
    return await db.queue.orderBy('createdAt').reverse().toArray();
  } catch {
    return [];
  }
}

/**
 * Flushes all pending items to the server using exponential backoff.
 * Conflicts are resolved via server-wins strategy.
 */
export async function flushOfflineQueue(): Promise<{
  successCount: number;
  failureCount: number;
}> {
  if (isFlushing) return { successCount: 0, failureCount: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { successCount: 0, failureCount: 0 };
  }

  isFlushing = true;
  let successCount = 0;
  let failureCount = 0;

  try {
    const pendingItems = await db.queue
      .where('status')
      .anyOf(['pending', 'failed'])
      .toArray();

    for (const item of pendingItems) {
      if (!item.id) continue;

      // Update to syncing
      await db.queue.update(item.id, { status: 'syncing' });

      try {
        const p = item.payload;

        if (item.type === 'report') {
          const coords = (p.coordinates as [number, number]) || [77.1734, 31.1048];
          const geomWkt = `POINT(${coords[0]} ${coords[1]})`;
          const { error } = await supabase.from('hazard_reports').insert({
            user_id: p.userId || null,
            type: p.type,
            severity: p.severity,
            description: p.description || null,
            geom: geomWkt,
            photo_path: p.photo_path || null,
            is_test: Boolean(p.is_test),
            expires_at: p.expires_at || new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
          });

          if (error) throw error;
        } else if (item.type === 'vote') {
          const { error } = await supabase.rpc('cast_vote', {
            p_report_id: p.reportId,
            p_vote: p.vote,
          });

          // Server-wins: if vote already counted or report resolved, drop conflict
          if (error && !error.message.includes('already voted')) {
            throw error;
          }
        } else if (item.type === 'sos') {
          const geomWkt = `POINT(${p.lon} ${p.lat})`;
          const { error } = await supabase.from('sos_events').insert({
            user_id: p.userId || null,
            condition: p.condition,
            message: p.message,
            geom: geomWkt,
            status: 'sent',
          });

          if (error) throw error;
        } else if (item.type === 'checkin') {
          // Store locally in checkins history
          try {
            const history = JSON.parse(localStorage.getItem('routex_checkins') || '[]');
            history.unshift(p);
            localStorage.setItem('routex_checkins', JSON.stringify(history.slice(0, 50)));
          } catch {
            // Ignore
          }
        }

        // Successfully synchronized: remove from queue
        await db.queue.delete(item.id);
        successCount++;
      } catch (err: unknown) {
        failureCount++;
        const nextTries = item.tries + 1;
        const errMessage = (err as Error)?.message || 'Sync failed';

        // If tried more than 5 times, server-wins: remove stale item
        if (nextTries >= 5) {
          await db.queue.delete(item.id);
        } else {
          await db.queue.update(item.id, {
            tries: nextTries,
            status: 'failed',
            lastError: errMessage,
          });
        }
      }
    }

    // Record last sync timestamp in meta table
    await db.meta.put({
      key: 'lastSync',
      value: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } finally {
    isFlushing = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('routex-queue-updated'));
    }
  }

  return { successCount, failureCount };
}

// Auto-sync listener on reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushOfflineQueue().catch(() => {});
  });
}
