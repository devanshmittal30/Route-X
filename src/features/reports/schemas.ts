import { z } from 'zod';

export const INDIA_BBOX = {
  minLat: 6.0,
  maxLat: 38.0,
  minLng: 68.0,
  maxLng: 98.0,
} as const;

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3 MB
export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Strips HTML tags from input string to eliminate any XSS / HTML injection.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '') // strip all HTML tags
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export const reportTypeSchema = z.enum([
  'landslide',
  'road_blocked',
  'flood',
  'snow',
  'rockfall',
  'bridge_damage',
  'all_clear',
]);

export const reportSeveritySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const coordinatesSchema = z
  .tuple([z.number(), z.number()]) // [longitude, latitude]
  .refine(
    ([lng, lat]) =>
      lat >= INDIA_BBOX.minLat &&
      lat <= INDIA_BBOX.maxLat &&
      lng >= INDIA_BBOX.minLng &&
      lng <= INDIA_BBOX.maxLng,
    {
      message: `Location must be inside the India bounding area (lat ${INDIA_BBOX.minLat}°–${INDIA_BBOX.maxLat}°, lng ${INDIA_BBOX.minLng}°–${INDIA_BBOX.maxLng}°).`,
    }
  );

export const descriptionSchema = z
  .string()
  .max(500, 'Description must not exceed 500 characters')
  .optional()
  .transform((val) => (val ? sanitizeText(val) : ''));

export const createReportSchema = z.object({
  type: reportTypeSchema,
  severity: reportSeveritySchema,
  description: descriptionSchema,
  coordinates: coordinatesSchema,
  is_test: z.boolean().default(false),
});

export type CreateReportSchemaType = z.infer<typeof createReportSchema>;

/**
 * Validates optional photo file.
 */
export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_MIMES.includes(file.type as typeof ALLOWED_IMAGE_MIMES[number])) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload JPEG, PNG, or WebP only.',
    };
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 3 MB.`,
    };
  }

  return { valid: true };
}
