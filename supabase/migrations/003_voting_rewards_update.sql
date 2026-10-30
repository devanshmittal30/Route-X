-- ============================================================================
-- Migration 003: Voting, Trust, & Rewards Refinements (P9)
-- Refines cast_vote RPC function to award voter trust bonus on matching outcome
-- and handle all_clear verified rewards (+10 pts) per Doc 03 Section 8.
-- ============================================================================

set search_path to public, extensions;

create or replace function public.cast_vote(
  p_report_id uuid,
  p_vote smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
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

  -- Upsert voter's vote
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
      -- Report becomes verified: +20 points (+10 if all_clear), +3 trust
      declare
        v_pts int := case when v_report.type = 'all_clear' then 10 else 20 end;
      begin
        update profiles
        set
          points = points + v_pts,
          trust_score = least(100, trust_score + 3)
        where id = v_report.user_id;

        insert into points_ledger (user_id, delta, reason, ref_id)
        values (
          v_report.user_id,
          v_pts,
          case when v_report.type = 'all_clear'
            then 'All-clear report verified by community'
            else 'Report verified by community'
          end,
          p_report_id
        );

        -- Voters whose vote matched the verified outcome: +1 trust (cap 100)
        update profiles
        set trust_score = least(100, trust_score + 1)
        where id in (
          select user_id from report_votes where report_id = p_report_id and vote = 1
        );
      end;

    elsif v_old_status != 'disputed' and v_new_status = 'disputed' then
      -- Report becomes disputed: -15 points (floor 0), -10 trust
      update profiles
      set
        points = greatest(0, points - 15),
        trust_score = greatest(0, trust_score - 10)
      where id = v_report.user_id;

      insert into points_ledger (user_id, delta, reason, ref_id)
      values (v_report.user_id, -15, 'Report disputed by community', p_report_id);

      -- Voters whose vote matched the disputed outcome: +1 trust (cap 100)
      update profiles
      set trust_score = least(100, trust_score + 1)
      where id in (
        select user_id from report_votes where report_id = p_report_id and vote = -1
      );
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
