-- ============================================================================
-- RouteX RLS Verification Script: Emergency Contacts & Profile Isolation
-- Run this in the Supabase SQL Editor to verify that Row Level Security (RLS)
-- strictly prevents users from reading or modifying each other's contacts.
-- ============================================================================

-- 1. Verify RLS is enabled on emergency_contacts
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('emergency_contacts', 'profiles');

-- 2. Test RLS Isolation as User A
-- Set session claims to simulate User A
set local role authenticated;
set local request.jwt.claims to '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';

-- User A creates their contact
insert into public.emergency_contacts (user_id, name, phone, relation)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A Contact', '+91 99999 11111', 'Family');

-- User A queries contacts -> Sees 1 row
select count(*) as user_a_visible_contacts from public.emergency_contacts;

-- 3. Switch session to User B
set local request.jwt.claims to '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';

-- User B queries contacts -> Returns 0 rows (User A's contacts are blocked)
select count(*) as user_b_visible_contacts from public.emergency_contacts;

-- 4. User B attempts to read User A's profile
select * from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Returns 0 rows (Profiles RLS blocks reading other users' private profiles)

