-- ============================================================================
-- 002_reports_enhancements.sql
-- RouteX: Report Rate Limiting, Points Reward, Duplicate Detection, and Storage
-- ============================================================================

set search_path to public, extensions;

-- ----------------------------------------------------------------------------
-- 1. Rate Limit Check (Doc 03 section 8: max 5 reports/hour/user)
-- Enforced via a BEFORE INSERT trigger on hazard_reports.
-- Throws a clean error message if the user exceeds 5 submissions in the past 60 minutes.
-- ----------------------------------------------------------------------------
create or replace function public.check_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count int;
begin
  if new.user_id is not null then
    select count(*) into v_count
    from public.hazard_reports
    where user_id = new.user_id
      and created_at >= (now() - interval '1 hour');

    if v_count >= 5 then
      raise exception 'Rate limit exceeded: You can submit at most 5 reports per hour. Please wait before reporting another hazard.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_hazard_report_rate_limit on public.hazard_reports;
create trigger on_hazard_report_rate_limit
  before insert on public.hazard_reports
  for each row execute procedure public.check_report_rate_limit();

-- ----------------------------------------------------------------------------
-- 2. Report Submission Reward (Doc 03 section 8: +5 points, max 5 rewarded/day)
-- Enforced via an AFTER INSERT trigger on hazard_reports.
-- Test data (is_test = true) never awards points per Doc 03 section 8.
-- ----------------------------------------------------------------------------
create or replace function public.on_hazard_report_reward()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_reports_today int;
begin
  if new.user_id is not null and not new.is_test then
    -- Check daily reward cap: max 5 rewarded reports/day
    select count(*) into v_reports_today
    from public.points_ledger
    where user_id = new.user_id
      and reason = 'report_submitted'
      and created_at >= date_trunc('day', now());

    if v_reports_today < 5 then
      insert into public.points_ledger (user_id, delta, reason, ref_id)
      values (new.user_id, 5, 'report_submitted', new.id);

      update public.profiles
      set points = points + 5
      where id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_hazard_report_reward_trigger on public.hazard_reports;
create trigger on_hazard_report_reward_trigger
  after insert on public.hazard_reports
  for each row execute procedure public.on_hazard_report_reward();

-- ----------------------------------------------------------------------------
-- 3. Duplicate Detection RPC (Doc 03 section 8 & Doc 01 section 6.4)
-- Same type within 200 m within 2 hours -> suggest voting on existing report
-- ----------------------------------------------------------------------------
create or replace function public.find_duplicate_report(
  p_type report_type,
  p_lng double precision,
  p_lat double precision,
  p_distance_m int default 200,
  p_lookback_hours int default 2
)
returns setof hazard_reports
language sql
stable
security definer
set search_path = public, extensions
as $$
  select *
  from public.hazard_reports
  where type = p_type
    and status in ('pending', 'verified')
    and created_at >= (now() - (p_lookback_hours || ' hours')::interval)
    and ST_DWithin(geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_distance_m)
  order by created_at desc
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- 4. Enable Realtime Replication on hazard_reports and report_votes
-- Allows browsers to receive live inserts, up_count/down_count updates, and status changes
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hazard_reports'
  ) then
    alter publication supabase_realtime add table public.hazard_reports;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'report_votes'
  ) then
    alter publication supabase_realtime add table public.report_votes;
  end if;
end;
$$;
