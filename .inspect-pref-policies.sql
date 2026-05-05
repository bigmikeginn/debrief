select policyname, cmd, qual, with_check from pg_policies where schemaname='public' and tablename='user_feed_preferences';
