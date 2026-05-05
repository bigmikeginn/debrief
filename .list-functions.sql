select proname
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
order by proname;
