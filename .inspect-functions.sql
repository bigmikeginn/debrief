select proname, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('is_active_member_of_club','is_club_admin','get_my_debrief_history','get_my_telegram_link_status','handle_new_user','viewer_opted_in_shared','has_viewable_share')
order by proname;
