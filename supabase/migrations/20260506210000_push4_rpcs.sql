-- Push 4: RPCs that lock completion/skip dates to user_today(auth.uid())
-- Uses the real schema columns: completed_by, completed_for_date,
-- skipped_by, skipped_for_date.

grant execute on function public.user_today(uuid) to authenticated;

create or replace function public.mark_reminder_complete(p_reminder_id uuid)
returns reminder_completions
language plpgsql security invoker set search_path = public
as $$
declare v_row reminder_completions;
begin
  insert into reminder_completions (reminder_id, completed_by, completed_for_date)
  values (p_reminder_id, auth.uid(), user_today(auth.uid()))
  on conflict (reminder_id, completed_by, completed_for_date)
    do update set completed_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
grant execute on function public.mark_reminder_complete(uuid) to authenticated;

create or replace function public.unmark_reminder_complete(p_reminder_id uuid)
returns void
language plpgsql security invoker set search_path = public
as $$
begin
  delete from reminder_completions
   where reminder_id = p_reminder_id
     and completed_by = auth.uid()
     and completed_for_date = user_today(auth.uid());
end;
$$;
grant execute on function public.unmark_reminder_complete(uuid) to authenticated;

create or replace function public.skip_reminder_today(p_reminder_id uuid)
returns reminder_skips
language plpgsql security invoker set search_path = public
as $$
declare v_row reminder_skips;
begin
  insert into reminder_skips (reminder_id, skipped_by, skipped_for_date)
  values (p_reminder_id, auth.uid(), user_today(auth.uid()))
  on conflict (reminder_id, skipped_by, skipped_for_date) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from reminder_skips
     where reminder_id = p_reminder_id
       and skipped_by = auth.uid()
       and skipped_for_date = user_today(auth.uid());
  end if;
  return v_row;
end;
$$;
grant execute on function public.skip_reminder_today(uuid) to authenticated;

create or replace function public.unskip_reminder_today(p_reminder_id uuid)
returns void
language plpgsql security invoker set search_path = public
as $$
begin
  delete from reminder_skips
   where reminder_id = p_reminder_id
     and skipped_by = auth.uid()
     and skipped_for_date = user_today(auth.uid());
end;
$$;
grant execute on function public.unskip_reminder_today(uuid) to authenticated;

create or replace function public.archive_reminder(p_reminder_id uuid)
returns reminders
language plpgsql security invoker set search_path = public
as $$
declare v_row reminders;
begin
  update reminders set archived_at = now()
   where id = p_reminder_id and owner_id = auth.uid()
  returning * into v_row;
  return v_row;
end;
$$;
grant execute on function public.archive_reminder(uuid) to authenticated;
