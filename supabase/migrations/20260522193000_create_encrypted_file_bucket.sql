insert into storage.buckets (id, name, public)
values ('encrypted-files', 'encrypted-files', false)
on conflict (id) do update set public = false;
