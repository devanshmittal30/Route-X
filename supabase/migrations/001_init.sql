-- ============================================================================
-- RouteX Migration 001_init.sql
-- Mountain & Disaster-Aware Navigation Schema
-- ============================================================================

-- Enable PostGIS extension for spatial queries (points, lines, distance buffers)
create extension if not exists postgis;

-- ----------------------------------------------------------------------------
-- 1. Custom Types
-- ----------------------------------------------------------------------------
create type report_type as enum (
  'landslide',
  'road_blocked',
  'flood',
  'snow',
  'rockfall',
  'bridge_damage',
  'all_clear'
);

create type report_status as enum (
  'pending',
  'verified',
  'disputed',
  'resolved',
  'expired'
);

-- ----------------------------------------------------------------------------
-- 2. User Profiles
-- Rule: display name, optional phone, balance never below 0, trust score 0-100
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  phone text,
  points int not null default 0 check (points >= 0),
  trust_score int not null default 50 check (trust_score between 0 and 100),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Emergency Contacts
-- Rule: max contacts per user, cascade on profile delete
-- ----------------------------------------------------------------------------
create table emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  relation text,
  created_at timestamptz not null default now()
);
create index emergency_contacts_user_idx on emergency_contacts (user_id);

-- ----------------------------------------------------------------------------
-- 4. Hazard Reports
-- Rule: Crowdsourced reports with peer verification, PostGIS geometry
-- ----------------------------------------------------------------------------
create table hazard_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  type report_type not null,
  severity smallint not null check (severity between 1 and 3),
  description text check (char_length(description) <= 500),
  geom geography(Point, 4326) not null,
  photo_path text,
  status report_status not null default 'pending',
  is_test boolean not null default false,
  up_count int not null default 0,
  down_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  resolved_at timestamptz,
  resolves_report_id uuid references hazard_reports(id)
);
create index hazard_reports_geom_idx on hazard_reports using gist (geom);
create index hazard_reports_status_idx on hazard_reports (status, expires_at);
create index hazard_reports_created_idx on hazard_reports (created_at desc);

-- ----------------------------------------------------------------------------
-- 5. Report Votes
-- Rule: One vote per user per report, smallint vote in (-1, 1)
-- ----------------------------------------------------------------------------
create table report_votes (
  report_id uuid not null references hazard_reports(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 6. Points Ledger
-- Rule: Immutable points audit trail, never below 0 balance
-- ----------------------------------------------------------------------------
create table points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  delta int not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index points_ledger_user_idx on points_ledger (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 7. Historical Landslides
-- Rule: GSI / official inventory data
-- ----------------------------------------------------------------------------
create table historical_landslides (
  id bigint generated always as identity primary key,
  source text not null,
  source_event_id text,
  event_date date not null,
  geom geography(Point, 4326) not null,
  trigger text,
  fatalities int,
  location_text text,
  unique (source, source_event_id)
);
create index hist_geom_idx on historical_landslides using gist (geom);

-- ----------------------------------------------------------------------------
-- 8. Partners (Demo / Sponsored)
-- Rule: Invented neutral names, category in ('stay','food','gear','transport')
-- ----------------------------------------------------------------------------
create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('stay', 'food', 'gear', 'transport')),
  description text,
  city text,
  geom geography(Point, 4326),
  is_demo boolean not null default true
);

-- ----------------------------------------------------------------------------
-- 9. Offers & Redemptions
-- ----------------------------------------------------------------------------
create table offers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  title text not null,
  description text,
  points_cost int not null check (points_cost > 0),
  valid_until date,
  is_demo boolean not null default true
);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  offer_id uuid not null references offers(id),
  code text not null unique,
  status text not null default 'issued',
  created_at timestamptz not null default now()
);
create index redemptions_user_idx on redemptions (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 10. SOS Events & Saved Routes
-- ----------------------------------------------------------------------------
create table sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  condition text,
  message text,
  geom geography(Point, 4326),
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

create table saved_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  from_label text,
  to_label text,
  mode text check (mode in ('drive', 'walk')),
  geometry jsonb not null,
  risk_score int,
  created_at timestamptz not null default now()
);

create table weather_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

alter table profiles enable row level security;
alter table emergency_contacts enable row level security;
alter table hazard_reports enable row level security;
alter table report_votes enable row level security;
alter table points_ledger enable row level security;
alter table historical_landslides enable row level security;
alter table partners enable row level security;
alter table offers enable row level security;
alter table redemptions enable row level security;
alter table sos_events enable row level security;
alter table saved_routes enable row level security;
alter table weather_cache enable row level security;

-- Profiles: users read and update their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Emergency Contacts: strictly isolated to the owning user
create policy "Users can view own emergency contacts"
  on emergency_contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert own emergency contacts"
  on emergency_contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own emergency contacts"
  on emergency_contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete own emergency contacts"
  on emergency_contacts for delete
  using (auth.uid() = user_id);

