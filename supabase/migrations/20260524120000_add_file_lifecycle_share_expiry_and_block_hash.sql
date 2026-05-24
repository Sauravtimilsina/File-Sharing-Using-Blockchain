alter table public.files
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text references public.users(id) on delete set null;

create index if not exists files_owner_active_created_at_idx
  on public.files (owner_id, created_at desc)
  where deleted_at is null;

alter table public.shares
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by text references public.users(id) on delete set null;

create index if not exists shares_recipient_active_created_at_idx
  on public.shares (shared_with_id, created_at desc)
  where revoked_at is null;

alter table public.blocks
  add column if not exists block_hash text,
  add column if not exists previous_block_hash text;
