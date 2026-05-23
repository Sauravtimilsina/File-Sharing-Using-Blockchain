alter table public.files
  add column if not exists file_size bigint not null default 0 check (file_size >= 0),
  add column if not exists mime_type text not null default 'application/octet-stream';

create index if not exists files_owner_updated_at_idx
  on public.files (owner_id, updated_at desc);
