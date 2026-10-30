import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNotifiedAlertIds,
  markAlertAsNotified,
  dispatchAlertNotification,
} from './notificationService';
import type { RouteXAlert } from './types';

// Mock storage for testing environment
const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

describe('Alerts & Notifications Engine (P14)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records notified alert IDs and retrieves them accurately', () => {
    expect(getNotifiedAlertIds().size).toBe(0);

    markAlertAsNotified('alert-101');
    expect(getNotifiedAlertIds().has('alert-101')).toBe(true);

    markAlertAsNotified('alert-102');
    expect(getNotifiedAlertIds().size).toBe(2);
  });

  it('ensures notifications fire strictly once per change (no spam)', () => {
    const alert: RouteXAlert = {
      id: 'route-hazard-test-1',
      category: 'hazard_report',
      severity: 'critical',
      title: 'Active Landslide on NH5',
      description: 'Verified debris flow blocking both lanes near Shimla bypass.',
      source: 'Verified Community Report',
      timestamp: 'Just now',
      targetType: 'saved_route',
      targetLabel: 'Shimla → Manali',
    };

    // First dispatch: should fire and return true
    const firstDispatch = dispatchAlertNotification(alert);
    expect(firstDispatch).toBe(true);
    expect(getNotifiedAlertIds().has('route-hazard-test-1')).toBe(true);

    // Second dispatch with same alert ID: should be blocked by deduplication (returns false)
    const secondDispatch = dispatchAlertNotification(alert);
    expect(secondDispatch).toBe(false);
  });

  it('allows separate alerts for different changes or levels', () => {
    const alert1: RouteXAlert = {
      id: 'route-risk-increase-route1-High',
      category: 'risk_increased',
      severity: 'high',
      title: 'Risk Increased to High',
      description: 'Corridor risk level escalated from Moderate to High.',
      source: 'RouteX Risk Engine',
      timestamp: 'Just now',
      targetType: 'saved_route',
    };

    const alert2: RouteXAlert = {
      id: 'route-risk-increase-route1-Severe',
      category: 'risk_increased',
      severity: 'critical',
      title: 'Risk Increased to Severe',
      description: 'Corridor risk level escalated to Severe due to heavy rain.',
      source: 'RouteX Risk Engine',
      timestamp: 'Just now',
      targetType: 'saved_route',
    };

    expect(dispatchAlertNotification(alert1)).toBe(true);
    expect(dispatchAlertNotification(alert2)).toBe(true);
    expect(getNotifiedAlertIds().size).toBe(2);
  });
});
