-- ============================================================================
-- RouteX Demo Reset Script (TEST & DEMO ONLY)
-- Task P15: Deletes ONLY is_test rows and re-inserts the clean test set.
-- Preserves all real user profiles, saved routes, and genuine emergency contacts.
-- ============================================================================

set search_path to public, extensions;

-- 1. Clean out existing test reports and demo redemptions
delete from redemptions where offer_id in (select id from offers where is_demo = true);
delete from hazard_reports where is_test = true;
delete from offers where is_demo = true;
delete from partners where is_demo = true;

-- 2. Re-insert Fictional Demo Partners
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
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_demo = true;

-- 3. Re-insert Demo Partner Offers
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
  )
on conflict (id) do update set
  title = excluded.title,
  points_cost = excluded.points_cost,
  is_demo = true;

-- 4. Re-insert Clearly Labelled Test Hazard Reports (Fresh Timestamps)
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
  -- 1. Shimla Bypass / NH5 (Himachal)
  (
    '20000000-0000-0000-0000-000000000001',
    'landslide',
    3,
    '[TEST] Landslide on NH5 bypass slope near Shimla. Both lanes partially blocked by mud and boulders. Clearing operations underway.',
    ST_SetSRID(ST_MakePoint(77.1650, 31.0950), 4326)::geography,
    'verified',
    true,
    5,
    0,
    now() - interval '2 hours',
    now() + interval '70 hours'
  ),
  -- 2. Beas River Bank / Manali (Himachal)
  (
    '20000000-0000-0000-0000-000000000002',
    'flood',
    2,
    '[TEST] Elevated water levels along low-lying Beas river road near Old Manali. Water overtopping culvert, high-clearance 4x4 only.',
    ST_SetSRID(ST_MakePoint(77.1820, 32.2470), 4326)::geography,
    'verified',
    true,
    4,
    1,
    now() - interval '5 hours',
    now() + interval '43 hours'
  ),
  -- 3. Rohtang Pass Approach / Atal Tunnel North Portal (Himachal)
  (
    '20000000-0000-0000-0000-000000000003',
    'snow',
    2,
    '[TEST] Fresh snowfall and black ice near North Portal approach. Anti-skid chains strongly recommended.',
    ST_SetSRID(ST_MakePoint(77.1450, 32.4100), 4326)::geography,
    'pending',
    true,
    2,
    0,
    now() - interval '1 hour',
    now() + interval '23 hours'
  ),
  -- 4. NH10 Teesta Valley / Gangtok Route (Sikkim)
  (
    '20000000-0000-0000-0000-000000000004',
    'rockfall',
    3,
    '[TEST] Intermittent rockfall on NH10 near 29th Mile stretch. Traffic paused intermittently by authorities.',
    ST_SetSRID(ST_MakePoint(88.4800, 27.1200), 4326)::geography,
    'verified',
    true,
    6,
    0,
    now() - interval '3 hours',
    now() + interval '69 hours'
  ),
  -- 5. Sela Pass Highway / Tawang Road (Arunachal Pradesh)
  (
    '20000000-0000-0000-0000-000000000005',
    'snow',
    3,
    '[TEST] Heavy blizzard accumulation and freezing fog around Sela Pass (13,700 ft). Visibility below 10m.',
    ST_SetSRID(ST_MakePoint(92.1000, 27.5000), 4326)::geography,
    'verified',
    true,
    8,
    0,
    now() - interval '6 hours',
    now() + interval '18 hours'
  ),
  -- 6. Shillong to Cherrapunji GVK Bridge / Meghalaya
  (
    '20000000-0000-0000-0000-000000000006',
    'bridge_damage',
    2,
    '[TEST] Concrete joint damage and surface erosion on narrow gorge bridge. Single-lane alternating traffic allowed.',
    ST_SetSRID(ST_MakePoint(91.7300, 25.3200), 4326)::geography,
    'pending',
    true,
    1,
    0,
    now() - interval '4 hours',
    now() + interval '68 hours'
  ),
  -- 7. Guwahati Brahmaputra Riverfront Access Road (Assam)
  (
    '20000000-0000-0000-0000-000000000007',
    'road_blocked',
    1,
    '[TEST] Fallen tree across two lanes after strong squall near Bharalumukh ghat road. Detour via MG Road.',
    ST_SetSRID(ST_MakePoint(91.7310, 26.1780), 4326)::geography,
    'verified',
    true,
    3,
    0,
    now() - interval '30 minutes',
    now() + interval '47 hours'
  ),
  -- 8. Dharamshala - McLeodganj Bypass (Himachal)
  (
    '20000000-0000-0000-0000-000000000008',
    'all_clear',
    1,
    '[TEST] Road clearing completed on upper bypass. Mud removed, traffic flowing normally in both directions.',
    ST_SetSRID(ST_MakePoint(76.3240, 32.2350), 4326)::geography,
    'verified',
    true,
    4,
    0,
    now() - interval '1 hour',
    now() + interval '23 hours'
  )
on conflict (id) do update set
  description = excluded.description,
  up_count = excluded.up_count,
  down_count = excluded.down_count,
  status = excluded.status,
  created_at = excluded.created_at,
  expires_at = excluded.expires_at,
  is_test = true;

