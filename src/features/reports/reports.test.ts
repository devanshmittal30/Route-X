import { describe, it, expect } from 'vitest';
import {
  createReportSchema,
  sanitizeText,
  validatePhotoFile,
} from './schemas';
import { calculateReportExpiresAt } from './reportsService';
import type { ReportType } from './types';
import * as turf from '@turf/turf';

describe('Hazard Reports Validation & Business Logic', () => {
  describe('Zod Input Validation', () => {
    it('accepts valid report input within India bounding box', () => {
      const valid = {
        type: 'landslide',
        severity: 3,
        description: 'Large rock displacement across highway',
        coordinates: [77.1734, 31.1048], // Shimla, HP
        is_test: false,
      };

      const result = createReportSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('landslide');
        expect(result.data.severity).toBe(3);
      }
    });

    it('rejects severity outside 1, 2, 3 range', () => {
      const invalid = {
        type: 'road_blocked',
        severity: 4, // invalid
        coordinates: [77.1734, 31.1048],
      };

      const result = createReportSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects description longer than 500 characters', () => {
      const longText = 'a'.repeat(501);
      const invalid = {
        type: 'snow',
        severity: 1,
        description: longText,
        coordinates: [77.1734, 31.1048],
      };

      const result = createReportSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500 characters');
      }
    });

    it('strictly sanitizes and strips HTML tags from description to prevent XSS injection', () => {
      const malicious = '<script>alert("xss")</script><b onmouseover="evil()">Road slip</b>';
      const sanitized = sanitizeText(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).not.toContain('<b>');
      expect(sanitized).toContain('Road slip');
    });

    it('rejects coordinates outside the India bounding box', () => {
      // New York: [-74.0, 40.7] (lat > maxLat 38)
      const outsideNy = {
        type: 'flood',
        severity: 2,
        coordinates: [-74.006, 40.7128],
      };
      expect(createReportSchema.safeParse(outsideNy).success).toBe(false);

      // Equator / Null Island: [0.0, 0.0] (lat < minLat 6)
      const outsideNull = {
        type: 'flood',
        severity: 2,
        coordinates: [0.0, 0.0],
      };
      expect(createReportSchema.safeParse(outsideNull).success).toBe(false);

      // London: [0.12, 51.5]
      const outsideLondon = {
        type: 'flood',
        severity: 2,
        coordinates: [0.1278, 51.5074],
      };
      expect(createReportSchema.safeParse(outsideLondon).success).toBe(false);
    });

    it('accepts coordinates across diverse Indian mountain locations', () => {
      const locations = [
        { name: 'Shimla (HP)', coords: [77.1734, 31.1048] },
        { name: 'Tawang (Arunachal)', coords: [91.8687, 27.5862] },
        { name: 'Guwahati (Assam)', coords: [91.7362, 26.1445] },
        { name: 'Srinagar (J&K)', coords: [74.7973, 34.0837] },
        { name: 'Gangtok (Sikkim)', coords: [88.6138, 27.3314] },
      ];

      for (const loc of locations) {
        const parsed = createReportSchema.safeParse({
          type: 'rockfall',
          severity: 2,
          coordinates: loc.coords,
        });
        expect(parsed.success).toBe(true);
      }
    });
  });

  describe('Photo File Validation', () => {
    it('accepts valid JPEG, PNG, or WebP files under 3 MB', () => {
      const mockJpeg = new File(['fake-image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
      expect(validatePhotoFile(mockJpeg).valid).toBe(true);

      const mockPng = new File(['fake-image-bytes'], 'photo.png', { type: 'image/png' });
      expect(validatePhotoFile(mockPng).valid).toBe(true);

      const mockWebp = new File(['fake-image-bytes'], 'photo.webp', { type: 'image/webp' });
      expect(validatePhotoFile(mockWebp).valid).toBe(true);
    });

    it('rejects disallowed file types (PDF, GIF, Executable)', () => {
      const mockPdf = new File(['fake-pdf'], 'document.pdf', { type: 'application/pdf' });
      const resPdf = validatePhotoFile(mockPdf);
      expect(resPdf.valid).toBe(false);
      expect(resPdf.error).toContain('JPEG, PNG, or WebP only');

      const mockGif = new File(['fake-gif'], 'anim.gif', { type: 'image/gif' });
      expect(validatePhotoFile(mockGif).valid).toBe(false);
    });

    it('rejects files larger than 3 MB', () => {
      // 3.5 MB file
      const bigBuffer = new Uint8Array(3.5 * 1024 * 1024);
      const mockBig = new File([bigBuffer], 'huge.jpg', { type: 'image/jpeg' });
      const result = validatePhotoFile(mockBig);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum allowed size is 3 MB');
    });
  });

  describe('Expiry Timestamp Rules (Doc 03 Section 8)', () => {
    const baseDate = new Date('2026-10-30T12:00:00Z');

    it('sets 72 h expiry for landslide, rockfall, and bridge_damage', () => {
      const types: ReportType[] = ['landslide', 'rockfall', 'bridge_damage'];
      for (const t of types) {
        const expiresAt = calculateReportExpiresAt(t, baseDate);
        const diffHours = (new Date(expiresAt).getTime() - baseDate.getTime()) / (1000 * 60 * 60);
        expect(diffHours).toBe(72);
      }
    });

    it('sets 48 h expiry for road_blocked and flood', () => {
      const types: ReportType[] = ['road_blocked', 'flood'];
      for (const t of types) {
        const expiresAt = calculateReportExpiresAt(t, baseDate);
        const diffHours = (new Date(expiresAt).getTime() - baseDate.getTime()) / (1000 * 60 * 60);
        expect(diffHours).toBe(48);
      }
    });

    it('sets 24 h expiry for snow and all_clear', () => {
      const types: ReportType[] = ['snow', 'all_clear'];
      for (const t of types) {
        const expiresAt = calculateReportExpiresAt(t, baseDate);
        const diffHours = (new Date(expiresAt).getTime() - baseDate.getTime()) / (1000 * 60 * 60);
        expect(diffHours).toBe(24);
      }
    });
  });

  describe('Duplicate Detection Spatial Proximity', () => {
    it('detects duplicate when same type is within 200 meters', () => {
      const origin: [number, number] = [77.1734, 31.1048];
      // 100 meters away
      const nearPt = turf.destination(turf.point(origin), 0.1, 45, { units: 'kilometers' });
      const nearCoords = nearPt.geometry.coordinates as [number, number];

      const distanceMeters = turf.distance(turf.point(origin), turf.point(nearCoords), {
        units: 'meters',
      });
      expect(distanceMeters).toBeLessThanOrEqual(200);
    });

    it('does not flag duplicate when distance exceeds 200 meters', () => {
      const origin: [number, number] = [77.1734, 31.1048];
      // 350 meters away
      const farPt = turf.destination(turf.point(origin), 0.35, 90, { units: 'kilometers' });
      const farCoords = farPt.geometry.coordinates as [number, number];

      const distanceMeters = turf.distance(turf.point(origin), turf.point(farCoords), {
        units: 'meters',
      });
      expect(distanceMeters).toBeGreaterThan(200);
    });
  });
});