-- Hazard Reports: everyone can read reports; logged in users can insert
create policy "Anyone can read hazard reports"
  on hazard_reports for select
  using (true);

create policy "Authenticated users can create hazard reports"
  on hazard_reports for insert
  with check (auth.uid() is not null and (user_id is null or auth.uid() = user_id));

-- Report Votes: users can view own votes; inserting is done via cast_vote()
create policy "Users can view own votes"
  on report_votes for select
  using (auth.uid() = user_id);

-- Points Ledger: users can read their own points history
create policy "Users can view own points ledger"
  on points_ledger for select
  using (auth.uid() = user_id);

-- Historical Landslides: public read-only
create policy "Anyone can read historical landslides"
  on historical_landslides for select
  using (true);

-- Partners & Offers: public read-only
create policy "Anyone can read partners"
  on partners for select
  using (true);

create policy "Anyone can read offers"
  on offers for select
  using (true);

-- Redemptions: users can only see their own issued coupon codes
create policy "Users can view own redemptions"
  on redemptions for select
  using (auth.uid() = user_id);

-- SOS Events: users can insert and view their own events
create policy "Users can insert sos events"
  on sos_events for insert
  with check (auth.uid() is null or auth.uid() = user_id);

create policy "Users can view own sos events"
  on sos_events for select
  using (auth.uid() = user_id);

-- Saved Routes: own only
create policy "Users can manage own saved routes"
  on saved_routes for all
  using (auth.uid() = user_id);

-- Weather Cache: public read-only
create policy "Anyone can read weather cache"
  on weather_cache for select
  using (true);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Trigger: Automatically create profile entry upon Supabase auth sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, phone, points, trust_score)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    0,
    50
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: Set default report expiry based on hazard type if not provided
-- Defaults: landslide/rockfall/bridge 72 h; road_blocked/flood 48 h; snow 24 h; all_clear 24 h
create or replace function public.set_report_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.expires_at is null then
    if new.type in ('landslide', 'rockfall', 'bridge_damage') then
      new.expires_at := now() + interval '72 hours';
    elsif new.type in ('road_blocked', 'flood') then
      new.expires_at := now() + interval '48 hours';
    else
      new.expires_at := now() + interval '24 hours';
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger on_hazard_report_created
  before insert on public.hazard_reports
  for each row execute procedure public.set_report_defaults();

-- Function: reports_near
-- Returns non-expired, non-disputed reports within radius_m meters
create or replace function public.reports_near(
  lat double precision,
  lng double precision,
  radius_m int default 50000,
  include_test boolean default false
)
returns setof hazard_reports
language sql
stable
security definer
as $$
  select *
  from hazard_reports
  where
    status in ('pending', 'verified', 'resolved')
    and expires_at > now()
    and (include_test or not is_test)
    and ST_DWithin(geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_m)
  order by created_at desc;
$$;

-- Function: reports_along_route
-- Returns active reports within buffer_m of a GeoJSON route line
create or replace function public.reports_along_route(
  route_geojson text,
  buffer_m int default 500,
  include_test boolean default false
)
returns setof hazard_reports
language sql
stable
security definer
as $$
  select *
  from hazard_reports
  where
    status in ('pending', 'verified', 'resolved')
    and expires_at > now()
    and (include_test or not is_test)
    and ST_DWithin(geom, ST_GeomFromGeoJSON(route_geojson)::geography, buffer_m)
  order by created_at desc;
$$;

