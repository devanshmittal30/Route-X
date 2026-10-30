import { supabase } from '../../lib/supabase';
import {
  Offer,
  Partner,
  PartnerCategory,
  PointsLedgerEntry,
  UserProfileRewards,
  Redemption,
  RedeemResult,
} from './types';
import { rankStays, StayCandidate } from './ranking';
import { parseCoordinates } from '../risk/dataAdapters';

interface OfferJoinRow {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  points_cost: number;
  valid_until: string | null;
  is_demo: boolean;
  partners: {
    id: string;
    name: string;
    category: PartnerCategory;
    description: string | null;
    city: string;
    geom: unknown;
    is_demo: boolean;
  } | null;
}

interface RedemptionJoinRow {
  id: string;
  user_id: string;
  offer_id: string;
  code: string;
  status: 'issued' | 'used' | 'expired';
  created_at: string;
  offers: {
    id: string;
    partner_id: string;
    title: string;
    description: string | null;
    points_cost: number;
    valid_until: string | null;
    is_demo: boolean;
    partners: {
      id: string;
      name: string;
      category: PartnerCategory;
      city: string;
    } | null;
  } | null;
}

/**
 * Fetches the user profile rewards state (points balance, trust score).
 */
export async function fetchUserProfileRewards(
  userId: string
): Promise<UserProfileRewards | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, phone, points, trust_score, created_at')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    display_name: data.display_name,
    phone: data.phone,
    points: data.points ?? 0,
    trust_score: data.trust_score ?? 50,
    created_at: data.created_at,
  };
}

/**
 * Fetches the user's points ledger history.
 */
export async function fetchPointsLedger(
  userId: string,
  limit = 50
): Promise<PointsLedgerEntry[]> {
  const { data, error } = await supabase
    .from('points_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    delta: row.delta,
    reason: row.reason,
    ref_id: row.ref_id,
    created_at: row.created_at,
  }));
}

/**
 * Fetches available partner offers with joined partner details.
 */
export async function fetchAvailableOffers(
  includeDemo = true
): Promise<Offer[]> {
  let query = supabase
    .from('offers')
    .select(`
      id,
      partner_id,
      title,
      description,
      points_cost,
      valid_until,
      is_demo,
      partners (
        id,
        name,
        category,
        description,
        city,
        geom,
        is_demo
      )
    `)
    .order('points_cost', { ascending: true });

  if (!includeDemo) {
    query = query.eq('is_demo', false);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return (data as unknown as OfferJoinRow[]).map((row) => {
    let partnerObj: Partner | undefined;
    if (row.partners) {
      const p = row.partners;
      const coords = parseCoordinates(p.geom) || [77.1734, 31.1048];
      partnerObj = {
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        city: p.city,
        coordinates: coords,
        is_demo: p.is_demo,
      };
    }

    return {
      id: row.id,
      partner_id: row.partner_id,
      title: row.title,
      description: row.description,
      points_cost: row.points_cost,
      valid_until: row.valid_until,
      is_demo: row.is_demo,
      partner: partnerObj,
    };
  });
}

/**
 * Redeems an offer by calling the Supabase RPC function `redeem_offer`.
 * Handles errors like "Insufficient points" and "Offer already redeemed today".
 */
export async function redeemOffer(offerId: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc('redeem_offer', {
    p_offer_id: offerId,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    code: data?.code,
    redemption_id: data?.redemption_id,
    points_spent: data?.points_spent,
  };
}

/**
 * Fetches past redemptions made by the user.
 */
export async function fetchUserRedemptions(
  userId: string
): Promise<Redemption[]> {
  const { data, error } = await supabase
    .from('redemptions')
    .select(`
      id,
      user_id,
      offer_id,
      code,
      status,
      created_at,
      offers (
        id,
        title,
        description,
        points_cost,
        valid_until,
        is_demo,
        partners (
          id,
          name,
          category,
          city
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as unknown as RedemptionJoinRow[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    offer_id: row.offer_id,
    code: row.code,
    status: row.status,
    created_at: row.created_at,
    offer: row.offers
      ? {
          id: row.offers.id,
          partner_id: row.offers.partner_id,
          title: row.offers.title,
          description: row.offers.description,
          points_cost: row.offers.points_cost,
          valid_until: row.offers.valid_until,
          is_demo: row.offers.is_demo,
          partner: row.offers.partners
            ? {
                id: row.offers.partners.id,
                name: row.offers.partners.name,
                category: row.offers.partners.category,
                description: null,
                city: row.offers.partners.city,
                coordinates: [77.1734, 31.1048],
                is_demo: true,
              }
            : undefined,
        }
      : undefined,
  }));
}

/**
 * Fetches partner locations and formats them as candidates ranked by the Doc 03 rule.
 */
export async function fetchRankedSponsoredStays(
  userCoords?: [number, number]
): Promise<StayCandidate[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('is_demo', true);

  if (error || !data || data.length === 0) {
    // Fallback demo partners if database table is empty
    const fallbackPartners: StayCandidate[] = [
      {
        id: 'p1',
        name: 'Demo Himalayan Pine Homestay',
        category: 'stay',
        description: 'Quiet mountain retreat with verified safe access away from active slopes.',
        city: 'Shimla',
        coordinates: [77.1734, 31.1048],
        riskLevel: 'Low',
        riskScore: 18,
        isSponsored: true,
        amenityTags: ['Bedrock slope', 'Road access'],
      },
      {
        id: 'p2',
        name: 'Demo Valley View Mountain Lodge',
        category: 'stay',
        description: 'Stable bedrock lodge with backup power and emergency first aid supplies.',
        city: 'Manali',
        coordinates: [77.1892, 32.2432],
        riskLevel: 'Low',
        riskScore: 24,
        isSponsored: true,
        amenityTags: ['Backup generator', 'First aid'],
      },
      {
        id: 'p3',
        name: 'Demo Cloud Peak Trekker Haven',
        category: 'stay',
        description: 'Homestay equipped with offline regional trail guides and gear dry room.',
        city: 'Shillong',
        coordinates: [91.8933, 25.5788],
        riskLevel: 'Low',
        riskScore: 16,
        isSponsored: true,
        amenityTags: ['Offline trail guides', 'Dry room'],
      },
      {
        id: 'p4',
        name: 'Demo Mountain Trail Outfitter',
        category: 'gear',
        description: 'Trekking equipment rental: safety poles, rain gaiters, and emergency bivvies.',
        city: 'Guwahati',
        coordinates: [91.7362, 26.1445],
        riskLevel: 'Low',
        riskScore: 12,
        isSponsored: true,
        amenityTags: ['Gear rental', 'Safety poles'],
      },
    ];
    return rankStays(fallbackPartners, userCoords);
  }

  const candidates: StayCandidate[] = data.map((p) => {
    const coords = parseCoordinates(p.geom) || [77.1734, 31.1048];
    return {
      id: p.id,
      name: p.name,
      category: p.category || 'stay',
      description: p.description,
      city: p.city,
      coordinates: coords,
      riskLevel: 'Low', // Verified demo partner locations are selected on stable bedrock
      riskScore: 18,
      isSponsored: true,
      amenityTags: [p.city, p.category === 'stay' ? 'Safe shelter' : 'Trail supplies'],
    };
  });

  return rankStays(candidates, userCoords);
}
