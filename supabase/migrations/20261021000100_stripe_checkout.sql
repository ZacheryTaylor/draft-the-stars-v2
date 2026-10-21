-- Stripe Checkout (test mode first): $5 one-time platform-use fee per league member.
-- Webhook events are recorded once (idempotency). Only the service role writes payments or events:
-- RLS is on with no insert/update/delete policies, and the RPCs below are revoked from anon/authenticated.

create table public.stripe_events (
  id text primary key,                -- Stripe event id (evt_...)
  type text not null,
  checkout_session_id text,
  payment_intent_id text,
  processed_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

-- A Stripe Checkout Session can settle at most one member slot here.
create unique index payments_stripe_checkout_unique on public.payments (checkout_id)
  where provider = 'stripe' and checkout_id is not null;

-- Server-only: mark the caller's own slot paid from a verified checkout.session.completed.
-- Idempotent: returns 'already_paid' when this session was already applied; never double-marks.
create function public.mark_member_paid_stripe(
  p_event_id text, p_league uuid, p_user uuid, p_session text, p_payment_intent text, p_amount_cents int
) returns text language plpgsql security definer set search_path = '' as $$
declare n int; v_payment uuid;
begin
  insert into public.stripe_events (id, type, checkout_session_id, payment_intent_id)
  values (p_event_id, 'checkout.session.completed', p_session, p_payment_intent)
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  if n = 0 then return 'duplicate_event'; end if;

  if exists (select 1 from public.payments where provider = 'stripe' and checkout_id = p_session) then
    return 'already_paid';
  end if;

  update public.payments p
     set status = 'paid', payer_id = p_user, provider = 'stripe', checkout_id = p_session,
         provider_payment_id = p_payment_intent, amount_cents = p_amount_cents, paid_at = now()
    from public.teams t
   where t.id = p.team_id and t.league_id = p_league and t.owner_id = p_user
     and p.league_id = p_league and p.status = 'unpaid'
  returning p.id into v_payment;
  if v_payment is null then return 'no_unpaid_slot'; end if;

  insert into public.entitlements (user_id, league_id, kind, source_payment_id)
  values (p_user, p_league, 'league_membership', v_payment);
  return 'paid';
end $$;
revoke execute on function public.mark_member_paid_stripe(text, uuid, uuid, text, text, int) from public, anon, authenticated;
