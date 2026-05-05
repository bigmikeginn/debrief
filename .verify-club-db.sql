select column_name from information_schema.columns where table_schema='public' and table_name='user_feed_preferences' and column_name='active_club_id';
select table_name from information_schema.tables where table_schema='public' and table_name='club_invites';
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('get_my_club_context','create_club','join_club_with_invite','set_my_active_club','get_user_active_club_id') order by proname;
