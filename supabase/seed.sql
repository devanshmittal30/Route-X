-- ============================================================================
-- RouteX Seed Data (TEST & DEMO ONLY)
-- Golden Rule 2: Never invent real data. Clearly labelled test data only.
-- All reports flagged is_test = true, descriptions start with [TEST].
-- All partners/offers flagged is_demo = true with invented neutral names.
-- Zero fake users, zero fake points, zero fake weather or historic data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fictional Demo Partners (Invented Neutral Names Only)
-- ----------------------------------------------------------------------------
insert into partners (id, name, category, description, city, geom, is_demo)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Demo Himalayan Pine Homestay',
    'stay',
    'Quiet mountain retreat with verified safe access away from active slopes.',
    'Shimla',
    ST_SetSRID(ST_MakePoint(77.1734, 31.1048), 4326)::geography,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Demo Valley View Mountain Lodge',
    'stay',
    'Stable bedrock lodge with backup power and emergency first aid supplies.',
    'Manali',
    ST_SetSRID(ST_MakePoint(77.1892, 32.2432), 4326)::geography,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Demo Cloud Peak Trekker Haven',
    'stay',
    'Homestay equipped with offline regional trail guides and gear dry room.',
    'Shillong',
    ST_SetSRID(ST_MakePoint(91.8933, 25.5788), 4326)::geography,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Demo Mountain Trail Outfitter',
    'gear',
    'Trekking equipment rental: safety poles, rain gaiters, and emergency bivvies.',
    'Guwahati',
    ST_SetSRID(ST_MakePoint(91.7362, 26.1445), 4326)::geography,
    true
  );

-- ----------------------------------------------------------------------------
-- 2. Demo Partner Offers (Points Redeemable)
-- ----------------------------------------------------------------------------
insert into offers (id, partner_id, title, description, points_cost, valid_until, is_demo)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '20% Off Safe Hill Stay (Demo)',
    'Discount on a night stay when road conditions require an emergency stopover.',
    50,
    current_date + interval '90 days',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Free Hot Mountain Meal & Shelter Rest (Demo)',
    'Complimentary warm soup and dry rest area for verified road travellers.',
    30,
    current_date + interval '90 days',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    '15% Off Trekker Homestay Booking (Demo)',
    'Discount for registered community contributors exploring Meghalaya trails.',
    45,
    current_date + interval '90 days',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',
    'Free Trekking Pole Rental (1 Day) (Demo)',
    'Safety gear loaner coupon for steep terrain and loose scree crossings.',
    25,
    current_date + interval '90 days',
    true
  );

-- ----------------------------------------------------------------------------
-- 3. Clearly Labelled Test Hazard Reports (8 Realistic Himalayan/Northeast Points)
-- Note: All descriptions start with [TEST] and is_test = true.
-- ----------------------------------------------------------------------------
insert into hazard_reports (
  id,
  type,
  severity,
  description,
  geom,
  status,
  is_test,
  up_count,
  down_count,
  created_at,
  expires_at
)
values
  -- 1. Shimla NH5 bypass (Himachal)
  (
    '20000000-0000-0000-0000-000000000001',
    'landslide',
    2,
    '[TEST] Mud and loose debris on the left lane near Shimla bypass. Heavy vehicles diverted.',
    ST_SetSRID(ST_MakePoint(77.1734, 31.1048), 4326)::geography,
    'verified',
    true,
    5,
    1,
    now() - interval '4 hours',
    now() + interval '68 hours'
  ),
  -- 2. Manali NH3 road cut (Himachal)
  (
    '20000000-0000-0000-0000-000000000002',
    'road_blocked',
    3,
    '[TEST] Boulder fall blocking both lanes near Beas riverbank. Bulldozer clearing in progress.',
    ST_SetSRID(ST_MakePoint(77.1892, 32.2432), 4326)::geography,
    'verified',
    true,
    8,
    0,
    now() - interval '2 hours',
    now() + interval '46 hours'
  ),
  -- 3. Dharamshala / McLeodganj road (Himachal)
  (
    '20000000-0000-0000-0000-000000000003',
    'rockfall',
    1,
    '[TEST] Small gravel and loose stones rolling down steep cutting after morning rain.',
    ST_SetSRID(ST_MakePoint(76.3234, 32.2190), 4326)::geography,
    'pending',
    true,
    2,
    0,
    now() - interval '1 hour',
    now() + interval '71 hours'
  ),
  -- 4. Joshimath / Alaknanda corridor (Uttarakhand)
  (
    '20000000-0000-0000-0000-000000000004',
    'landslide',
    3,
    '[TEST] Soil slump over 30 meters of roadway near ravine bend. Single lane passage only.',
    ST_SetSRID(ST_MakePoint(79.5664, 30.5564), 4326)::geography,
    'verified',
    true,
    6,
    0,
    now() - interval '6 hours',
    now() + interval '66 hours'
  ),
  -- 5. Gangtok NH10 (Sikkim)
  (
    '20000000-0000-0000-0000-000000000005',
    'flood',
    2,
    '[TEST] Overflowing stream culvert flooding low stretch of road. High clearance 4x4 recommended.',
    ST_SetSRID(ST_MakePoint(88.6065, 27.3389), 4326)::geography,
    'verified',
    true,
    4,
    1,
    now() - interval '3 hours',
    now() + interval '45 hours'
  ),
  -- 6. Shillong / Cherrapunji route (Meghalaya)
  (
    '20000000-0000-0000-0000-000000000006',
    'bridge_damage',
    2,
    '[TEST] Guard rail damaged by flash torrent on small bridge. Passable with caution.',
    ST_SetSRID(ST_MakePoint(91.8933, 25.5788), 4326)::geography,
    'pending',
    true,
    1,
    0,
    now() - interval '30 minutes',
    now() + interval '71 hours'
  ),
  -- 7. Tawang Sela Pass sector (Arunachal Pradesh)
  (
    '20000000-0000-0000-0000-000000000007',
    'snow',
    2,
    '[TEST] Fresh early snowfall and black ice near high altitude bend. Skid risk high.',
    ST_SetSRID(ST_MakePoint(91.8594, 27.5861), 4326)::geography,
    'verified',
    true,
    4,
    0,
    now() - interval '5 hours',
    now() + interval '19 hours'
  ),
  -- 8. Guwahati valley approach (Assam)
  (
    '20000000-0000-0000-0000-000000000008',
    'all_clear',
    1,
    '[TEST] Previous localized waterlogging cleared by municipal pumps. Road fully open.',
    ST_SetSRID(ST_MakePoint(91.7362, 26.1445), 4326)::geography,
    'verified',
    true,
    5,
    0,
    now() - interval '1 hour',
    now() + interval '23 hours'
  );