-- Function: cast_vote
-- Security Definer: blocks own-report votes, upserts vote, recalculates counts and status,
-- awards/deducts points and updates trust score per Doc 03 section 8.
create or replace function public.cast_vote(
  p_report_id uuid,
  p_vote smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voter_id uuid;
  v_report record;
  v_old_status report_status;
  v_new_status report_status;
  v_up_count int;
  v_down_count int;
  v_votes_today_count int;
begin
  v_voter_id := auth.uid();
  if v_voter_id is null then
    raise exception 'Authentication required to vote on reports';
  end if;

  if p_vote not in (-1, 1) then
    raise exception 'Invalid vote value. Must be 1 or -1';
  end if;

  -- Load target report
  select * into v_report from hazard_reports where id = p_report_id;
  if not found then
    raise exception 'Report not found';
  end if;

  -- Rule: User cannot vote on their own report
  if v_report.user_id = v_voter_id then
    raise exception 'Cannot vote on your own report';
  end if;

  -- Upsert user vote
  insert into report_votes (report_id, user_id, vote, created_at)
  values (p_report_id, v_voter_id, p_vote, now())
  on conflict (report_id, user_id)
  do update set vote = excluded.vote, created_at = now();

  -- Recalculate up and down counts
  select
    coalesce(sum(case when vote = 1 then 1 else 0 end), 0),
    coalesce(sum(case when vote = -1 then 1 else 0 end), 0)
  into v_up_count, v_down_count
  from report_votes
  where report_id = p_report_id;

  v_old_status := v_report.status;
  v_new_status := v_old_status;

  -- Status Rules (Doc 03 Section 8):
  -- 'pending' -> 'verified' when up_count - down_count >= 3 and up_count >= 3
  -- -> 'disputed' when down_count - up_count >= 3
  if (v_up_count - v_down_count >= 3) and (v_up_count >= 3) then
    v_new_status := 'verified';
  elsif (v_down_count - v_up_count >= 3) then
    v_new_status := 'disputed';
  elsif v_old_status in ('verified', 'disputed') then
    v_new_status := 'pending';
  end if;

  -- Update report counts & status
  update hazard_reports
  set
    up_count = v_up_count,
    down_count = v_down_count,
    status = v_new_status
  where id = p_report_id;

  -- Points & Trust Transitions for Reporter (only for non-test reports)
  if not v_report.is_test and v_report.user_id is not null then
    if v_old_status != 'verified' and v_new_status = 'verified' then
      -- Report becomes verified: +20 points to reporter, +3 trust
      update profiles
      set
        points = points + 20,
        trust_score = least(100, trust_score + 3)
      where id = v_report.user_id;

      insert into points_ledger (user_id, delta, reason, ref_id)
      values (v_report.user_id, 20, 'Report verified by community', p_report_id);

    elsif v_old_status != 'disputed' and v_new_status = 'disputed' then
      -- Report becomes disputed: -15 points (floor 0), -10 trust
      update profiles
      set
        points = greatest(0, points - 15),
        trust_score = greatest(0, trust_score - 10)
      where id = v_report.user_id;

      insert into points_ledger (user_id, delta, reason, ref_id)
      values (v_report.user_id, -15, 'Report disputed by community', p_report_id);
    end if;
  end if;

  -- Voter Points: +1 point per vote on someone else's report (capped at 10/day)
  select count(*) into v_votes_today_count
  from points_ledger
  where user_id = v_voter_id
    and reason = 'Voted on community report'
    and created_at >= current_date;

  if v_votes_today_count < 10 and not v_report.is_test then
    update profiles
    set points = points + 1
    where id = v_voter_id;

    insert into points_ledger (user_id, delta, reason, ref_id)
    values (v_voter_id, 1, 'Voted on community report', p_report_id);
  end if;

  return jsonb_build_object(
    'report_id', p_report_id,
    'status', v_new_status,
    'up_count', v_up_count,
    'down_count', v_down_count
  );
end;
$$;

-- Function: redeem_offer
-- Security Definer: checks balance and "one per offer per day", deducts points,
-- generates an 8-character unique demo coupon code, records ledger and redemption.
create or replace function public.redeem_offer(
  p_offer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_offer record;
  v_user_points int;
  v_already_redeemed_today int;
  v_coupon_code text;
  v_redemption_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required to redeem offers';
  end if;

  -- Verify offer exists
  select * into v_offer from offers where id = p_offer_id;
  if not found then
    raise exception 'Offer not found';
  end if;

  -- Check user point balance
  select points into v_user_points from profiles where id = v_user_id;
  if v_user_points is null or v_user_points < v_offer.points_cost then
    raise exception 'Insufficient points (requires %, user has %)', v_offer.points_cost, coalesce(v_user_points, 0);
  end if;

  -- Rule: One active redemption per offer per user per day
  select count(*) into v_already_redeemed_today
  from redemptions
  where user_id = v_user_id
    and offer_id = p_offer_id
    and created_at >= current_date;

  if v_already_redeemed_today > 0 then
    raise exception 'Offer already redeemed today. Limit: 1 redemption per offer per day.';
  end if;

  -- Generate unique 8-character uppercase coupon code
  v_coupon_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

  -- Deduct points
  update profiles
  set points = points - v_offer.points_cost
  where id = v_user_id;

  -- Insert ledger entry
  insert into points_ledger (user_id, delta, reason, ref_id)
  values (v_user_id, -v_offer.points_cost, 'Redeemed demo offer: ' || v_offer.title, p_offer_id);

  -- Insert redemption
  insert into redemptions (user_id, offer_id, code, status)
  values (v_user_id, p_offer_id, v_coupon_code, 'issued')
  returning id into v_redemption_id;

  return jsonb_build_object(
    'redemption_id', v_redemption_id,
    'code', v_coupon_code,
    'offer_id', p_offer_id,
    'points_spent', v_offer.points_cost
  );
end;
$$;

-- Function: expire_reports
-- Sets 'expired' where expires_at < now()
create or replace function public.expire_reports()
returns int
language plpgsql
security definer
as $$
declare
  v_expired_count int;
begin
  update hazard_reports
  set status = 'expired'
  where status = 'pending' and expires_at < now();

  get diagnostics v_expired_count = row_count;
  return v_expired_count;
end;
$$;
