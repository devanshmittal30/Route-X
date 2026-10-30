export type PartnerCategory = 'stay' | 'gear' | 'food' | 'transport' | 'medical';

export interface Partner {
  id: string;
  name: string;
  category: PartnerCategory;
  description: string | null;
  city: string;
  coordinates: [number, number]; // [lng, lat]
  is_demo: boolean;
}

export interface Offer {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  points_cost: number;
  valid_until: string | null;
  is_demo: boolean;
  partner?: Partner;
}

export interface PointsLedgerEntry {
  id: number;
  user_id: string;
  delta: number;
  reason: string;
  ref_id?: string | null;
  created_at: string;
}

export interface UserProfileRewards {
  id: string;
  display_name: string | null;
  phone: string | null;
  points: number;
  trust_score: number;
  created_at: string;
}

export interface Redemption {
  id: string;
  user_id: string;
  offer_id: string;
  code: string;
  status: 'issued' | 'used' | 'expired';
  created_at: string;
  offer?: Offer;
}

export interface RedeemResult {
  success: boolean;
  code?: string;
  redemption_id?: string;
  points_spent?: number;
  error?: string;
}
