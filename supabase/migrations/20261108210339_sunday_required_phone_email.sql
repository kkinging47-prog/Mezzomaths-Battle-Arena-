-- Legacy identity contact is retained so candidate IDs, claims and reports do not change.
alter table public.bece_sunday_trial_registrations
 add column if not exists phone_number text,
 add column if not exists email text,
 add column if not exists reminder_opt_in boolean not null default false,
 add column if not exists reminder_consent_at timestamptz;
create or replace function public.validate_sunday_reminder_contacts()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' or new.phone_number is distinct from old.phone_number or new.email is distinct from old.email then
  if coalesce(new.phone_number,'') !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'A valid phone number is required';end if;
  if length(coalesce(new.email,''))>254 or coalesce(new.email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'A valid email address is required';end if;
  new.email:=lower(trim(new.email));
 end if;
 if new.reminder_opt_in then
  if tg_op='INSERT' then new.reminder_consent_at:=now();
  elsif not old.reminder_opt_in then new.reminder_consent_at:=now();
  else new.reminder_consent_at:=old.reminder_consent_at;end if;
 else new.reminder_consent_at:=null;end if;
 return new;
end $$;
revoke all on function public.validate_sunday_reminder_contacts() from public,anon,authenticated;
create trigger sunday_reminder_contacts_validate before insert or update of phone_number,email,reminder_opt_in,reminder_consent_at on public.bece_sunday_trial_registrations for each row execute function public.validate_sunday_reminder_contacts();
create or replace function public.register_or_recover_sunday_candidate(p_details jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.bece_sunday_trial_registrations%rowtype; identity text; email_identity text; lock_key text; recovering boolean:=coalesce((p_details->>'recover_only')::boolean,false);
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Service role required';end if;
 if length(trim(coalesce(p_details->>'full_name','')))<3 or length(trim(coalesce(p_details->>'contact','')))<5 then raise exception 'Name and contact required';end if;
 if not recovering then
  if coalesce(p_details->>'phone_number','') !~ '^\+[1-9][0-9]{7,14}$' or coalesce(p_details->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Phone number and email are required';end if;
 end if;
 identity:=public.sunday_identity_key(p_details->>'full_name',p_details->>'contact');
 email_identity:=case when not recovering then public.sunday_identity_key(p_details->>'full_name',p_details->>'email') else identity end;
 for lock_key in select distinct k from unnest(array[identity,email_identity]) k order by k loop perform pg_advisory_xact_lock(hashtextextended(lock_key,0));end loop;
 select * into r from public.bece_sunday_trial_registrations x
 where public.sunday_identity_key(x.full_name,x.contact) in(identity,email_identity) and x.candidate_id is not null order by x.created_at,x.id limit 1;
 if not found then
  if recovering then raise exception 'Registration not found';end if;
  insert into public.bece_sunday_trial_registrations(candidate_id,full_name,contact,school_name,location,region,class_level,phone_number,email,reminder_opt_in)
  values('MSB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,18)),trim(p_details->>'full_name'),p_details->>'phone_number',trim(p_details->>'school_name'),trim(p_details->>'location'),p_details->>'region',coalesce(p_details->>'class_level','Grade 9'),p_details->>'phone_number',lower(trim(p_details->>'email')),coalesce((p_details->>'reminder_opt_in')::boolean,false)) returning * into r;
 end if;
 return jsonb_build_object('candidate_id',r.candidate_id,'full_name',r.full_name,'contact',r.contact,'school_name',r.school_name,'location',r.location,'region',r.region,'class_level',r.class_level,'registration_status','confirmed','phone_number',r.phone_number,'email',r.email,'reminder_opt_in',r.reminder_opt_in);
end $$;
revoke all on function public.register_or_recover_sunday_candidate(jsonb) from public,anon,authenticated;
grant execute on function public.register_or_recover_sunday_candidate(jsonb) to service_role;
